/* global describe test expect */
import * as helpers from '../../server/helpers/sitemap.js';

describe('sitemap helpers', () => {
  test('computePriority returns expected bounds and values', () => {
    const { computePriority } = helpers;

    expect(computePriority(0, 0)).toBeCloseTo(0.5);
    expect(computePriority(100, 200)).toBeCloseTo(0.87);
    expect(computePriority(0, 100)).toBeCloseTo(0.5);
    expect(computePriority(1000, 1000)).toBeCloseTo(1.0);
  });

  test('computeChangefreq returns correct frequency based on lastmod days', () => {
    const { computeChangefreq } = helpers;
    const now = Date.now();
    const day = 1000 * 60 * 60 * 24;

    expect(computeChangefreq(undefined)).toBe('daily');
    expect(computeChangefreq(new Date(now - 1 * day))).toBe('daily');
    expect(computeChangefreq(new Date(now - 15 * day))).toBe('weekly');
    expect(computeChangefreq(new Date(now - 60 * day))).toBe('monthly');
    expect(computeChangefreq(new Date(now - 200 * day))).toBe('yearly');
  });

  test('generateJson and generateTxt provide correct structures', () => {
    const { generateJson, generateTxt } = helpers;
    const domain = 'https://example.com';
    const urls = [
      { loc: 'page1', lastmod: '2023-01-01', priority: 0.8, type: 'page' },
      { loc: 'page2', lastmod: '2023-01-02', priority: 0.5, type: 'image', images: [{ url: 'img.png' }] }
    ];

    const json = generateJson(domain, urls);

    expect(json).toHaveProperty('routes');
    expect(Array.isArray(json.routes)).toBe(true);
    expect(json.routes.length).toBe(2);
    expect(json.routes[1].type).toBe('image');

    const txt = generateTxt(domain, urls);
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
    expect(xml).toContain('<image:loc>https://example.com/test.jpg</image:loc>');
    expect(xml).toContain('<video:content_loc>https://example.com/test.mp4</video:content_loc>');
  });
});
