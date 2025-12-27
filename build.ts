// @ts-check
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import fse from 'fs-extra';
import ignore from 'ignore';
import minimist from 'minimist';
import { dirname, extname, join, relative, resolve } from 'node:path';
import os from 'os';
import pLimit from 'p-limit';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { computeChangefreq, computePriority } from './server/helpers/sitemap.js';
import parseConfig from './server/parseconfig.js';

const config = parseConfig('./config.jsonc') as { imageSettings: Array<{ ext: string; path?: string; width: number }> };
const args = minimist(process.argv.slice(2));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projdir = __dirname;
const PUBLIC_DIR = join(projdir, 'public');

/** @type {boolean} */
let DEBUG = args.env === 'debug';

// --- Constants ---
const MAX_URLS_PER_FILE = 50000;
const HTML_EXT = '.html';
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);
const SCANNABLE_EXTS = new Set(['.html', '.css', '.js', '.jsx', '.ts', '.tsx']);
const RASTER_INPUT_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp', '.avif'];

// --- Dependency Graph Engine ---
/** @type {Map<string, Set<string>>} */
const backlinkMap = new Map();

const REF_REGEX = /(?:src|href|poster)\s*=\s*['"]([^'"]+)['"]|url\(['"]?([^'"]+?)['"]?\)/gi;

/** Resolves a found string path to an absolute disk path within /public */
function resolvePath(ref: string, currentFileDir: string): string | null {
  if (!ref || ref.startsWith('http') || ref.startsWith('//') || ref.startsWith('data:') || ref.startsWith('#')) return null;
  const abs = ref.startsWith('/') ? join(PUBLIC_DIR, ref) : resolve(currentFileDir, ref);
  return abs.startsWith(PUBLIC_DIR) ? abs : null;
}

/** Scans a file for references to other assets */
async function scanFileDependencies(filePath: string) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const dir = dirname(filePath);
    let match;
    while ((match = REF_REGEX.exec(content)) !== null) {
      const ref = match[1] || match[2];
      const resolved = resolvePath(ref, dir);
      if (resolved && resolved !== filePath) {
        if (!backlinkMap.has(resolved)) backlinkMap.set(resolved, new Set());
        backlinkMap.get(resolved).add(filePath);
      }
    }
  } catch (e) {
    /* ignore read errors */
  }
}

/** Recursively climbs the dependency graph to find which HTML routes use this asset */
function findRootRoutes(assetPath: string, seen = new Set()): Set<unknown> {
  if (seen.has(assetPath)) return new Set();
  seen.add(assetPath);
  const roots = new Set();
  const parents = backlinkMap.get(assetPath);
  if (!parents) return roots;
  for (const p of parents) {
    if (p.endsWith(HTML_EXT)) roots.add(p);
    else findRootRoutes(p, seen).forEach((r) => roots.add(r));
  }
  return roots;
}

// --- Utility Functions ---
function safeJsonStringify(obj: object): string {
  return JSON.stringify(obj, (key, value) => {
    return typeof value === 'string' ? value.replace(/[^\x20-\x7E]/g, '') : value;
  });
}

function formatDuration(ms: number): string {
  let s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  s = s % 60;
  return `${h > 0 ? h + 'h ' : ''}${m > 0 || h > 0 ? m + 'm ' : ''}${s}s`.trim();
}

function logSection(title: string): void {
  const bar = '-'.repeat(Math.max(10, title.length));
  console.log(`\n${bar}\n${title}\n${bar}`);
}

// --- Chunking JSON Writer ---
class ChunkedSitemapWriter {
  basePath: string;
  totalWritten: number;
  filesCreated: string[];

  constructor(basePath: string) {
    this.basePath = basePath;
    this.totalWritten = 0;
    this.filesCreated = [];
  }

  async writeEntries(entries: object[]): Promise<void> {
    const multipleIndexes = entries.length > MAX_URLS_PER_FILE;

    for (let i = 0, part = 1; i < entries.length; i += MAX_URLS_PER_FILE, part++) {
      const chunk = entries.slice(i, i + MAX_URLS_PER_FILE);
      const fileName = multipleIndexes ? this.basePath.replace('.json', `.part${part}.json`) : this.basePath;

      const payload = {
        multipleIndexes,
        part: multipleIndexes ? part : undefined,
        totalInPart: chunk.length,
        timestamp: new Date().toISOString(),
        entries: chunk
      };

      await fs.writeFile(fileName, safeJsonStringify(payload));
      this.filesCreated.push(fileName);
      this.totalWritten += chunk.length;
    }
  }
}

// --- Git Metadata (Optimized) ---
function getGitMetadata(rootDir: string): {
  fileDates: Map<string, string>;
  dirCommitCounts: Map<string, number>;
  maxCommits: number;
  latestSiteUpdate: string;
} {
  const fileDates = new Map();
  const dirCommitCounts = new Map();
  let maxCommits = 0;
  let latestSiteUpdate = new Date().toISOString();

  try {
    latestSiteUpdate = execSync('git log -1 --format=%cI', { cwd: rootDir, encoding: 'utf8' }).trim();
    const output = execSync('git log --pretty=format:"%cI" --name-only', {
      cwd: rootDir,
      maxBuffer: 1024 * 1024 * 50,
      encoding: 'utf8'
    });

    const lines = output.split('\n');
    let currentDate = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        currentDate = trimmed;
      } else {
        if (!fileDates.has(trimmed)) fileDates.set(trimmed, currentDate);
        const dir = path.dirname(trimmed);
        const count = (dirCommitCounts.get(dir) || 0) + 1;
        dirCommitCounts.set(dir, count);
        if (count > maxCommits) maxCommits = count;
      }
    }
  } catch (err) {
    console.warn('Git history unavailable. Fallback to current time.');
  }
  return { fileDates, dirCommitCounts, maxCommits, latestSiteUpdate };
}

// --- Asset Processing ---
async function walk(dir: string, handler: (file: string) => Promise<void>) {
  const entries = await fse.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, handler);
    else await handler(full);
  }
}

async function processInputImages() {
  logSection('Optimizing Input Images');
  const inputDir = path.join(projdir, 'inputimages');
  const outBase = path.join(projdir, 'public', 'optimg');

  if (!(await fse.pathExists(inputDir))) return;

  await walk(inputDir, async (file) => {
    const ext = path.extname(file).toLowerCase();
    if (!RASTER_INPUT_EXTS.includes(ext)) return;

    const rel = path.relative(inputDir, file);
    const dest = path.join(outBase, rel);
    await fse.ensureDir(path.dirname(dest));
    await fse.copyFile(file, dest);

    const image = sharp(file);
    for (const target of config.imageSettings) {
      if (target.ext.toLowerCase() === ext) continue;
      const targetPath = path.join(outBase, target.path || '', rel.replace(ext, target.ext));
      await fse.ensureDir(path.dirname(targetPath));
      await image.clone().resize(target.width).toFile(targetPath);
    }
  });
}

// --- Main Build Orchestration ---
async function main() {
  const startTime = Date.now();
  logSection(`Build started: ${new Date().toLocaleString()}`);

  // 1. Pre-process Images
  try {
    await processInputImages();
  } catch (e) {
    console.error('Image optimization failed', e);
  }

  // 2. Setup
  const { fileDates, dirCommitCounts, maxCommits, latestSiteUpdate } = getGitMetadata(projdir);
  const limit = pLimit(os.cpus().length * 2);
  let sitemapIgnore = ignore();
  try {
    const content = await fs.readFile(path.join(projdir, '.sitemapignore'), 'utf8');
    sitemapIgnore.add(content);
  } catch {}

  // 3. Crawl /public
  logSection('Crawling /public and Scanning Dependencies');
  const allFiles: { path: string; ext: string; relToPublic: string }[] = [];
  async function crawl(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      const relToPublic = relative(PUBLIC_DIR, full).replace(/\\/g, '/');
      if (sitemapIgnore.ignores(relToPublic)) continue;

      if (entry.isDirectory()) {
        await crawl(full);
      } else {
        const ext = extname(entry.name).toLowerCase();
        allFiles.push({ path: full, ext, relToPublic });
      }
    }
  }
  await crawl(PUBLIC_DIR);

  // 4. Build Dependency Map (Parallel)
  await Promise.all(allFiles.map((f) => limit(() => scanFileDependencies(f.path))));

  // 5. Map Assets to Parent HTML Routes
  const routeAssets = new Map();
  allFiles.forEach((f) => {
    const isImg = IMAGE_EXTENSIONS.has(f.ext);
    const isVid = VIDEO_EXTENSIONS.has(f.ext);
    if (isImg || isVid) {
      const roots = findRootRoutes(f.path);
      const url = '/' + f.relToPublic;
      roots.forEach((root) => {
        if (!routeAssets.has(root)) routeAssets.set(root, { images: new Set(), videos: new Set() });
        const bundle = routeAssets.get(root);
        if (isImg) bundle.images.add(url);
        else bundle.videos.add(url);
      });
    }
  });

  // 6. Construct JSON Entries
  const sitemapEntries = allFiles
    .filter((f) => f.ext === HTML_EXT)
    .map((f) => {
      const relRepo = relative(projdir, f.path).replace(/\\/g, '/');
      const assets = routeAssets.get(f.path);
      const dirRepo = path.dirname(relRepo);

      let loc = '/' + f.relToPublic;
      if (loc.endsWith('/index.html')) loc = loc.slice(0, -10) || '/';

      const lastmod = fileDates.get(relRepo) || latestSiteUpdate;
      const commitCount = dirCommitCounts.get(dirRepo) || 0;

      return {
        loc,
        lastmod,
        changefreq: computeChangefreq(lastmod),
        priority: computePriority(commitCount, maxCommits),
        type: 'page',
        images: assets
          ? Array.from(assets.images).map((url) => ({
              url,
              lastmod: fileDates.get(relative(projdir, join(PUBLIC_DIR, url.startsWith('/') ? url.slice(1) : url)).replace(/\\/g, '/')) || lastmod
            }))
          : [],
        videos: assets ? Array.from(assets.videos).map((url) => ({ url })) : []
      };
    });

  // 7. Final Output
  const writer = new ChunkedSitemapWriter(join(projdir, '.sitemap-base.json'));
  await writer.writeEntries(sitemapEntries);

  logSection(`Build Complete`);
  console.log(`Routes Found: ${sitemapEntries.length}`);
  console.log(`Files Created: ${writer.filesCreated.join(', ')}`);
  console.log(`Duration: ${formatDuration(Date.now() - startTime)}`);
}

main().catch((err) => {
  console.error('Fatal Build Error:', err);
  process.exit(1);
});
