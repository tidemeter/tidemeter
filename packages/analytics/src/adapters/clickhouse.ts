import { createClient, type ClickHouseClient } from "@clickhouse/client";
import type {
  AnalyticsRepository,
  PageEvent,
  Session,
  StatsQuery,
  StatsFilter,
  StatsResult,
  TimeSeriesResult,
  TimeInterval,
  BreakdownResult,
  BreakdownProperty,
  BreakdownItem,
  DateRange,
  VisitorListResult,
  VisitorProfileResult,
  VisitorSession,
  FunnelQuery,
  FunnelResult,
  FunnelStepResult,
  RetentionQuery,
  RetentionResult,
  RetentionCohort,
  CohortGranularity,
} from "../types.js";

interface ClickHouseConfig {
  url: string;
  database: string;
  username: string;
  password: string;
}

export class ClickHouseAnalyticsRepository implements AnalyticsRepository {
  private client: ClickHouseClient;
  private database: string;

  constructor(config: ClickHouseConfig) {
    this.database = config.database;
    this.client = createClient({
      url: config.url,
      database: config.database,
      username: config.username,
      password: config.password,
    });
  }

  async initialize(): Promise<void> {
    await this.client.command({
      query: `CREATE DATABASE IF NOT EXISTS ${this.database}`,
    });

    await this.client.command({
      query: `
        CREATE TABLE IF NOT EXISTS ${this.database}.page_events (
          id UUID DEFAULT generateUUIDv4(),
          website_id UUID,
          session_id String,
          visitor_id String,
          timestamp DateTime('UTC'),
          event_name LowCardinality(String) DEFAULT 'pageview',
          url_path String DEFAULT '/',
          url_query String DEFAULT '',
          referrer_path String DEFAULT '',
          referrer_domain LowCardinality(String) DEFAULT '',
          utm_source LowCardinality(String) DEFAULT '',
          utm_medium LowCardinality(String) DEFAULT '',
          utm_campaign LowCardinality(String) DEFAULT '',
          utm_content String DEFAULT '',
          utm_term String DEFAULT '',
          country LowCardinality(String) DEFAULT '',
          region LowCardinality(String) DEFAULT '',
          city String DEFAULT '',
          browser LowCardinality(String) DEFAULT '',
          browser_version LowCardinality(String) DEFAULT '',
          os LowCardinality(String) DEFAULT '',
          os_version LowCardinality(String) DEFAULT '',
          device_type LowCardinality(String) DEFAULT 'desktop',
          screen_size LowCardinality(String) DEFAULT '',
          page_title String DEFAULT '',
          hostname LowCardinality(String) DEFAULT '',
          custom_data String DEFAULT '{}'
        )
        ENGINE = MergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (website_id, timestamp, visitor_id)
      `,
    });

    await this.client.command({
      query: `
        CREATE TABLE IF NOT EXISTS ${this.database}.sessions (
          id String,
          website_id UUID,
          visitor_id String,
          started_at DateTime('UTC'),
          ended_at DateTime('UTC'),
          duration UInt32 DEFAULT 0,
          entry_page String DEFAULT '/',
          exit_page String DEFAULT '/',
          pageviews UInt32 DEFAULT 1,
          events UInt32 DEFAULT 0,
          is_bounce UInt8 DEFAULT 1,
          referrer_domain LowCardinality(String) DEFAULT '',
          referrer_path String DEFAULT '',
          utm_source LowCardinality(String) DEFAULT '',
          utm_medium LowCardinality(String) DEFAULT '',
          utm_campaign LowCardinality(String) DEFAULT '',
          country LowCardinality(String) DEFAULT '',
          region LowCardinality(String) DEFAULT '',
          city String DEFAULT '',
          browser LowCardinality(String) DEFAULT '',
          os LowCardinality(String) DEFAULT '',
          device_type LowCardinality(String) DEFAULT 'desktop',
          screen_size LowCardinality(String) DEFAULT '',
          sign Int8 DEFAULT 1
        )
        ENGINE = CollapsingMergeTree(sign)
        PARTITION BY toYYYYMM(started_at)
        ORDER BY (website_id, started_at, id)
      `,
    });
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  private buildFilterClause(
    filters?: StatsFilter[],
    table: "page_events" | "sessions" = "page_events",
  ): string {
    if (!filters || filters.length === 0) return "";

    const eventColumns: Record<string, string> = {
      url_path: "url_path",
      referrer_domain: "referrer_domain",
      country: "country",
      region: "region",
      city: "city",
      browser: "browser",
      browser_version: "browser_version",
      os: "os",
      os_version: "os_version",
      device_type: "device_type",
      screen_size: "screen_size",
      utm_source: "utm_source",
      utm_medium: "utm_medium",
      utm_campaign: "utm_campaign",
      utm_content: "utm_content",
      utm_term: "utm_term",
      page_title: "page_title",
      hostname: "hostname",
    };

    const sessionColumns: Record<string, string> = {
      entry_page: "entry_page",
      exit_page: "exit_page",
      referrer_domain: "referrer_domain",
      country: "country",
      region: "region",
      city: "city",
      browser: "browser",
      os: "os",
      device_type: "device_type",
      utm_source: "utm_source",
      utm_medium: "utm_medium",
      utm_campaign: "utm_campaign",
    };

    const columns = table === "sessions" ? sessionColumns : eventColumns;

    return filters
      .filter((f) => columns[f.property])
      .map((f) => {
        const col = columns[f.property];
        const escaped = f.value.replace(/'/g, "\\'").replace(/[%_\\]/g, "\\$&");
        switch (f.operator) {
          case "eq":
            return `AND ${col} = '${escaped}'`;
          case "neq":
            return `AND ${col} != '${escaped}'`;
          case "contains":
            return `AND ${col} LIKE '%${escaped}%'`;
          default:
            return `AND ${col} = '${escaped}'`;
        }
      })
      .join("\n          ");
  }

  async insertEvent(event: PageEvent): Promise<void> {
    await this.insertEvents([event]);
  }

  async insertEvents(events: PageEvent[]): Promise<void> {
    if (events.length === 0) return;

    const rows = events.map((e) => ({
      website_id: e.websiteId,
      session_id: e.sessionId,
      visitor_id: e.visitorId,
      timestamp: Math.floor(e.timestamp.getTime() / 1000),
      event_name: e.eventName,
      url_path: e.urlPath,
      url_query: e.urlQuery || "",
      referrer_path: e.referrerPath || "",
      referrer_domain: e.referrerDomain || "",
      utm_source: e.utmSource || "",
      utm_medium: e.utmMedium || "",
      utm_campaign: e.utmCampaign || "",
      utm_content: e.utmContent || "",
      utm_term: e.utmTerm || "",
      country: e.country || "",
      region: e.region || "",
      city: e.city || "",
      browser: e.browser || "",
      browser_version: e.browserVersion || "",
      os: e.os || "",
      os_version: e.osVersion || "",
      device_type: e.deviceType || "desktop",
      screen_size: e.screenSize || "",
      page_title: e.pageTitle || "",
      hostname: e.hostname || "",
      custom_data: JSON.stringify(e.customData || {}),
    }));

    await this.client.insert({
      table: "page_events",
      values: rows,
      format: "JSONEachRow",
    });
  }

  async upsertSession(session: Session): Promise<void> {
    // CollapsingMergeTree: insert with sign=-1 to cancel old, sign=1 for new
    await this.client.insert({
      table: "sessions",
      values: [
        {
          id: session.id,
          website_id: session.websiteId,
          visitor_id: session.visitorId,
          started_at: Math.floor(session.startedAt.getTime() / 1000),
          ended_at: Math.floor(session.endedAt.getTime() / 1000),
          duration: session.duration,
          entry_page: session.entryPage,
          exit_page: session.exitPage,
          pageviews: session.pageviews,
          events: session.events,
          is_bounce: session.isBounce ? 1 : 0,
          referrer_domain: session.referrerDomain,
          referrer_path: session.referrerPath,
          utm_source: session.utmSource,
          utm_medium: session.utmMedium,
          utm_campaign: session.utmCampaign,
          country: session.country,
          region: session.region,
          city: session.city,
          browser: session.browser,
          os: session.os,
          device_type: session.deviceType,
          screen_size: session.screenSize,
          sign: 1,
        },
      ],
      format: "JSONEachRow",
    });
  }

  async getStats(query: StatsQuery): Promise<StatsResult> {
    const { websiteId, dateRange, filters } = query;
    const eventFilterClause = this.buildFilterClause(filters, "page_events");
    const sessionFilterClause = this.buildFilterClause(filters, "sessions");

    const result = await this.client.query({
      query: `
        SELECT
          uniq(visitor_id) as visitors,
          count() as pageviews,
          uniq(session_id) as sessions
        FROM page_events
        WHERE website_id = {websiteId:UUID}
          AND event_name = 'pageview'
          AND timestamp >= {from:DateTime}
          AND timestamp <= {to:DateTime}
          ${eventFilterClause}
      `,
      query_params: {
        websiteId,
        from: Math.floor(dateRange.from.getTime() / 1000),
        to: Math.floor(dateRange.to.getTime() / 1000),
      },
      format: "JSONEachRow",
    });

    const rows = await result.json<{
      visitors: string;
      pageviews: string;
      sessions: string;
    }>();
    const row = rows[0];

    const sessionResult = await this.client.query({
      query: `
        SELECT
          avg(duration) as avg_duration,
          countIf(is_bounce = 1) / count() as bounce_rate,
          sum(pageviews) / count() as views_per_visit
        FROM sessions FINAL
        WHERE website_id = {websiteId:UUID}
          AND started_at >= {from:DateTime}
          AND started_at <= {to:DateTime}
          AND sign = 1
          ${sessionFilterClause}
      `,
      query_params: {
        websiteId,
        from: Math.floor(dateRange.from.getTime() / 1000),
        to: Math.floor(dateRange.to.getTime() / 1000),
      },
      format: "JSONEachRow",
    });

    const sRows = await sessionResult.json<{
      avg_duration: string;
      bounce_rate: string;
      views_per_visit: string;
    }>();
    const sRow = sRows[0];

    return {
      visitors: Number(row?.visitors ?? 0),
      pageviews: Number(row?.pageviews ?? 0),
      sessions: Number(row?.sessions ?? 0),
      bounceRate: Number(sRow?.bounce_rate ?? 0),
      avgDuration: Number(sRow?.avg_duration ?? 0),
      viewsPerVisit: Number(sRow?.views_per_visit ?? 0),
    };
  }

  async getTimeSeries(
    query: StatsQuery,
    interval: TimeInterval,
  ): Promise<TimeSeriesResult> {
    const { websiteId, dateRange, filters } = query;
    const filterClause = this.buildFilterClause(filters, "page_events");

    const truncFn =
      interval === "hour"
        ? "toStartOfHour(timestamp)"
        : interval === "day"
          ? "toDate(timestamp)"
          : interval === "week"
            ? "toMonday(timestamp)"
            : "toStartOfMonth(timestamp)";

    const result = await this.client.query({
      query: `
        SELECT
          ${truncFn} as date,
          uniq(visitor_id) as visitors,
          count() as pageviews,
          uniq(session_id) as sessions
        FROM page_events
        WHERE website_id = {websiteId:UUID}
          AND event_name = 'pageview'
          AND timestamp >= {from:DateTime}
          AND timestamp <= {to:DateTime}
          ${filterClause}
        GROUP BY date
        ORDER BY date
      `,
      query_params: {
        websiteId,
        from: Math.floor(dateRange.from.getTime() / 1000),
        to: Math.floor(dateRange.to.getTime() / 1000),
      },
      format: "JSONEachRow",
    });

    const rows = await result.json<{
      date: string;
      visitors: string;
      pageviews: string;
      sessions: string;
    }>();

    return {
      interval,
      data: rows.map((row) => ({
        date: row.date,
        visitors: Number(row.visitors),
        pageviews: Number(row.pageviews),
        sessions: Number(row.sessions),
      })),
    };
  }

  async getBreakdown(
    query: StatsQuery,
    property: BreakdownProperty,
    limit = 10,
  ): Promise<BreakdownResult> {
    const { websiteId, dateRange, filters } = query;

    // entry_page and exit_page from sessions table
    if (property === "entry_page" || property === "exit_page") {
      return this.getSessionBreakdown(query, property, limit);
    }

    const filterClause = this.buildFilterClause(filters, "page_events");

    const result = await this.client.query({
      query: `
        SELECT
          ${property} as value,
          uniq(visitor_id) as visitors,
          count() as pageviews
        FROM page_events
        WHERE website_id = {websiteId:UUID}
          AND event_name = 'pageview'
          AND timestamp >= {from:DateTime}
          AND timestamp <= {to:DateTime}
          AND ${property} != ''
          ${filterClause}
        GROUP BY value
        ORDER BY visitors DESC
        LIMIT {limit:UInt32}
      `,
      query_params: {
        websiteId,
        from: Math.floor(dateRange.from.getTime() / 1000),
        to: Math.floor(dateRange.to.getTime() / 1000),
        limit,
      },
      format: "JSONEachRow",
    });

    const rows = await result.json<{
      value: string;
      visitors: string;
      pageviews: string;
    }>();
    const totalVisitors = rows.reduce(
      (sum, row) => sum + Number(row.visitors),
      0,
    );

    return {
      property,
      total: totalVisitors,
      data: rows.map(
        (row): BreakdownItem => ({
          value: row.value,
          visitors: Number(row.visitors),
          pageviews: Number(row.pageviews),
          percentage:
            totalVisitors > 0 ? Number(row.visitors) / totalVisitors : 0,
        }),
      ),
    };
  }

  private async getSessionBreakdown(
    query: StatsQuery,
    property: "entry_page" | "exit_page",
    limit: number,
  ): Promise<BreakdownResult> {
    const { websiteId, dateRange, filters } = query;
    const filterClause = this.buildFilterClause(filters, "sessions");

    const result = await this.client.query({
      query: `
        SELECT
          ${property} as value,
          uniq(visitor_id) as visitors,
          count() as session_count
        FROM sessions FINAL
        WHERE website_id = {websiteId:UUID}
          AND started_at >= {from:DateTime}
          AND started_at <= {to:DateTime}
          AND sign = 1
          AND ${property} != ''
          ${filterClause}
        GROUP BY value
        ORDER BY visitors DESC
        LIMIT {limit:UInt32}
      `,
      query_params: {
        websiteId,
        from: Math.floor(dateRange.from.getTime() / 1000),
        to: Math.floor(dateRange.to.getTime() / 1000),
        limit,
      },
      format: "JSONEachRow",
    });

    const rows = await result.json<{
      value: string;
      visitors: string;
      session_count: string;
    }>();
    const totalVisitors = rows.reduce(
      (sum, row) => sum + Number(row.visitors),
      0,
    );

    return {
      property,
      total: totalVisitors,
      data: rows.map(
        (row): BreakdownItem => ({
          value: row.value,
          visitors: Number(row.visitors),
          pageviews: Number(row.session_count),
          percentage:
            totalVisitors > 0 ? Number(row.visitors) / totalVisitors : 0,
        }),
      ),
    };
  }

  async getActiveVisitors(websiteId: string, minutes = 5): Promise<number> {
    const result = await this.client.query({
      query: `
        SELECT uniq(visitor_id) as count
        FROM page_events
        WHERE website_id = {websiteId:UUID}
          AND timestamp >= now() - INTERVAL {minutes:UInt32} MINUTE
      `,
      query_params: { websiteId, minutes },
      format: "JSONEachRow",
    });

    const rows = await result.json<{ count: string }>();
    return Number(rows[0]?.count ?? 0);
  }

  // ── User Journey Methods (stubs) ────────────────────────────────

  async linkVisitorIdentity(
    _websiteId: string,
    _visitorId: string,
    _userId: string,
  ): Promise<void> {
    // TODO: implement ClickHouse visitor identity linking
  }

  async getVisitors(
    _websiteId: string,
    _dateRange: DateRange,
    page: number,
    pageSize: number,
    _search?: string,
  ): Promise<VisitorListResult> {
    return { data: [], total: 0, page, pageSize };
  }

  async getVisitorProfile(
    _websiteId: string,
    _visitorId: string,
    _dateRange: DateRange,
  ): Promise<VisitorProfileResult | null> {
    return null;
  }

  async getVisitorSessions(
    _websiteId: string,
    _visitorId: string,
    _dateRange: DateRange,
    _limit?: number,
  ): Promise<VisitorSession[]> {
    return [];
  }

  // ── Funnel Analysis ───────────────────────────────────────────────

  async getFunnelResult(query: FunnelQuery): Promise<FunnelResult> {
    const { websiteId, dateRange, steps, filters } = query;

    if (steps.length < 2) {
      return {
        totalVisitors: 0,
        convertedVisitors: 0,
        overallConversionRate: 0,
        steps: [],
      };
    }

    const filterClause = this.buildFilterClause(filters, "page_events");

    // Build per-step match conditions for ClickHouse windowFunnel
    const stepConditions = steps.map((step) => {
      const column =
        step.matchType === "event_name" ? "event_name" : "url_path";
      switch (step.matchOperator) {
        case "contains":
          return `position(${column}, '${escapeCh(step.matchValue)}') > 0`;
        case "starts_with":
          return `startsWith(${column}, '${escapeCh(step.matchValue)}')`;
        default:
          return `${column} = '${escapeCh(step.matchValue)}'`;
      }
    });

    // Use ClickHouse windowFunnel aggregate function for efficient sequential matching
    // windowFunnel(window)(timestamp, cond1, cond2, ...) returns the max step reached
    const windowSeconds = 86400 * 30; // 30-day window between steps
    const conditionsStr = stepConditions.join(", ");

    const result = await this.client.query({
      query: `
        SELECT
          level,
          count() as visitors
        FROM (
          SELECT
            visitor_id,
            windowFunnel(${windowSeconds})(timestamp, ${conditionsStr}) as level
          FROM page_events
          WHERE website_id = {websiteId:UUID}
            AND timestamp >= {from:DateTime}
            AND timestamp <= {to:DateTime}
            ${filterClause}
          GROUP BY visitor_id
        )
        GROUP BY level
        ORDER BY level
      `,
      query_params: {
        websiteId,
        from: Math.floor(dateRange.from.getTime() / 1000),
        to: Math.floor(dateRange.to.getTime() / 1000),
      },
      format: "JSONEachRow",
    });

    const rows = await result.json<{ level: string; visitors: string }>();

    // Build cumulative counts: visitors who reached at least step N
    const levelCounts = new Map<number, number>();
    for (const row of rows) {
      levelCounts.set(Number(row.level), Number(row.visitors));
    }

    // Total visitors = all who appeared (level >= 0)
    let totalVisitors = 0;
    for (const [, count] of levelCounts) {
      totalVisitors += count;
    }

    // Cumulative: visitors who reached at least step i
    const atLeast = new Array<number>(steps.length).fill(0);
    for (const [level, count] of levelCounts) {
      for (let i = 0; i < steps.length && i < level; i++) {
        atLeast[i] += count;
      }
    }

    const stepResults: FunnelStepResult[] = steps.map((step, i) => ({
      name: step.name,
      visitors: atLeast[i],
      conversionRate:
        totalVisitors > 0 ? (atLeast[i] / totalVisitors) * 100 : 0,
      dropoffRate:
        i === 0
          ? totalVisitors > 0
            ? ((totalVisitors - atLeast[0]) / totalVisitors) * 100
            : 0
          : atLeast[i - 1] > 0
            ? ((atLeast[i - 1] - atLeast[i]) / atLeast[i - 1]) * 100
            : 0,
    }));

    const convertedVisitors = atLeast[steps.length - 1] ?? 0;

    return {
      totalVisitors,
      convertedVisitors,
      overallConversionRate:
        totalVisitors > 0 ? (convertedVisitors / totalVisitors) * 100 : 0,
      steps: stepResults,
    };
  }

  // ── Retention / Cohort Analysis ───────────────────────────────────

  async getRetention(query: RetentionQuery): Promise<RetentionResult> {
    const { websiteId, dateRange, granularity, filters } = query;
    const filterClause = this.buildFilterClause(filters, "page_events");

    const truncFn =
      granularity === "day"
        ? "toDate"
        : granularity === "week"
          ? "toMonday"
          : "toStartOfMonth";

    const diffFn =
      granularity === "day"
        ? "dateDiff('day', cohort_start, activity_period)"
        : granularity === "week"
          ? "intDiv(dateDiff('day', cohort_start, activity_period), 7)"
          : "dateDiff('month', cohort_start, activity_period)";

    const result = await this.client.query({
      query: `
        WITH visitor_cohort AS (
          SELECT
            visitor_id,
            ${truncFn}(min(timestamp)) AS cohort_start
          FROM page_events
          WHERE website_id = {websiteId:UUID}
            AND event_name = 'pageview'
            AND timestamp >= {from:DateTime}
            AND timestamp <= {to:DateTime}
            ${filterClause}
          GROUP BY visitor_id
        ),
        visitor_activity AS (
          SELECT DISTINCT
            visitor_id,
            ${truncFn}(timestamp) AS activity_period
          FROM page_events
          WHERE website_id = {websiteId:UUID}
            AND event_name = 'pageview'
            AND timestamp >= {from:DateTime}
            AND timestamp <= {to:DateTime}
            ${filterClause}
        ),
        retention_data AS (
          SELECT
            vc.cohort_start,
            ${diffFn} AS period_offset,
            uniq(va.visitor_id) AS visitors
          FROM visitor_cohort vc
          INNER JOIN visitor_activity va ON vc.visitor_id = va.visitor_id
          GROUP BY vc.cohort_start, period_offset
        )
        SELECT
          cohort_start,
          period_offset,
          visitors
        FROM retention_data
        ORDER BY cohort_start, period_offset
      `,
      query_params: {
        websiteId,
        from: Math.floor(dateRange.from.getTime() / 1000),
        to: Math.floor(dateRange.to.getTime() / 1000),
      },
      format: "JSONEachRow",
    });

    const rows = await result.json<{
      cohort_start: string;
      period_offset: string;
      visitors: string;
    }>();

    const cohortMap = new Map<
      string,
      { visitors: number; periods: Map<number, number> }
    >();

    for (const row of rows) {
      const cohortDate = row.cohort_start;
      const period = Number(row.period_offset);
      const visitors = Number(row.visitors);

      if (!cohortMap.has(cohortDate)) {
        cohortMap.set(cohortDate, { visitors: 0, periods: new Map() });
      }
      const cohort = cohortMap.get(cohortDate)!;
      cohort.periods.set(period, visitors);
      if (period === 0) {
        cohort.visitors = visitors;
      }
    }

    const cohorts: RetentionCohort[] = [];
    for (const [date, data] of cohortMap) {
      const retention = Array.from(data.periods.entries())
        .sort(([a], [b]) => a - b)
        .map(([period, visitors]) => ({
          period,
          visitors,
          percentage: data.visitors > 0 ? (visitors / data.visitors) * 100 : 0,
        }));

      cohorts.push({
        date: new Date(date).toISOString(),
        visitors: data.visitors,
        retention,
      });
    }

    return { granularity, cohorts };
  }
}

/** Escape single quotes for ClickHouse string literals */
function escapeCh(value: string): string {
  return value.replace(/'/g, "\\'");
}
