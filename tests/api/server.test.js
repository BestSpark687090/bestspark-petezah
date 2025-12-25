/* global describe test expect */
import request from 'supertest';
import { app } from '../../server.js';

describe('API endpoints', () => {
  test('GET /sitemap.json returns valid sitemap entries', async () => {
    const res = await request(app).get('/sitemap.json').set('User-Agent', 'Mozilla/5.0');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    for (const entry of res.body) {
      expect(entry).toHaveProperty('loc');
      expect(entry).toHaveProperty('lastmod');
      expect(entry).toHaveProperty('changefreq');
      expect(entry).toHaveProperty('priority');
      expect(entry).toHaveProperty('type');

      expect(() => new URL(entry.loc)).not.toThrow();

      expect(!isNaN(Date.parse(entry.lastmod))).toBe(true);

      const allowedFreq = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
      expect(allowedFreq).toContain(entry.changefreq);

      expect(typeof entry.priority).toBe('number');
      expect(entry.priority).toBeGreaterThanOrEqual(0);
      expect(entry.priority).toBeLessThanOrEqual(1);

      const allowedTypes = ['image', 'video', 'page'];
      expect(allowedTypes).toContain(entry.type);
    }
  }, 10000);

  test('GET /sitemap.xml returns XML content', async () => {
    const res = await request(app).get('/sitemap.xml').set('User-Agent', 'Mozilla/5.0');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/xml/);
    expect(res.text).toMatch(/<urlset/);
  }, 10000);

  test('GET /sitemap.txt returns plain text', async () => {
    const res = await request(app).get('/sitemap.txt').set('User-Agent', 'Mozilla/5.0');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text.split('\n').length).toBeGreaterThan(0);
  }, 10000);

  test('GET /ip returns an integer', async () => {
    const res = await request(app).get('/ip').set('User-Agent', 'Mozilla/5.0');
    expect(res.statusCode).toBe(200);
    const ipValue = parseInt(res.text, 10);
    expect(Number.isInteger(ipValue)).toBe(true);
  });

  test('Non-existent route returns 404', async () => {
    const res = await request(app).get('/non-existent-route-12345');
    expect(res.statusCode).toBe(404);
  });
});
