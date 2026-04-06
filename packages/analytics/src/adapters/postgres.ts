import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  eq,
  and,
  gte,
  lte,
  sql,
  desc,
  asc,
  count,
  countDistinct,
  ne,
  like,
  or,
  inArray,
} from "drizzle-orm";
import { pageEvents, sessions, visitorIdentities } from "../schema/tables.js";

/** Escape LIKE wildcard characters so user input is treated literally. */
function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}
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
  VisitorSummary,
  VisitorSession,
  JourneyStep,
  ActivityHeatmapPoint,
  VisitorDevice,
  VisitorProfileResult,
  FunnelQuery,
  FunnelResult,
  FunnelStepResult,
  RetentionQuery,
  RetentionResult,
  RetentionCohort,
  CohortGranularity,
} from "../types.js";

export class PostgresAnalyticsRepository implements AnalyticsRepository {
  private client: ReturnType<typeof postgres>;
  private db: ReturnType<typeof drizzle>;

  constructor(connectionUrl: string) {
    this.client = postgres(connectionUrl);
    this.db = drizzle(this.client);
  }

  async initialize(): Promise<void> {
    // Ensure analytics schema exists
    await this.client`CREATE SCHEMA IF NOT EXISTS analytics`;
  }

  async close(): Promise<void> {
    await this.client.end();
  }

  private buildEventFilters(filters?: StatsFilter[]) {
    if (!filters || filters.length === 0) return [];

    const columnMap: Record<string, any> = {
      url_path: pageEvents.urlPath,
      referrer_domain: pageEvents.referrerDomain,
      country: pageEvents.country,
      region: pageEvents.region,
      city: pageEvents.city,
      browser: pageEvents.browser,
      browser_version: pageEvents.browserVersion,
      os: pageEvents.os,
      os_version: pageEvents.osVersion,
      device_type: pageEvents.deviceType,
      screen_size: pageEvents.screenSize,
      utm_source: pageEvents.utmSource,
      utm_medium: pageEvents.utmMedium,
      utm_campaign: pageEvents.utmCampaign,
      utm_content: pageEvents.utmContent,
      utm_term: pageEvents.utmTerm,
      page_title: pageEvents.pageTitle,
      hostname: pageEvents.hostname,
    };

    return filters
      .filter((f) => columnMap[f.property])
      .map((f) => {
        const col = columnMap[f.property];
        switch (f.operator) {
          case "eq":
            return eq(col, f.value);
          case "neq":
            return ne(col, f.value);
          case "contains":
            return like(col, `%${escapeLike(f.value)}%`);
          default:
            return eq(col, f.value);
        }
      });
  }

  private buildSessionFilters(filters?: StatsFilter[]) {
    if (!filters || filters.length === 0) return [];

    const columnMap: Record<string, any> = {
      entry_page: sessions.entryPage,
      exit_page: sessions.exitPage,
      referrer_domain: sessions.referrerDomain,
      country: sessions.country,
      region: sessions.region,
      city: sessions.city,
      browser: sessions.browser,
      os: sessions.os,
      device_type: sessions.deviceType,
      utm_source: sessions.utmSource,
      utm_medium: sessions.utmMedium,
      utm_campaign: sessions.utmCampaign,
    };

    return filters
      .filter((f) => columnMap[f.property])
      .map((f) => {
        const col = columnMap[f.property];
        switch (f.operator) {
          case "eq":
            return eq(col, f.value);
          case "neq":
            return ne(col, f.value);
          case "contains":
            return like(col, `%${escapeLike(f.value)}%`);
          default:
            return eq(col, f.value);
        }
      });
  }

  async insertEvent(event: PageEvent): Promise<void> {
    await this.db.insert(pageEvents).values(this.mapEventToRow(event));
  }

  async insertEvents(events: PageEvent[]): Promise<void> {
    if (events.length === 0) return;
    const rows = events.map((e) => this.mapEventToRow(e));
    await this.db.insert(pageEvents).values(rows);
  }

  async upsertSession(session: Session): Promise<void> {
    await this.db
      .insert(sessions)
      .values({
        id: session.id,
        websiteId: session.websiteId,
        visitorId: session.visitorId,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        duration: session.duration,
        entryPage: session.entryPage,
        exitPage: session.exitPage,
        pageviews: session.pageviews,
        events: session.events,
        isBounce: session.isBounce,
        referrerDomain: session.referrerDomain,
        referrerPath: session.referrerPath,
        utmSource: session.utmSource,
        utmMedium: session.utmMedium,
        utmCampaign: session.utmCampaign,
        country: session.country,
        region: session.region,
        city: session.city,
        browser: session.browser,
        os: session.os,
        deviceType: session.deviceType,
        screenSize: session.screenSize,
      })
      .onConflictDoUpdate({
        target: sessions.id,
        set: {
          endedAt: session.endedAt,
          duration: session.duration,
          exitPage: session.exitPage,
          pageviews: session.pageviews,
          events: session.events,
          isBounce: session.isBounce,
        },
      });
  }

  async getStats(query: StatsQuery): Promise<StatsResult> {
    const { websiteId, dateRange, filters } = query;
    const eventFilters = this.buildEventFilters(filters);
    const sessionFilterConditions = this.buildSessionFilters(filters);

    const result = await this.db
      .select({
        visitors: countDistinct(pageEvents.visitorId),
        pageviews: count(),
        sessions: countDistinct(pageEvents.sessionId),
      })
      .from(pageEvents)
      .where(
        and(
          eq(pageEvents.websiteId, websiteId),
          eq(pageEvents.eventName, "pageview"),
          gte(pageEvents.timestamp, dateRange.from),
          lte(pageEvents.timestamp, dateRange.to),
          ...eventFilters,
        ),
      );

    const sessionStats = await this.db
      .select({
        totalDuration: sql<number>`COALESCE(AVG(${sessions.duration}), 0)`.as(
          "avg_duration",
        ),
        bounceCount:
          sql<number>`COUNT(CASE WHEN ${sessions.isBounce} THEN 1 END)`.as(
            "bounce_count",
          ),
        totalSessions: count(),
        totalPageviews: sql<number>`COALESCE(SUM(${sessions.pageviews}), 0)`.as(
          "total_pageviews",
        ),
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.websiteId, websiteId),
          gte(sessions.startedAt, dateRange.from),
          lte(sessions.startedAt, dateRange.to),
          ...sessionFilterConditions,
        ),
      );

    const row = result[0];
    const sRow = sessionStats[0];
    const totalSessions = Number(sRow?.totalSessions ?? 0);

    return {
      visitors: Number(row?.visitors ?? 0),
      pageviews: Number(row?.pageviews ?? 0),
      sessions: Number(row?.sessions ?? 0),
      bounceRate:
        totalSessions > 0 ? Number(sRow!.bounceCount) / totalSessions : 0,
      avgDuration: Number(sRow?.totalDuration ?? 0),
      viewsPerVisit:
        totalSessions > 0 ? Number(sRow!.totalPageviews) / totalSessions : 0,
    };
  }

  async getTimeSeries(
    query: StatsQuery,
    interval: TimeInterval,
  ): Promise<TimeSeriesResult> {
    const { websiteId, dateRange, filters } = query;
    const eventFilters = this.buildEventFilters(filters);

    const truncFn =
      interval === "hour"
        ? sql`date_trunc('hour', ${pageEvents.timestamp})`
        : interval === "day"
          ? sql`date_trunc('day', ${pageEvents.timestamp})`
          : interval === "week"
            ? sql`date_trunc('week', ${pageEvents.timestamp})`
            : sql`date_trunc('month', ${pageEvents.timestamp})`;

    const result = await this.db
      .select({
        date: truncFn.as("date"),
        visitors: countDistinct(pageEvents.visitorId),
        pageviews: count(),
        sessions: countDistinct(pageEvents.sessionId),
      })
      .from(pageEvents)
      .where(
        and(
          eq(pageEvents.websiteId, websiteId),
          eq(pageEvents.eventName, "pageview"),
          gte(pageEvents.timestamp, dateRange.from),
          lte(pageEvents.timestamp, dateRange.to),
          ...eventFilters,
        ),
      )
      .groupBy(sql`date`)
      .orderBy(sql`date`);

    return {
      interval,
      data: result.map((row) => ({
        date: String(row.date),
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

    // entry_page and exit_page come from sessions table
    if (property === "entry_page" || property === "exit_page") {
      return this.getSessionBreakdown(query, property, limit);
    }

    const eventFilters = this.buildEventFilters(filters);

    const columnMap: Record<string, any> = {
      url_path: pageEvents.urlPath,
      referrer_domain: pageEvents.referrerDomain,
      country: pageEvents.country,
      region: pageEvents.region,
      city: pageEvents.city,
      browser: pageEvents.browser,
      browser_version: pageEvents.browserVersion,
      os: pageEvents.os,
      os_version: pageEvents.osVersion,
      device_type: pageEvents.deviceType,
      screen_size: pageEvents.screenSize,
      utm_source: pageEvents.utmSource,
      utm_medium: pageEvents.utmMedium,
      utm_campaign: pageEvents.utmCampaign,
      utm_content: pageEvents.utmContent,
      utm_term: pageEvents.utmTerm,
      page_title: pageEvents.pageTitle,
      hostname: pageEvents.hostname,
    };

    const column = columnMap[property];

    const result = await this.db
      .select({
        value: column,
        visitors: countDistinct(pageEvents.visitorId),
        pageviews: count(),
      })
      .from(pageEvents)
      .where(
        and(
          eq(pageEvents.websiteId, websiteId),
          eq(pageEvents.eventName, "pageview"),
          gte(pageEvents.timestamp, dateRange.from),
          lte(pageEvents.timestamp, dateRange.to),
          ne(column, ""),
          ...eventFilters,
        ),
      )
      .groupBy(column)
      .orderBy(desc(countDistinct(pageEvents.visitorId)))
      .limit(limit);

    const totalVisitors = result.reduce(
      (sum, row) => sum + Number(row.visitors),
      0,
    );

    return {
      property,
      total: totalVisitors,
      data: result.map(
        (row): BreakdownItem => ({
          value: String(row.value),
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
    const sessionFilterConditions = this.buildSessionFilters(filters);

    const column =
      property === "entry_page" ? sessions.entryPage : sessions.exitPage;

    const result = await this.db
      .select({
        value: column,
        visitors: countDistinct(sessions.visitorId),
        sessionCount: count(),
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.websiteId, websiteId),
          gte(sessions.startedAt, dateRange.from),
          lte(sessions.startedAt, dateRange.to),
          ne(column, ""),
          ...sessionFilterConditions,
        ),
      )
      .groupBy(column)
      .orderBy(desc(countDistinct(sessions.visitorId)))
      .limit(limit);

    const totalVisitors = result.reduce(
      (sum, row) => sum + Number(row.visitors),
      0,
    );

    return {
      property,
      total: totalVisitors,
      data: result.map(
        (row): BreakdownItem => ({
          value: String(row.value),
          visitors: Number(row.visitors),
          pageviews: Number(row.sessionCount),
          percentage:
            totalVisitors > 0 ? Number(row.visitors) / totalVisitors : 0,
        }),
      ),
    };
  }

  async getActiveVisitors(websiteId: string, minutes = 5): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000);

    const result = await this.db
      .select({ count: countDistinct(pageEvents.visitorId) })
      .from(pageEvents)
      .where(
        and(
          eq(pageEvents.websiteId, websiteId),
          gte(pageEvents.timestamp, since),
        ),
      );

    return Number(result[0]?.count ?? 0);
  }

  // ── User Journey Methods ──────────────────────────────────────────

  async linkVisitorIdentity(
    websiteId: string,
    visitorId: string,
    userId: string,
  ): Promise<void> {
    await this.db
      .insert(visitorIdentities)
      .values({ websiteId, visitorId, userId })
      .onConflictDoNothing();
  }

  /**
   * Resolve all visitorIds that belong to the same real user.
   * Uses a single query: find the userId linked to this visitorId,
   * then find all other visitorIds linked to that same userId.
   */
  private async resolveVisitorIds(
    websiteId: string,
    visitorId: string,
  ): Promise<string[]> {
    const linked = await this.db
      .select({ visitorId: visitorIdentities.visitorId })
      .from(visitorIdentities)
      .where(
        and(
          eq(visitorIdentities.websiteId, websiteId),
          inArray(
            visitorIdentities.userId,
            this.db
              .select({ userId: visitorIdentities.userId })
              .from(visitorIdentities)
              .where(
                and(
                  eq(visitorIdentities.websiteId, websiteId),
                  eq(visitorIdentities.visitorId, visitorId),
                ),
              ),
          ),
        ),
      );

    if (linked.length === 0) return [visitorId];

    const ids = new Set([visitorId, ...linked.map((r) => r.visitorId)]);
    return [...ids];
  }

  async getVisitors(
    websiteId: string,
    dateRange: DateRange,
    page: number,
    pageSize: number,
    search?: string,
  ): Promise<VisitorListResult> {
    const offset = (page - 1) * pageSize;

    const searchCondition = search
      ? like(sessions.visitorId, `%${escapeLike(search)}%`)
      : undefined;

    // Count total distinct visitors
    const totalResult = await this.db
      .select({ total: countDistinct(sessions.visitorId) })
      .from(sessions)
      .where(
        and(
          eq(sessions.websiteId, websiteId),
          gte(sessions.startedAt, dateRange.from),
          lte(sessions.startedAt, dateRange.to),
          searchCondition,
        ),
      );
    const total = Number(totalResult[0]?.total ?? 0);

    // Get paginated visitor summaries from sessions
    const visitors = await this.db
      .select({
        visitorId: sessions.visitorId,
        firstSeen: sql<string>`MIN(${sessions.startedAt})`.as("first_seen"),
        lastSeen: sql<string>`MAX(${sessions.endedAt})`.as("last_seen"),
        totalSessions: count().as("total_sessions"),
        totalPageviews: sql<number>`COALESCE(SUM(${sessions.pageviews}), 0)`.as(
          "total_pageviews",
        ),
        totalEvents: sql<number>`COALESCE(SUM(${sessions.events}), 0)`.as(
          "total_events",
        ),
        avgDuration: sql<number>`COALESCE(AVG(${sessions.duration}), 0)`.as(
          "avg_duration",
        ),
        lastCountry:
          sql<string>`(ARRAY_AGG(${sessions.country} ORDER BY ${sessions.startedAt} DESC))[1]`.as(
            "last_country",
          ),
        lastCity:
          sql<string>`(ARRAY_AGG(${sessions.city} ORDER BY ${sessions.startedAt} DESC))[1]`.as(
            "last_city",
          ),
        devices: sql<string[]>`ARRAY_AGG(DISTINCT ${sessions.deviceType})`.as(
          "devices",
        ),
        browsers: sql<string[]>`ARRAY_AGG(DISTINCT ${sessions.browser})`.as(
          "browsers",
        ),
        operatingSystems: sql<string[]>`ARRAY_AGG(DISTINCT ${sessions.os})`.as(
          "operating_systems",
        ),
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.websiteId, websiteId),
          gte(sessions.startedAt, dateRange.from),
          lte(sessions.startedAt, dateRange.to),
          searchCondition,
        ),
      )
      .groupBy(sessions.visitorId)
      .orderBy(desc(sql`MAX(${sessions.endedAt})`))
      .limit(pageSize)
      .offset(offset);

    // Resolve userIds for display
    const visitorIds = visitors.map((v) => v.visitorId);
    const identityMap = new Map<string, string>();
    if (visitorIds.length > 0) {
      const identities = await this.db
        .select({
          visitorId: visitorIdentities.visitorId,
          userId: visitorIdentities.userId,
        })
        .from(visitorIdentities)
        .where(
          and(
            eq(visitorIdentities.websiteId, websiteId),
            inArray(visitorIdentities.visitorId, visitorIds),
          ),
        );
      for (const row of identities) {
        identityMap.set(row.visitorId, row.userId);
      }
    }

    const data: VisitorSummary[] = visitors.map((row) => ({
      visitorId: row.visitorId,
      userId: identityMap.get(row.visitorId),
      firstSeen: String(row.firstSeen),
      lastSeen: String(row.lastSeen),
      totalSessions: Number(row.totalSessions),
      totalPageviews: Number(row.totalPageviews),
      totalEvents: Number(row.totalEvents),
      avgSessionDuration: Number(row.avgDuration),
      lastCountry: row.lastCountry || "",
      lastCity: row.lastCity || "",
      devices: (row.devices || []).filter(Boolean),
      browsers: (row.browsers || []).filter(Boolean),
      operatingSystems: (row.operatingSystems || []).filter(Boolean),
    }));

    return { data, total, page, pageSize };
  }

  async getVisitorSessions(
    websiteId: string,
    visitorId: string,
    dateRange: DateRange,
    limit = 50,
  ): Promise<VisitorSession[]> {
    const visitorIds = await this.resolveVisitorIds(websiteId, visitorId);

    // Fetch sessions
    const sessionRows = await this.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.websiteId, websiteId),
          inArray(sessions.visitorId, visitorIds),
          gte(sessions.startedAt, dateRange.from),
          lte(sessions.startedAt, dateRange.to),
        ),
      )
      .orderBy(desc(sessions.startedAt))
      .limit(limit);

    if (sessionRows.length === 0) return [];

    // Fetch all journey steps for these sessions in a single query
    const sessionIds = sessionRows.map((s) => s.id);
    const allEvents = await this.db
      .select({
        sessionId: pageEvents.sessionId,
        timestamp: pageEvents.timestamp,
        eventName: pageEvents.eventName,
        urlPath: pageEvents.urlPath,
        pageTitle: pageEvents.pageTitle,
        referrerPath: pageEvents.referrerPath,
        customData: pageEvents.customData,
      })
      .from(pageEvents)
      .where(
        and(
          eq(pageEvents.websiteId, websiteId),
          inArray(pageEvents.sessionId, sessionIds),
        ),
      )
      .orderBy(asc(pageEvents.timestamp));

    // Group events by session
    const eventsBySession = new Map<string, typeof allEvents>();
    for (const ev of allEvents) {
      const list = eventsBySession.get(ev.sessionId) ?? [];
      list.push(ev);
      eventsBySession.set(ev.sessionId, list);
    }

    // Build result with journey steps
    return sessionRows.map((sess) => {
      const events = eventsBySession.get(sess.id) ?? [];

      const steps: JourneyStep[] = events.map((ev, i) => {
        const nextTs = i < events.length - 1 ? events[i + 1].timestamp : null;
        const duration = nextTs
          ? Math.round((nextTs.getTime() - ev.timestamp.getTime()) / 1000)
          : 0;
        return {
          timestamp: ev.timestamp.toISOString(),
          eventName: ev.eventName,
          urlPath: ev.urlPath,
          pageTitle: ev.pageTitle,
          referrerPath: ev.referrerPath,
          duration,
          customData:
            (ev.customData as Record<string, string | number | boolean>) ??
            undefined,
        };
      });

      return {
        sessionId: sess.id,
        startedAt: sess.startedAt.toISOString(),
        endedAt: sess.endedAt.toISOString(),
        duration: sess.duration,
        entryPage: sess.entryPage,
        exitPage: sess.exitPage,
        pageviews: sess.pageviews,
        events: sess.events,
        isBounce: sess.isBounce,
        referrerDomain: sess.referrerDomain,
        utmSource: sess.utmSource,
        country: sess.country,
        city: sess.city,
        browser: sess.browser,
        os: sess.os,
        deviceType: sess.deviceType,
        screenSize: sess.screenSize,
        steps,
      };
    });
  }

  async getVisitorProfile(
    websiteId: string,
    visitorId: string,
    dateRange: DateRange,
  ): Promise<VisitorProfileResult | null> {
    const visitorIds = await this.resolveVisitorIds(websiteId, visitorId);

    // Get aggregated visitor summary
    const summaryRows = await this.db
      .select({
        firstSeen: sql<string>`MIN(${sessions.startedAt})`.as("first_seen"),
        lastSeen: sql<string>`MAX(${sessions.endedAt})`.as("last_seen"),
        totalSessions: count().as("total_sessions"),
        totalPageviews: sql<number>`COALESCE(SUM(${sessions.pageviews}), 0)`.as(
          "total_pageviews",
        ),
        totalEvents: sql<number>`COALESCE(SUM(${sessions.events}), 0)`.as(
          "total_events",
        ),
        avgDuration: sql<number>`COALESCE(AVG(${sessions.duration}), 0)`.as(
          "avg_duration",
        ),
        lastCountry:
          sql<string>`(ARRAY_AGG(${sessions.country} ORDER BY ${sessions.startedAt} DESC))[1]`.as(
            "last_country",
          ),
        lastCity:
          sql<string>`(ARRAY_AGG(${sessions.city} ORDER BY ${sessions.startedAt} DESC))[1]`.as(
            "last_city",
          ),
        devices: sql<string[]>`ARRAY_AGG(DISTINCT ${sessions.deviceType})`.as(
          "devices",
        ),
        browsers: sql<string[]>`ARRAY_AGG(DISTINCT ${sessions.browser})`.as(
          "browsers",
        ),
        operatingSystems: sql<string[]>`ARRAY_AGG(DISTINCT ${sessions.os})`.as(
          "operating_systems",
        ),
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.websiteId, websiteId),
          inArray(sessions.visitorId, visitorIds),
        ),
      );

    const row = summaryRows[0];
    if (!row || !row.firstSeen) return null;

    // Resolve userId
    const identityRow = await this.db
      .select({ userId: visitorIdentities.userId })
      .from(visitorIdentities)
      .where(
        and(
          eq(visitorIdentities.websiteId, websiteId),
          inArray(visitorIdentities.visitorId, visitorIds),
        ),
      )
      .limit(1);

    const visitor: VisitorSummary = {
      visitorId,
      userId: identityRow[0]?.userId,
      firstSeen: String(row.firstSeen),
      lastSeen: String(row.lastSeen),
      totalSessions: Number(row.totalSessions),
      totalPageviews: Number(row.totalPageviews),
      totalEvents: Number(row.totalEvents),
      avgSessionDuration: Number(row.avgDuration),
      lastCountry: row.lastCountry || "",
      lastCity: row.lastCity || "",
      devices: (row.devices || []).filter(Boolean),
      browsers: (row.browsers || []).filter(Boolean),
      operatingSystems: (row.operatingSystems || []).filter(Boolean),
    };

    // Get device breakdown
    const deviceRows = await this.db
      .select({
        deviceType: sessions.deviceType,
        browser: sessions.browser,
        os: sessions.os,
        screenSize: sessions.screenSize,
        sessionCount: count().as("session_count"),
        lastSeen: sql<string>`MAX(${sessions.endedAt})`.as("last_seen"),
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.websiteId, websiteId),
          inArray(sessions.visitorId, visitorIds),
        ),
      )
      .groupBy(
        sessions.deviceType,
        sessions.browser,
        sessions.os,
        sessions.screenSize,
      )
      .orderBy(desc(count()));

    const devices: VisitorDevice[] = deviceRows.map((d) => ({
      deviceType: d.deviceType,
      browser: d.browser,
      os: d.os,
      screenSize: d.screenSize,
      sessions: Number(d.sessionCount),
      lastSeen: String(d.lastSeen),
    }));

    // Get activity heatmap (day-of-week × hour)
    const heatmapRows = await this.db
      .select({
        dayOfWeek: sql<number>`EXTRACT(DOW FROM ${pageEvents.timestamp})`.as(
          "day_of_week",
        ),
        hour: sql<number>`EXTRACT(HOUR FROM ${pageEvents.timestamp})`.as(
          "hour",
        ),
        eventCount: count().as("event_count"),
      })
      .from(pageEvents)
      .where(
        and(
          eq(pageEvents.websiteId, websiteId),
          inArray(pageEvents.visitorId, visitorIds),
          gte(pageEvents.timestamp, dateRange.from),
          lte(pageEvents.timestamp, dateRange.to),
        ),
      )
      .groupBy(
        sql`EXTRACT(DOW FROM ${pageEvents.timestamp})`,
        sql`EXTRACT(HOUR FROM ${pageEvents.timestamp})`,
      );

    const activityHeatmap: ActivityHeatmapPoint[] = heatmapRows.map((h) => ({
      dayOfWeek: Number(h.dayOfWeek),
      hour: Number(h.hour),
      count: Number(h.eventCount),
    }));

    // Get recent sessions with journey steps
    const recentSessions = await this.getVisitorSessions(
      websiteId,
      visitorId,
      dateRange,
      20,
    );

    return { visitor, devices, recentSessions, activityHeatmap };
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

    // Build a match condition for each step
    const stepConditions = steps.map((step) => {
      const column =
        step.matchType === "event_name" ? "event_name" : "url_path";
      switch (step.matchOperator) {
        case "contains":
          return `${column} LIKE '%' || $\{step.matchValue} || '%'`;
        case "starts_with":
          return `${column} LIKE $\{step.matchValue} || '%'`;
        default:
          return `${column} = $\{step.matchValue}`;
      }
    });

    // Use raw SQL for the funnel query — finds visitors who completed steps in order
    // Strategy: For each visitor, get ordered events, then check sequential step completion
    const filterConditions = this.buildEventFilters(filters);
    const baseWhere = and(
      eq(pageEvents.websiteId, websiteId),
      gte(pageEvents.timestamp, dateRange.from),
      lte(pageEvents.timestamp, dateRange.to),
      ...filterConditions,
    );

    // Get all matching events per visitor, ordered by timestamp
    // Then check funnel progression in application code for correctness
    const events = await this.db
      .select({
        visitorId: pageEvents.visitorId,
        eventName: pageEvents.eventName,
        urlPath: pageEvents.urlPath,
        timestamp: pageEvents.timestamp,
      })
      .from(pageEvents)
      .where(baseWhere)
      .orderBy(asc(pageEvents.timestamp));

    // Group events by visitor
    const visitorEvents = new Map<
      string,
      { eventName: string; urlPath: string; timestamp: Date }[]
    >();
    for (const ev of events) {
      const list = visitorEvents.get(ev.visitorId) ?? [];
      list.push(ev);
      visitorEvents.set(ev.visitorId, list);
    }

    // For each visitor, find how many funnel steps they completed (in order)
    const stepCounts = new Array<number>(steps.length).fill(0);
    const totalVisitors = visitorEvents.size;

    for (const [, evList] of visitorEvents) {
      let stepIdx = 0;
      for (const ev of evList) {
        if (stepIdx >= steps.length) break;
        if (matchesStep(steps[stepIdx], ev)) {
          stepCounts[stepIdx]++;
          stepIdx++;
        }
      }
    }

    const stepResults: FunnelStepResult[] = steps.map((step, i) => ({
      name: step.name,
      visitors: stepCounts[i],
      conversionRate:
        totalVisitors > 0 ? (stepCounts[i] / totalVisitors) * 100 : 0,
      dropoffRate:
        i === 0
          ? totalVisitors > 0
            ? ((totalVisitors - stepCounts[0]) / totalVisitors) * 100
            : 0
          : stepCounts[i - 1] > 0
            ? ((stepCounts[i - 1] - stepCounts[i]) / stepCounts[i - 1]) * 100
            : 0,
    }));

    const convertedVisitors = stepCounts[steps.length - 1] ?? 0;

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
    const { websiteId, dateRange, granularity } = query;

    // Validate granularity to prevent SQL injection (embedded in query string)
    const validGranularities: CohortGranularity[] = ["day", "week", "month"];
    if (!validGranularities.includes(granularity)) {
      return { granularity, cohorts: [] };
    }

    // Build the period offset expression based on granularity
    const periodOffsetExpr =
      granularity === "day"
        ? "EXTRACT(DAY FROM va.activity_period - vc.cohort_start)::int"
        : granularity === "week"
          ? "(EXTRACT(DAY FROM va.activity_period - vc.cohort_start) / 7)::int"
          : "(EXTRACT(YEAR FROM va.activity_period) * 12 + EXTRACT(MONTH FROM va.activity_period)) - (EXTRACT(YEAR FROM vc.cohort_start) * 12 + EXTRACT(MONTH FROM vc.cohort_start))";

    // Use client.unsafe() with parameterized values ($1, $2, $3) for data safety
    // Granularity is embedded directly since it's validated above
    const rows = await this.client.unsafe(
      `
      WITH visitor_cohort AS (
        SELECT
          visitor_id,
          date_trunc('${granularity}', MIN(timestamp)) AS cohort_start
        FROM analytics.page_events
        WHERE website_id = $1
          AND event_name = 'pageview'
          AND timestamp >= $2
          AND timestamp <= $3
        GROUP BY visitor_id
      ),
      visitor_activity AS (
        SELECT DISTINCT
          visitor_id,
          date_trunc('${granularity}', timestamp) AS activity_period
        FROM analytics.page_events
        WHERE website_id = $1
          AND event_name = 'pageview'
          AND timestamp >= $2
          AND timestamp <= $3
      ),
      retention_data AS (
        SELECT
          vc.cohort_start,
          ${periodOffsetExpr} AS period_offset,
          COUNT(DISTINCT va.visitor_id) AS visitors
        FROM visitor_cohort vc
        JOIN visitor_activity va ON vc.visitor_id = va.visitor_id
        GROUP BY vc.cohort_start, period_offset
      )
      SELECT
        cohort_start,
        period_offset,
        visitors
      FROM retention_data
      ORDER BY cohort_start, period_offset
      `,
      [websiteId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    );

    // Process rows into RetentionCohort structure
    const cohortMap = new Map<
      string,
      { visitors: number; periods: Map<number, number> }
    >();

    for (const row of rows as unknown as Array<{
      cohort_start: string;
      period_offset: number;
      visitors: string;
    }>) {
      const cohortDate = new Date(row.cohort_start).toISOString();
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

      cohorts.push({ date, visitors: data.visitors, retention });
    }

    return { granularity, cohorts };
  }

  private mapEventToRow(event: PageEvent) {
    return {
      websiteId: event.websiteId,
      sessionId: event.sessionId,
      visitorId: event.visitorId,
      timestamp: event.timestamp,
      eventName: event.eventName,
      urlPath: event.urlPath,
      urlQuery: event.urlQuery || "",
      referrerPath: event.referrerPath || "",
      referrerDomain: event.referrerDomain || "",
      utmSource: event.utmSource || "",
      utmMedium: event.utmMedium || "",
      utmCampaign: event.utmCampaign || "",
      utmContent: event.utmContent || "",
      utmTerm: event.utmTerm || "",
      country: event.country || "",
      region: event.region || "",
      city: event.city || "",
      browser: event.browser || "",
      browserVersion: event.browserVersion || "",
      os: event.os || "",
      osVersion: event.osVersion || "",
      deviceType: event.deviceType || "desktop",
      screenSize: event.screenSize || "",
      pageTitle: event.pageTitle || "",
      hostname: event.hostname || "",
      customData: event.customData || null,
    };
  }
}

/** Check if an event matches a funnel step definition */
function matchesStep(
  step: FunnelQuery["steps"][number],
  event: { eventName: string; urlPath: string },
): boolean {
  const field =
    step.matchType === "event_name" ? event.eventName : event.urlPath;
  switch (step.matchOperator) {
    case "contains":
      return field.includes(step.matchValue);
    case "starts_with":
      return field.startsWith(step.matchValue);
    default:
      return field === step.matchValue;
  }
}
