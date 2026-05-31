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
  VisitorSummary,
  VisitorListResult,
  VisitorProfileResult,
  VisitorSession,
  VisitorDevice,
  ActivityHeatmapPoint,
  JourneyStep,
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
    // Schema creation is handled by clickhouse-migrations in onInit.
    // This method ensures the database exists as a safety net.
    await this.client.command({
      query: `CREATE DATABASE IF NOT EXISTS ${this.database}`,
    });
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  private buildFilterClause(
    filters?: StatsFilter[],
    table: "page_events" | "sessions" = "page_events",
  ): { clause: string; params: Record<string, unknown> } {
    if (!filters || filters.length === 0) return { clause: "", params: {} };

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
    const parts: string[] = [];
    const params: Record<string, unknown> = {};

    filters
      .filter((f) => columns[f.property])
      .forEach((f, idx) => {
        const col = columns[f.property];
        const name = `flt_${idx}`;
        switch (f.operator) {
          case "eq":
            parts.push(`AND ${col} = {${name}:String}`);
            params[name] = f.value;
            break;
          case "neq":
            parts.push(`AND ${col} != {${name}:String}`);
            params[name] = f.value;
            break;
          case "contains":
            parts.push(`AND ${col} LIKE {${name}:String}`);
            params[name] = `%${escapeLikePattern(f.value)}%`;
            break;
          default:
            parts.push(`AND ${col} = {${name}:String}`);
            params[name] = f.value;
        }
      });

    return { clause: parts.join("\n          "), params };
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
    const eventFilter = this.buildFilterClause(filters, "page_events");
    const sessionFilter = this.buildFilterClause(filters, "sessions");

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
          ${eventFilter.clause}
      `,
      query_params: {
        websiteId,
        from: Math.floor(dateRange.from.getTime() / 1000),
        to: Math.floor(dateRange.to.getTime() / 1000),
        ...eventFilter.params,
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
          ${sessionFilter.clause}
      `,
      query_params: {
        websiteId,
        from: Math.floor(dateRange.from.getTime() / 1000),
        to: Math.floor(dateRange.to.getTime() / 1000),
        ...sessionFilter.params,
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
    const filter = this.buildFilterClause(filters, "page_events");

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
          ${filter.clause}
        GROUP BY date
        ORDER BY date
      `,
      query_params: {
        websiteId,
        from: Math.floor(dateRange.from.getTime() / 1000),
        to: Math.floor(dateRange.to.getTime() / 1000),
        ...filter.params,
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

    const filter = this.buildFilterClause(filters, "page_events");

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
          ${filter.clause}
        GROUP BY value
        ORDER BY visitors DESC
        LIMIT {limit:UInt32}
      `,
      query_params: {
        websiteId,
        from: Math.floor(dateRange.from.getTime() / 1000),
        to: Math.floor(dateRange.to.getTime() / 1000),
        limit,
        ...filter.params,
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
    const filter = this.buildFilterClause(filters, "sessions");

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
          ${filter.clause}
        GROUP BY value
        ORDER BY visitors DESC
        LIMIT {limit:UInt32}
      `,
      query_params: {
        websiteId,
        from: Math.floor(dateRange.from.getTime() / 1000),
        to: Math.floor(dateRange.to.getTime() / 1000),
        limit,
        ...filter.params,
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

  // ── User Journey Methods ─────────────────────────────────────────

  /**
   * Resolve all visitorIds linked to the same real user via visitor_identities.
   * Always returns at least the original visitorId.
   */
  private async resolveVisitorIds(
    websiteId: string,
    visitorId: string,
  ): Promise<string[]> {
    // Step 1: Find userId(s) linked to this visitorId
    const userIdResult = await this.client.query({
      query: `
        SELECT DISTINCT user_id
        FROM visitor_identities FINAL
        WHERE website_id = {websiteId:UUID}
          AND visitor_id = {visitorId:String}
      `,
      query_params: { websiteId, visitorId },
      format: "JSONEachRow",
    });
    const userIdRows = await userIdResult.json<{ user_id: string }>();

    if (userIdRows.length === 0) return [visitorId];

    // Step 2: Find all visitorIds linked to those userIds
    const userIds = userIdRows.map((r) => r.user_id);
    const linkedResult = await this.client.query({
      query: `
        SELECT DISTINCT visitor_id
        FROM visitor_identities FINAL
        WHERE website_id = {websiteId:UUID}
          AND user_id IN ({userIds:Array(String)})
      `,
      query_params: { websiteId, userIds },
      format: "JSONEachRow",
    });
    const linkedRows = await linkedResult.json<{ visitor_id: string }>();

    const ids = new Set([visitorId, ...linkedRows.map((r) => r.visitor_id)]);
    return [...ids];
  }

  async linkVisitorIdentity(
    websiteId: string,
    visitorId: string,
    userId: string,
  ): Promise<void> {
    // ReplacingMergeTree deduplicates on ORDER BY (website_id, visitor_id, user_id)
    await this.client.insert({
      table: "visitor_identities",
      values: [
        {
          website_id: websiteId,
          visitor_id: visitorId,
          user_id: userId,
          linked_at: Math.floor(Date.now() / 1000),
        },
      ],
      format: "JSONEachRow",
    });
  }

  async getVisitors(
    websiteId: string,
    dateRange: DateRange,
    page: number,
    pageSize: number,
    search?: string,
  ): Promise<VisitorListResult> {
    const offset = (page - 1) * pageSize;
    const from = Math.floor(dateRange.from.getTime() / 1000);
    const to = Math.floor(dateRange.to.getTime() / 1000);

    const searchClause = search
      ? `AND visitor_id LIKE {search:String}`
      : "";
    const searchParams: Record<string, unknown> = search
      ? { search: `%${escapeLikePattern(search)}%` }
      : {};

    // Count total distinct visitors
    const totalResult = await this.client.query({
      query: `
        SELECT uniqExact(visitor_id) as total
        FROM sessions FINAL
        WHERE website_id = {websiteId:UUID}
          AND started_at >= {from:DateTime}
          AND started_at <= {to:DateTime}
          AND sign = 1
          ${searchClause}
      `,
      query_params: { websiteId, from, to, ...searchParams },
      format: "JSONEachRow",
    });
    const totalRows = await totalResult.json<{ total: string }>();
    const total = Number(totalRows[0]?.total ?? 0);

    // Get paginated visitor summaries from sessions
    const visitorsResult = await this.client.query({
      query: `
        SELECT
          visitor_id,
          min(started_at) as first_seen,
          max(ended_at) as last_seen,
          count() as total_sessions,
          sum(pageviews) as total_pageviews,
          sum(events) as total_events,
          avg(duration) as avg_duration,
          anyLast(country) as last_country,
          anyLast(city) as last_city,
          groupUniqArray(device_type) as devices,
          groupUniqArray(browser) as browsers,
          groupUniqArray(os) as operating_systems
        FROM sessions FINAL
        WHERE website_id = {websiteId:UUID}
          AND started_at >= {from:DateTime}
          AND started_at <= {to:DateTime}
          AND sign = 1
          ${searchClause}
        GROUP BY visitor_id
        ORDER BY max(ended_at) DESC
        LIMIT {pageSize:UInt32}
        OFFSET {offset:UInt32}
      `,
      query_params: { websiteId, from, to, pageSize, offset, ...searchParams },
      format: "JSONEachRow",
    });

    const visitors = await visitorsResult.json<{
      visitor_id: string;
      first_seen: string;
      last_seen: string;
      total_sessions: string;
      total_pageviews: string;
      total_events: string;
      avg_duration: string;
      last_country: string;
      last_city: string;
      devices: string[];
      browsers: string[];
      operating_systems: string[];
    }>();

    // Batch resolve userIds from visitor_identities
    const visitorIds = visitors.map((v) => v.visitor_id);
    const identityMap = new Map<string, string>();
    if (visitorIds.length > 0) {
      const identityResult = await this.client.query({
        query: `
          SELECT visitor_id, user_id
          FROM visitor_identities FINAL
          WHERE website_id = {websiteId:UUID}
            AND visitor_id IN ({visitorIds:Array(String)})
        `,
        query_params: { websiteId, visitorIds },
        format: "JSONEachRow",
      });
      const identityRows = await identityResult.json<{
        visitor_id: string;
        user_id: string;
      }>();
      for (const row of identityRows) {
        identityMap.set(row.visitor_id, row.user_id);
      }
    }

    const data: VisitorSummary[] = visitors.map((row) => ({
      visitorId: row.visitor_id,
      userId: identityMap.get(row.visitor_id),
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
      totalSessions: Number(row.total_sessions),
      totalPageviews: Number(row.total_pageviews),
      totalEvents: Number(row.total_events),
      avgSessionDuration: Number(row.avg_duration),
      lastCountry: row.last_country || "",
      lastCity: row.last_city || "",
      devices: (row.devices || []).filter(Boolean),
      browsers: (row.browsers || []).filter(Boolean),
      operatingSystems: (row.operating_systems || []).filter(Boolean),
    }));

    return { data, total, page, pageSize };
  }

  async getVisitorProfile(
    websiteId: string,
    visitorId: string,
    dateRange: DateRange,
  ): Promise<VisitorProfileResult | null> {
    const visitorIds = await this.resolveVisitorIds(websiteId, visitorId);
    const from = Math.floor(dateRange.from.getTime() / 1000);
    const to = Math.floor(dateRange.to.getTime() / 1000);

    // Aggregated visitor summary from sessions
    const summaryResult = await this.client.query({
      query: `
        SELECT
          min(started_at) as first_seen,
          max(ended_at) as last_seen,
          count() as total_sessions,
          sum(pageviews) as total_pageviews,
          sum(events) as total_events,
          avg(duration) as avg_duration,
          anyLast(country) as last_country,
          anyLast(city) as last_city,
          groupUniqArray(device_type) as devices,
          groupUniqArray(browser) as browsers,
          groupUniqArray(os) as operating_systems
        FROM sessions FINAL
        WHERE website_id = {websiteId:UUID}
          AND visitor_id IN ({visitorIds:Array(String)})
          AND sign = 1
      `,
      query_params: { websiteId, visitorIds },
      format: "JSONEachRow",
    });

    const summaryRows = await summaryResult.json<{
      first_seen: string;
      last_seen: string;
      total_sessions: string;
      total_pageviews: string;
      total_events: string;
      avg_duration: string;
      last_country: string;
      last_city: string;
      devices: string[];
      browsers: string[];
      operating_systems: string[];
    }>();

    const row = summaryRows[0];
    if (!row || !row.first_seen || row.first_seen === "1970-01-01 00:00:00")
      return null;

    // Resolve userId
    const identityResult = await this.client.query({
      query: `
        SELECT user_id
        FROM visitor_identities FINAL
        WHERE website_id = {websiteId:UUID}
          AND visitor_id IN ({visitorIds:Array(String)})
        LIMIT 1
      `,
      query_params: { websiteId, visitorIds },
      format: "JSONEachRow",
    });
    const identityRows = await identityResult.json<{ user_id: string }>();

    const visitor: VisitorSummary = {
      visitorId,
      userId: identityRows[0]?.user_id,
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
      totalSessions: Number(row.total_sessions),
      totalPageviews: Number(row.total_pageviews),
      totalEvents: Number(row.total_events),
      avgSessionDuration: Number(row.avg_duration),
      lastCountry: row.last_country || "",
      lastCity: row.last_city || "",
      devices: (row.devices || []).filter(Boolean),
      browsers: (row.browsers || []).filter(Boolean),
      operatingSystems: (row.operating_systems || []).filter(Boolean),
    };

    // Device breakdown
    const deviceResult = await this.client.query({
      query: `
        SELECT
          device_type,
          browser,
          os,
          screen_size,
          count() as session_count,
          max(ended_at) as last_seen
        FROM sessions FINAL
        WHERE website_id = {websiteId:UUID}
          AND visitor_id IN ({visitorIds:Array(String)})
          AND sign = 1
        GROUP BY device_type, browser, os, screen_size
        ORDER BY session_count DESC
      `,
      query_params: { websiteId, visitorIds },
      format: "JSONEachRow",
    });

    const deviceRows = await deviceResult.json<{
      device_type: string;
      browser: string;
      os: string;
      screen_size: string;
      session_count: string;
      last_seen: string;
    }>();

    const devices: VisitorDevice[] = deviceRows.map((d) => ({
      deviceType: d.device_type,
      browser: d.browser,
      os: d.os,
      screenSize: d.screen_size,
      sessions: Number(d.session_count),
      lastSeen: d.last_seen,
    }));

    // Activity heatmap (day-of-week × hour)
    const heatmapResult = await this.client.query({
      query: `
        SELECT
          toDayOfWeek(timestamp, 0) as day_of_week,
          toHour(timestamp) as hour,
          count() as event_count
        FROM page_events
        WHERE website_id = {websiteId:UUID}
          AND visitor_id IN ({visitorIds:Array(String)})
          AND timestamp >= {from:DateTime}
          AND timestamp <= {to:DateTime}
        GROUP BY day_of_week, hour
      `,
      query_params: { websiteId, visitorIds, from, to },
      format: "JSONEachRow",
    });

    const heatmapRows = await heatmapResult.json<{
      day_of_week: string;
      hour: string;
      event_count: string;
    }>();

    const activityHeatmap: ActivityHeatmapPoint[] = heatmapRows.map((h) => ({
      // toDayOfWeek with mode=0 returns 1=Monday..7=Sunday
      // PostgreSQL EXTRACT(DOW) returns 0=Sunday..6=Saturday
      // Convert: CH 7(Sun) -> 0, CH 1(Mon) -> 1, ... CH 6(Sat) -> 6
      dayOfWeek: Number(h.day_of_week) === 7 ? 0 : Number(h.day_of_week),
      hour: Number(h.hour),
      count: Number(h.event_count),
    }));

    // Recent sessions with journey
    const recentSessions = await this.getVisitorSessions(
      websiteId,
      visitorId,
      dateRange,
      20,
    );

    return { visitor, devices, recentSessions, activityHeatmap };
  }

  async getVisitorSessions(
    websiteId: string,
    visitorId: string,
    dateRange: DateRange,
    limit = 50,
  ): Promise<VisitorSession[]> {
    const visitorIds = await this.resolveVisitorIds(websiteId, visitorId);
    const from = Math.floor(dateRange.from.getTime() / 1000);
    const to = Math.floor(dateRange.to.getTime() / 1000);

    // Fetch sessions
    const sessionsResult = await this.client.query({
      query: `
        SELECT *
        FROM sessions FINAL
        WHERE website_id = {websiteId:UUID}
          AND visitor_id IN ({visitorIds:Array(String)})
          AND started_at >= {from:DateTime}
          AND started_at <= {to:DateTime}
          AND sign = 1
        ORDER BY started_at DESC
        LIMIT {limit:UInt32}
      `,
      query_params: { websiteId, visitorIds, from, to, limit },
      format: "JSONEachRow",
    });

    const sessionRows = await sessionsResult.json<{
      id: string;
      started_at: string;
      ended_at: string;
      duration: number;
      entry_page: string;
      exit_page: string;
      pageviews: number;
      events: number;
      is_bounce: number;
      referrer_domain: string;
      utm_source: string;
      country: string;
      city: string;
      browser: string;
      os: string;
      device_type: string;
      screen_size: string;
    }>();

    if (sessionRows.length === 0) return [];

    // Fetch all page events for these sessions
    const sessionIds = sessionRows.map((s) => s.id);
    const eventsResult = await this.client.query({
      query: `
        SELECT
          session_id,
          timestamp,
          event_name,
          url_path,
          page_title,
          referrer_path,
          custom_data
        FROM page_events
        WHERE website_id = {websiteId:UUID}
          AND session_id IN ({sessionIds:Array(String)})
        ORDER BY timestamp ASC
      `,
      query_params: { websiteId, sessionIds },
      format: "JSONEachRow",
    });

    const allEvents = await eventsResult.json<{
      session_id: string;
      timestamp: string;
      event_name: string;
      url_path: string;
      page_title: string;
      referrer_path: string;
      custom_data: string;
    }>();

    // Group events by session
    const eventsBySession = new Map<string, typeof allEvents>();
    for (const ev of allEvents) {
      const list = eventsBySession.get(ev.session_id) ?? [];
      list.push(ev);
      eventsBySession.set(ev.session_id, list);
    }

    // Build result with journey steps
    return sessionRows.map((sess) => {
      const events = eventsBySession.get(sess.id) ?? [];

      const steps: JourneyStep[] = events.map((ev, i) => {
        const nextTs = i < events.length - 1 ? events[i + 1].timestamp : null;
        const duration =
          nextTs && ev.timestamp
            ? Math.round(
                (new Date(nextTs).getTime() -
                  new Date(ev.timestamp).getTime()) /
                  1000,
              )
            : 0;

        let customData: Record<string, string | number | boolean> | undefined;
        try {
          const parsed = JSON.parse(ev.custom_data || "{}");
          if (Object.keys(parsed).length > 0) customData = parsed;
        } catch {
          // ignore invalid JSON
        }

        return {
          timestamp: ev.timestamp,
          eventName: ev.event_name,
          urlPath: ev.url_path,
          pageTitle: ev.page_title,
          referrerPath: ev.referrer_path,
          duration,
          customData,
        };
      });

      return {
        sessionId: sess.id,
        startedAt: sess.started_at,
        endedAt: sess.ended_at,
        duration: sess.duration,
        entryPage: sess.entry_page,
        exitPage: sess.exit_page,
        pageviews: sess.pageviews,
        events: sess.events,
        isBounce: sess.is_bounce === 1,
        referrerDomain: sess.referrer_domain,
        utmSource: sess.utm_source,
        country: sess.country,
        city: sess.city,
        browser: sess.browser,
        os: sess.os,
        deviceType: sess.device_type,
        screenSize: sess.screen_size,
        steps,
      };
    });
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

    const filter = this.buildFilterClause(filters, "page_events");

    // Build per-step match conditions for ClickHouse windowFunnel
    const stepParams: Record<string, unknown> = {};
    const stepConditions = steps.map((step, i) => {
      const column =
        step.matchType === "event_name" ? "event_name" : "url_path";
      const name = `step_${i}`;
      switch (step.matchOperator) {
        case "contains":
          stepParams[name] = step.matchValue;
          return `position(${column}, {${name}:String}) > 0`;
        case "starts_with":
          stepParams[name] = step.matchValue;
          return `startsWith(${column}, {${name}:String})`;
        default:
          stepParams[name] = step.matchValue;
          return `${column} = {${name}:String}`;
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
            ${filter.clause}
          GROUP BY visitor_id
        )
        GROUP BY level
        ORDER BY level
      `,
      query_params: {
        websiteId,
        from: Math.floor(dateRange.from.getTime() / 1000),
        to: Math.floor(dateRange.to.getTime() / 1000),
        ...filter.params,
        ...stepParams,
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
    const filter = this.buildFilterClause(filters, "page_events");

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
            ${filter.clause}
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
            ${filter.clause}
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
        ...filter.params,
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

/** Escape ClickHouse LIKE wildcards so user input is treated literally inside a parameterized LIKE pattern. */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
