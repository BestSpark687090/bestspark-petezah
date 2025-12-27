const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);

/**
 * Converts camelCase, kebab-case, or file paths into "Title Case"
 * Example: "myAmazingImage.png" -> "My Amazing Image"
 * Example: "cool-kebab-path" -> "Cool Kebab Path"
 */
function formatTitle(str) {
  if (!str || str === '/') return 'PeteZah Content';

  // 1. Get just the filename/last part of path
  // 2. Remove file extension
  let base = str
    .split('/')
    .pop()
    .replace(/\.[^/.]+$/, '');

  // 3. Insert space before capital letters (camelCase -> camel Case)
  // 4. Replace hyphens and underscores with spaces (kebab-case -> kebab case)
  let result = base.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ');

  // 5. Capitalize first letter of every word
  return (
    result
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim() || 'PeteZah Content'
  );
}

// --- Logic Helpers ---

/**
 * Calculates priority using the logic from the initial TS file:
 * Logarithmic scale of commits vs max commits, fixed to 2 decimals, defaulting to 0.5.
 * @param {number} commitCount
 * @param {number} maxCommits
 * @returns {number}
 */
function computePriority(commitCount, maxCommits) {
  const calculated = Math.log10(commitCount + 1) / Math.log10(maxCommits + 1);
  return Number(calculated.toFixed(2)) || 0.5;
}

/**
 * Calculates changefreq based on the age of the last modification.
 * (Adopted from the JS file since the TS file did not have this).
 * @param {string | Date | undefined} lastmod
 * @returns {string}
 */
function computeChangefreq(lastmod) {
  if (!lastmod) return 'daily';
  const last = new Date(lastmod);
  const days = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 7) return 'daily';
  if (days <= 30) return 'weekly';
  if (days <= 180) return 'monthly';
  return 'yearly';
}

function getEntries(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.entries && Array.isArray(data.entries)) return data.entries;
  return [];
}

function generateXml(domain, data) {
  const pagesArray = getEntries(data);
  const cleanDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;

  const urls = pagesArray
    .map((page) => {
      const fullUrl = `${cleanDomain}${page.loc.startsWith('/') ? '' : '/'}${page.loc}`;
      const lastmod = page.lastmod || new Date().toISOString();

      const imageTags = (page.images || [])
        .map((img) => {
          const imgLoc = img.url.startsWith('http') ? img.url : `${cleanDomain}${img.url.startsWith('/') ? '' : '/'}${img.url}`;
          return `
    <image:image>
      <image:loc>${imgLoc}</image:loc>
      <image:title>${formatTitle(img.url).replace(/[<>&"']/g, '')}</image:title>
    </image:image>`;
        })
        .join('');

      const videoTags = (page.videos || [])
        .map((vid) => {
          const videoLoc = vid.url.startsWith('http') ? vid.url : `${cleanDomain}${vid.url.startsWith('/') ? '' : '/'}${vid.url}`;
          const thumb = page.images?.[0]?.url
            ? page.images[0].url.startsWith('http')
              ? page.images[0].url
              : cleanDomain + (page.images[0].url.startsWith('/') ? '' : '/') + page.images[0].url
            : `${cleanDomain}/storage/images/logo.png`;

          return `
    <video:video>
      <video:thumbnail_loc>${thumb}</video:thumbnail_loc>
      <video:title>${formatTitle(vid.url).replace(/[<>&"']/g, '')}</video:title>
      <video:description>Watch gameplay content on PeteZahGames</video:description>
      <video:content_loc>${videoLoc}</video:content_loc>
    </video:video>`;
        })
        .join('');

      return `
  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${computeChangefreq(lastmod)}</changefreq>
    <priority>${page.priority || '0.5'}</priority>${imageTags}${videoTags}
  </url>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${urls}
</urlset>`;
}

function generateJson(domain, data) {
  const pagesArray = getEntries(data);
  const baseUrl = domain.toString().replace(/\/$/, '');

  return {
    multipleIndexes: data.multipleIndexes || false,
    timestamp: data.timestamp || new Date().toISOString(),
    routes: pagesArray.map((u) => ({
      loc: `${baseUrl}${u.loc.startsWith('/') ? '' : '/'}${u.loc}`,
      lastmod: u.lastmod,
      changefreq: computeChangefreq(u.lastmod),
      priority: u.priority || 0.5,
      type: u.type || 'page',
      images: (u.images || []).map((img) => ({
        ...img,
        title: formatTitle(img.url),
        url: img.url.startsWith('http') ? img.url : `${baseUrl}${img.url.startsWith('/') ? '' : '/'}${img.url}`
      })),
      videos: (u.videos || []).map((vid) => ({
        ...vid,
        title: formatTitle(vid.url),
        url: vid.url.startsWith('http') ? vid.url : `${baseUrl}${vid.url.startsWith('/') ? '' : '/'}${vid.url}`
      }))
    }))
  };
}

function generateTxt(domain, data) {
  const pagesArray = getEntries(data);
  const baseUrl = domain.toString().replace(/\/$/, '');
  return pagesArray.map((p) => `${baseUrl}${p.loc.startsWith('/') ? '' : '/'}${p.loc}`).join('\n');
}

export { computeChangefreq, computePriority, generateJson, generateTxt, generateXml };
