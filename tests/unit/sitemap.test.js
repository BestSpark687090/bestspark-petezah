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
    const now = new Date();
    const daily = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const weekly = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const monthly = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const yearly = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000).toISOString();
    const { computeChangefreq } = helpers;
    expect(computeChangefreq(daily)).toBe('daily');
    expect(computeChangefreq(weekly)).toBe('weekly');
    expect(computeChangefreq(monthly)).toBe('monthly');
    expect(computeChangefreq(yearly)).toBe('yearly');
  });

  test('generateJson and generateTxt provide correct structures', () => {
    const domain = 'https://example.com';
    const urls = [
      { loc: '/page1', lastmod: new Date().toISOString(), commitCount: 1 },
      { loc: '/image1.png', lastmod: new Date().toISOString(), commitCount: 10, images: [{ url: '/img.png' }] }
    ];
    const { generateJson, generateTxt } = helpers;
    const json = generateJson(domain, urls);
    expect(json).toHaveProperty('multipleIndexes');
    expect(json).toHaveProperty('timestamp');
    expect(json).toHaveProperty('routes');
    expect(Array.isArray(json.routes)).toBe(true);
    expect(json.routes.length).toBe(2);
    expect(json.routes[1].type).toBe('page');
    const txt = generateTxt(domain, urls);
    expect(txt).toContain(domain + '/page1');
  });
  test('generateXml creates valid xml-like string', () => {
    const domain = 'https://example.com';
    const urls = [
      {
        loc: '/page1',
        lastmod: new Date().toISOString(),
        images: [{ url: '/test.jpg' }],
        videos: [{ url: '/test.mp4' }]
      }
    ];
    const { generateXml } = helpers;
    const xml = generateXml(domain, urls);
    expect(xml.startsWith('<?xml')).toBeTruthy();
    expect(xml.includes('<urlset')).toBeTruthy();
    expect(xml.includes(domain + '/page1')).toBeTruthy();
    expect(xml.includes('<image:loc>https://example.com/test.jpg</image:loc>')).toBeTruthy();
    expect(xml.includes('<video:content_loc>https://example.com/test.mp4</video:content_loc>')).toBeTruthy();
  });
});
