/**
 * Core types for the TideMeter analytics data layer.
 */

export interface PageEvent {
  id?: string;
  websiteId: string;
  sessionId: string;
  visitorId: string;
  timestamp: Date;
  eventName: string; // 'pageview' or custom event name
  urlPath: string;
  urlQuery: string;
  referrerPath: string;
  referrerDomain: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  country: string;
  region: string;
  city: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: string; // 'desktop' | 'mobile' | 'tablet'
  screenSize: string;
  pageTitle: string;
  hostname: string;
  customData?: Record<string, string | number | boolean>;
}

export interface Session {
  id: string;
  websiteId: string;
  visitorId: string;
  startedAt: Date;
  endedAt: Date;
  duration: number;
  entryPage: string;
  exitPage: string;
  pageviews: number;
  events: number;
  isBounce: boolean;
  referrerDomain: string;
  referrerPath: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  country: string;
  region: string;
  city: string;
  browser: string;
  os: string;
  deviceType: string;
  screenSize: string;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface StatsFilter {
  property: string;
  operator: "eq" | "neq" | "contains";
  value: string;
}

export interface StatsQuery {
  websiteId: string;
  dateRange: DateRange;
  filters?: StatsFilter[];
}

export interface StatsResult {
  visitors: number;
  pageviews: number;
  sessions: number;
  bounceRate: number;
  avgDuration: number;
  viewsPerVisit: number;
}

export interface TimeSeriesPoint {
  date: string;
  visitors: number;
  pageviews: number;
  sessions: number;
}

export type TimeInterval = "hour" | "day" | "week" | "month";

export interface TimeSeriesResult {
  data: TimeSeriesPoint[];
  interval: TimeInterval;
}

export interface BreakdownItem {
  value: string;
  visitors: number;
  pageviews: number;
  percentage: number;
}

export type BreakdownProperty =
  | "url_path"
  | "referrer_domain"
  | "country"
  | "region"
  | "city"
  | "browser"
  | "browser_version"
  | "os"
  | "os_version"
  | "device_type"
  | "screen_size"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_content"
  | "utm_term"
  | "entry_page"
  | "exit_page"
  | "hostname"
  | "page_title";

export interface BreakdownResult {
  property: BreakdownProperty;
  data: BreakdownItem[];
  total: number;
}

// ── User Journey Types ──────────────────────────────────────────────

// ── Funnel Types ────────────────────────────────────────────────────

/** A single step definition in a funnel */
export interface FunnelStepDefinition {
  name: string;
  matchType: "url_path" | "event_name";
  matchOperator: "equals" | "contains" | "starts_with";
  matchValue: string;
}

/** Query input for funnel analysis */
export interface FunnelQuery {
  websiteId: string;
  dateRange: DateRange;
  steps: FunnelStepDefinition[];
  filters?: StatsFilter[];
}

/** Result for a single step in a funnel */
export interface FunnelStepResult {
  name: string;
  visitors: number;
  conversionRate: number; // percentage relative to step 1
  dropoffRate: number; // percentage that dropped off from previous step
}

/** Full funnel analysis result */
export interface FunnelResult {
  totalVisitors: number;
  convertedVisitors: number;
  overallConversionRate: number;
  steps: FunnelStepResult[];
}

// ── Retention / Cohort Types ────────────────────────────────────────

export type CohortGranularity = "day" | "week" | "month";

/** Query input for cohort retention analysis */
export interface RetentionQuery {
  websiteId: string;
  dateRange: DateRange;
  granularity: CohortGranularity;
  filters?: StatsFilter[];
}

/** A single cell in the retention grid */
export interface RetentionCell {
  period: number; // 0 = cohort period itself, 1 = first return period, etc.
  visitors: number;
  percentage: number; // % of cohort that returned
}

/** A single cohort row */
export interface RetentionCohort {
  date: string; // cohort start date (ISO string)
  visitors: number; // total visitors in this cohort
  retention: RetentionCell[];
}

/** Full retention/cohort analysis result */
export interface RetentionResult {
  granularity: CohortGranularity;
  cohorts: RetentionCohort[];
}

// ── User Journey Types ──────────────────────────────────────────────

/** Aggregated visitor profile for the visitor list */
export interface VisitorSummary {
  visitorId: string;
  userId?: string;
  firstSeen: string;
  lastSeen: string;
  totalSessions: number;
  totalPageviews: number;
  totalEvents: number;
  avgSessionDuration: number;
  lastCountry: string;
  lastCity: string;
  devices: string[];
  browsers: string[];
  operatingSystems: string[];
}

/** Paginated result for visitor list */
export interface VisitorListResult {
  data: VisitorSummary[];
  total: number;
  page: number;
  pageSize: number;
}

/** A single session belonging to a visitor, with its journey steps */
export interface VisitorSession {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  duration: number;
  entryPage: string;
  exitPage: string;
  pageviews: number;
  events: number;
  isBounce: boolean;
  referrerDomain: string;
  utmSource: string;
  country: string;
  city: string;
  browser: string;
  os: string;
  deviceType: string;
  screenSize: string;
  steps: JourneyStep[];
}

/** A single step in a user journey (one page event within a session) */
export interface JourneyStep {
  timestamp: string;
  eventName: string;
  urlPath: string;
  pageTitle: string;
  referrerPath: string;
  duration: number; // seconds spent on this step (0 for last)
  customData?: Record<string, string | number | boolean>;
}

/** Activity counts grouped by day-of-week (0-6) and hour (0-23) for heatmap */
export interface ActivityHeatmapPoint {
  dayOfWeek: number;
  hour: number;
  count: number;
}

/** Devices used by a single visitor */
export interface VisitorDevice {
  deviceType: string;
  browser: string;
  os: string;
  screenSize: string;
  sessions: number;
  lastSeen: string;
}

export interface VisitorProfileResult {
  visitor: VisitorSummary;
  devices: VisitorDevice[];
  recentSessions: VisitorSession[];
  activityHeatmap: ActivityHeatmapPoint[];
}

export interface AnalyticsRepository {
  // Write operations
  insertEvent(event: PageEvent): Promise<void>;
  insertEvents(events: PageEvent[]): Promise<void>;
  upsertSession(session: Session): Promise<void>;

  // Read operations
  getStats(query: StatsQuery): Promise<StatsResult>;
  getTimeSeries(
    query: StatsQuery,
    interval: TimeInterval,
  ): Promise<TimeSeriesResult>;
  getBreakdown(
    query: StatsQuery,
    property: BreakdownProperty,
    limit?: number,
  ): Promise<BreakdownResult>;
  getActiveVisitors(websiteId: string, minutes?: number): Promise<number>;

  // User journey operations
  linkVisitorIdentity(
    websiteId: string,
    visitorId: string,
    userId: string,
  ): Promise<void>;
  getVisitors(
    websiteId: string,
    dateRange: DateRange,
    page: number,
    pageSize: number,
    search?: string,
  ): Promise<VisitorListResult>;
  getVisitorProfile(
    websiteId: string,
    visitorId: string,
    dateRange: DateRange,
  ): Promise<VisitorProfileResult | null>;
  getVisitorSessions(
    websiteId: string,
    visitorId: string,
    dateRange: DateRange,
    limit?: number,
  ): Promise<VisitorSession[]>;

  // Funnel analysis
  getFunnelResult(query: FunnelQuery): Promise<FunnelResult>;

  // Retention / Cohort analysis
  getRetention(query: RetentionQuery): Promise<RetentionResult>;

  // Lifecycle
  initialize(): Promise<void>;
  close(): Promise<void>;
}
