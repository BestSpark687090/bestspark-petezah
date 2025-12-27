/* global describe test expect */
import * as helpers from '../../src/utils/formatter.js'; // Adjust this path if necessary based on your project structure

describe('sitemap helpers', () => {
  test('computePriority returns expected bounds and values', () => {
    const { computePriority } = helpers;

    // Logic: if (maxCommits <= 0 || commitCount <= 0) return 0.5;
    expect(computePriority(0, 0)).toBe(0.5);
    expect(computePriority(0, 100)).toBe(0.5);

    // Logic: Math.log10(commitCount + 1) / Math.log10(maxCommits + 1)
    // log10(101) / log10(201) ≈ 2.004 / 2.303 ≈ 0.87
    expect(computePriority(100, 200)).toBeCloseTo(0.87);

    // log10(1001) / log10(1001) = 1.0
    expect(computePriority(1000, 1000)).toBeCloseTo(1.0);
  });

  test('computeChangefreq returns correct frequency based on lastmod days', () => {
    const { computeChangefreq } = helpers;
    const now = Date.now();
    const day = 1000 * 60 * 60 * 24;

    // undefined -> daily
    expect(computeChangefreq(undefined)).toBe('daily');

    // < 7 days -> daily
    expect(computeChangefreq(new Date(now - 1 * day).toISOString())).toBe('daily');

    // 8-30 days -> weekly
    expect(computeChangefreq(new Date(now - 15 * day).toISOString())).toBe('weekly');

    // 31-180 days -> monthly
    expect(computeChangefreq(new Date(now - 60 * day).toISOString())).toBe('monthly');

    // > 180 days -> yearly
    expect(computeChangefreq(new Date(now - 200 * day).toISOString())).toBe('yearly');
  });

  test('generateJson and generateTxt provide correct structures', () => {
    const { generateJson, generateTxt } = helpers;
    const domain = 'https://example.com';
    const urls = [
      { loc: 'page1', lastmod: '2023-01-01', priority: 0.8, type: 'page' },
      { loc: 'page2', lastmod: '2023-01-02', priority: 0.5, type: 'image', images: [{ url: 'img.png' }] }
    ];

    const json = generateJson(domain, urls);

    // generateJson returns an object { multipleIndexes, timestamp, routes }
    expect(typeof json).toBe('object');
    expect(json).not.toBeNull();
    expect(json).toHaveProperty('routes');
    expect(Array.isArray(json.routes)).toBe(true);
    expect(json.routes.length).toBe(2);

    // Verify mapped content
    expect(json.routes[0].loc).toBe('https://example.com/page1');
    expect(json.routes[1].type).toBe('image');
    expect(json.routes[1].images).toBeDefined();

    const txt = generateTxt(domain, urls);
    // generateTxt returns a newline-separated string
    const lines = txt.split('\n');
    expect(lines).toContain('https://example.com/page1');
    expect(lines).toContain('https://example.com/page2');
  });

  test('generateXml creates valid xml-like string', () => {
    const { generateXml } = helpers;
    const domain = 'https://example.com';
    const urls = [
      {
        loc: 'page1',
        lastmod: new Date().toISOString(),
        images: [{ url: 'test.jpg' }],
        videos: [{ url: 'test.mp4' }]
      }
    ];

    const xml = generateXml(domain, { entries: urls });

    expect(xml).toContain('<?xml');
    expect(xml).toContain('<urlset');
    expect(xml).toContain('<loc>https://example.com/page1</loc>');
    // Check for image namespace and tags
    expect(xml).toContain('xmlns:image');
    expect(xml).toContain('<image:loc>https://example.com/test.jpg</image:loc>');
    // Check for video namespace and tags
    expect(xml).toContain('xmlns:video');
    expect(xml).toContain('<video:content_loc>https://example.com/test.mp4</video:content_loc>');
  });
});
