import { describe, it, expect } from 'vitest';
import type {
  PageEvent,
  Session,
  DateRange,
  StatsFilter,
  StatsQuery,
  StatsResult,
  TimeSeriesPoint,
  TimeInterval,
  TimeSeriesResult,
  BreakdownItem,
  BreakdownProperty,
  BreakdownResult,
  AnalyticsRepository,
  AnalyticsConfig,
} from '../index.js';

describe('PageEvent type', () => {
  it('should be usable as a typed object', () => {
    const event: PageEvent = {
      websiteId: '00000000-0000-0000-0000-000000000001',
      sessionId: 'abc123',
      visitorId: 'vis456',
      timestamp: new Date(),
      eventName: 'pageview',
      urlPath: '/home',
      urlQuery: '',
      referrerPath: '',
      referrerDomain: '',
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
      utmContent: '',
      utmTerm: '',
      country: 'US',
      region: 'CA',
      city: 'San Francisco',
      browser: 'Chrome',
      browserVersion: '120',
      os: 'macOS',
      osVersion: '14',
      deviceType: 'desktop',
      screenSize: '1920x1080',
      pageTitle: 'Home',
      hostname: 'example.com',
    };
    expect(event.websiteId).toBe('00000000-0000-0000-0000-000000000001');
    expect(event.eventName).toBe('pageview');
  });

  it('should allow optional id and customData', () => {
    const event: PageEvent = {
      id: '00000000-0000-0000-0000-000000000099',
      websiteId: '00000000-0000-0000-0000-000000000001',
      sessionId: 's1',
      visitorId: 'v1',
      timestamp: new Date(),
      eventName: 'click',
      urlPath: '/',
      urlQuery: '',
      referrerPath: '',
      referrerDomain: '',
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
      utmContent: '',
      utmTerm: '',
      country: '',
      region: '',
      city: '',
      browser: '',
      browserVersion: '',
      os: '',
      osVersion: '',
      deviceType: 'mobile',
      screenSize: '',
      pageTitle: '',
      hostname: '',
      customData: { clicked: true, count: 5 },
    };
    expect(event.id).toBeDefined();
    expect(event.customData).toEqual({ clicked: true, count: 5 });
  });
});

describe('Session type', () => {
  it('should be usable as a typed object', () => {
    const session: Session = {
      id: 'sess-abc',
      websiteId: '00000000-0000-0000-0000-000000000001',
      visitorId: 'vis456',
      startedAt: new Date(),
      endedAt: new Date(),
      duration: 120,
      entryPage: '/home',
      exitPage: '/about',
      pageviews: 3,
      events: 1,
      isBounce: false,
      referrerDomain: 'google.com',
      referrerPath: '/',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'summer',
      country: 'US',
      region: 'CA',
      city: 'SF',
      browser: 'Chrome',
      os: 'macOS',
      deviceType: 'desktop',
      screenSize: '1920x1080',
    };
    expect(session.id).toBe('sess-abc');
    expect(session.isBounce).toBe(false);
    expect(session.pageviews).toBe(3);
  });
});

describe('StatsQuery and related types', () => {
  it('should compose a StatsQuery', () => {
    const query: StatsQuery = {
      websiteId: '00000000-0000-0000-0000-000000000001',
      dateRange: { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
      filters: [{ property: 'country', operator: 'eq', value: 'US' }],
    };
    expect(query.dateRange.from).toBeInstanceOf(Date);
    expect(query.filters).toHaveLength(1);
  });

  it('should have valid TimeInterval values', () => {
    const intervals: TimeInterval[] = ['hour', 'day', 'week', 'month'];
    expect(intervals).toHaveLength(4);
  });

  it('should structure a BreakdownResult', () => {
    const result: BreakdownResult = {
      property: 'browser',
      data: [{ value: 'Chrome', visitors: 100, pageviews: 200, percentage: 50 }],
      total: 200,
    };
    expect(result.data[0].value).toBe('Chrome');
    expect(result.total).toBe(200);
  });
});

describe('AnalyticsRepository interface', () => {
  it('should be usable as a type constraint', () => {
    // Verify the interface can be used as a type constraint
    const hasRequiredMethods = (repo: AnalyticsRepository) => {
      return (
        typeof repo.insertEvent === 'function' &&
        typeof repo.insertEvents === 'function' &&
        typeof repo.upsertSession === 'function' &&
        typeof repo.getStats === 'function' &&
        typeof repo.getTimeSeries === 'function' &&
        typeof repo.getBreakdown === 'function' &&
        typeof repo.getActiveVisitors === 'function' &&
        typeof repo.initialize === 'function' &&
        typeof repo.close === 'function'
      );
    };
    // Just verifying the type signature compiles
    expect(hasRequiredMethods).toBeDefined();
  });
});

describe('AnalyticsConfig type', () => {
  it('should allow postgresql config', () => {
    const config: AnalyticsConfig = {
      type: 'postgresql',
      url: 'postgresql://localhost:5432/test',
    };
    expect(config.type).toBe('postgresql');
  });

  it('should allow clickhouse config', () => {
    const config: AnalyticsConfig = {
      type: 'clickhouse',
      clickhouseUrl: 'http://localhost:8123',
      clickhouseDatabase: 'analytics',
    };
    expect(config.type).toBe('clickhouse');
  });
});
