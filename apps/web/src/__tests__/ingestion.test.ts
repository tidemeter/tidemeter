import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

// --- Inline the pure functions from processor.ts for unit testing ---

const BOT_PATTERNS = /bot|crawler|spider|crawling|headless|phantom|selenium|webdriver/i;

function isBot(userAgent: string): boolean {
  return BOT_PATTERNS.test(userAgent);
}

function hashVisitorId(websiteId: string, ip: string, userAgent: string, salt: string): string {
  return crypto
    .createHash('sha256')
    .update(`${websiteId}|${ip}|${userAgent}|${salt}`)
    .digest('hex')
    .substring(0, 16);
}

function hashSessionId(visitorId: string, timestamp: Date): string {
  const block = Math.floor(timestamp.getTime() / (30 * 60 * 1000));
  return crypto
    .createHash('sha256')
    .update(`${visitorId}|${block}`)
    .digest('hex')
    .substring(0, 16);
}

// --- Tests ---

describe('isBot', () => {
  it('should detect common bots', () => {
    expect(isBot('Googlebot/2.1')).toBe(true);
    expect(isBot('Mozilla/5.0 (compatible; bingbot/2.0)')).toBe(true);
    expect(isBot('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120')).toBe(true);
    expect(isBot('Screaming Frog SEO Spider')).toBe(true);
    expect(isBot('Selenium/4.0')).toBe(true);
    expect(isBot('phantomjs')).toBe(true);
    expect(isBot('python-crawler')).toBe(true);
  });

  it('should not flag real browsers', () => {
    expect(isBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')).toBe(false);
    expect(isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1')).toBe(false);
    expect(isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0')).toBe(false);
  });

  it('should handle empty/missing user agents', () => {
    expect(isBot('')).toBe(false);
  });
});

describe('hashVisitorId', () => {
  const salt = 'test-salt-2024-01-15';

  it('should return consistent hashes for same inputs', () => {
    const id1 = hashVisitorId('site-1', '1.2.3.4', 'Mozilla/5.0 Chrome', salt);
    const id2 = hashVisitorId('site-1', '1.2.3.4', 'Mozilla/5.0 Chrome', salt);
    expect(id1).toBe(id2);
  });

  it('should return 16-character hex string', () => {
    const id = hashVisitorId('site-1', '1.2.3.4', 'Mozilla/5.0', salt);
    expect(id).toHaveLength(16);
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });

  it('should differ for different IPs', () => {
    const id1 = hashVisitorId('site-1', '1.2.3.4', 'Mozilla/5.0', salt);
    const id2 = hashVisitorId('site-1', '5.6.7.8', 'Mozilla/5.0', salt);
    expect(id1).not.toBe(id2);
  });

  it('should differ for different websites', () => {
    const id1 = hashVisitorId('site-1', '1.2.3.4', 'Mozilla/5.0', salt);
    const id2 = hashVisitorId('site-2', '1.2.3.4', 'Mozilla/5.0', salt);
    expect(id1).not.toBe(id2);
  });

  it('should differ for different user agents', () => {
    const id1 = hashVisitorId('site-1', '1.2.3.4', 'Chrome', salt);
    const id2 = hashVisitorId('site-1', '1.2.3.4', 'Firefox', salt);
    expect(id1).not.toBe(id2);
  });

  it('should differ for different salts', () => {
    const id1 = hashVisitorId('site-1', '1.2.3.4', 'Mozilla/5.0', 'salt-day-1');
    const id2 = hashVisitorId('site-1', '1.2.3.4', 'Mozilla/5.0', 'salt-day-2');
    expect(id1).not.toBe(id2);
  });
});

describe('hashSessionId', () => {
  it('should return consistent hashes within the same 30-min block', () => {
    const base = new Date('2024-01-15T10:00:00Z');
    const t1 = new Date(base.getTime() + 5 * 60 * 1000);  // +5 min
    const t2 = new Date(base.getTime() + 15 * 60 * 1000); // +15 min

    const id1 = hashSessionId('visitor-1', t1);
    const id2 = hashSessionId('visitor-1', t2);
    expect(id1).toBe(id2);
  });

  it('should return different hashes for different 30-min blocks', () => {
    const t1 = new Date('2024-01-15T10:00:00Z');
    const t2 = new Date('2024-01-15T10:30:00Z');

    const id1 = hashSessionId('visitor-1', t1);
    const id2 = hashSessionId('visitor-1', t2);
    expect(id1).not.toBe(id2);
  });

  it('should return 16-character hex string', () => {
    const id = hashSessionId('visitor-1', new Date());
    expect(id).toHaveLength(16);
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });

  it('should differ for different visitors', () => {
    const now = new Date();
    const id1 = hashSessionId('visitor-1', now);
    const id2 = hashSessionId('visitor-2', now);
    expect(id1).not.toBe(id2);
  });
});

describe('UA parsing integration', () => {
  it('should parse user agent strings with ua-parser-js', async () => {
    const { UAParser } = await import('ua-parser-js');
    const ua = new UAParser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    const browser = ua.getBrowser();
    const os = ua.getOS();
    const device = ua.getDevice();

    expect(browser.name).toBe('Chrome');
    expect(os.name).toBe('macOS');
    expect(device.type).toBeUndefined(); // desktop has no type in ua-parser-js
  });

  it('should detect mobile devices', async () => {
    const { UAParser } = await import('ua-parser-js');
    const ua = new UAParser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1');
    const device = ua.getDevice();

    expect(device.type).toBe('mobile');
  });
});
