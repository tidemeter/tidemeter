import { notFound } from "next/navigation";
import { requireWebsitePageAccess } from "@/lib/websites";
import { getAnalyticsRepository } from "@/lib/analytics";
import { inferInterval } from "@/lib/utils/date";
import { AnalyticsOverview } from "@/components/analytics/overview";
import type { BreakdownProperty, StatsFilter } from "@tidemeter/analytics";

interface Props {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<{ from?: string; to?: string; filters?: string }>;
}

const BREAKDOWN_PROPERTIES: BreakdownProperty[] = [
  "url_path",
  "entry_page",
  "exit_page",
  "referrer_domain",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "country",
  "region",
  "city",
  "browser",
  "os",
  "device_type",
  "screen_size",
];

const VALID_FILTER_OPERATORS = new Set(["eq", "neq", "contains"]);
const VALID_FILTER_PROPERTIES = new Set([
  "url_path",
  "referrer_domain",
  "country",
  "region",
  "city",
  "browser",
  "browser_version",
  "os",
  "os_version",
  "device_type",
  "screen_size",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "entry_page",
  "exit_page",
  "hostname",
  "page_title",
]);

function getDateRange(sp: { from?: string; to?: string }) {
  const to = sp.to ? new Date(sp.to) : new Date();
  const from = sp.from
    ? new Date(sp.from)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}

function getPreviousPeriod(dateRange: { from: Date; to: Date }) {
  const durationMs = dateRange.to.getTime() - dateRange.from.getTime();
  return {
    from: new Date(dateRange.from.getTime() - durationMs),
    to: new Date(dateRange.from.getTime()),
  };
}

function parseFiltersFromParam(filtersParam?: string): StatsFilter[] {
  if (!filtersParam) return [];
  try {
    const parsed = JSON.parse(filtersParam);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((f: unknown): f is StatsFilter => {
      if (!f || typeof f !== "object") return false;
      const candidate = f as Record<string, unknown>;
      return (
        typeof candidate.property === "string" &&
        typeof candidate.operator === "string" &&
        typeof candidate.value === "string" &&
        VALID_FILTER_PROPERTIES.has(candidate.property) &&
        VALID_FILTER_OPERATORS.has(candidate.operator)
      );
    });
  } catch {
    return [];
  }
}

export default async function WebsiteAnalyticsPage({
  params,
  searchParams,
}: Props) {
  const { websiteId: websiteParam } = await params;
  const sp = await searchParams;

  // Authenticate and authorize: resolves the public tracking id (or legacy
  // numeric id) and verifies the user may access this website.
  const access = await requireWebsitePageAccess(websiteParam);
  if (!access) notFound();
  // Numeric id for analytics queries; public id for client-side links/APIs.
  const { website, numericId: websiteId, publicId } = access;

  const dateRange = getDateRange(sp);
  const previousDateRange = getPreviousPeriod(dateRange);
  const filters = parseFiltersFromParam(sp.filters);
  const repo = await getAnalyticsRepository();
  const interval = inferInterval(dateRange);

  const query = { websiteId, dateRange, filters };
  const previousQuery = { websiteId, dateRange: previousDateRange, filters };

  const [
    stats,
    previousStats,
    timeSeries,
    previousTimeSeries,
    activeVisitors,
    ...breakdowns
  ] = await Promise.all([
    repo.getStats(query),
    repo.getStats(previousQuery),
    repo.getTimeSeries(query, interval),
    repo.getTimeSeries(previousQuery, interval),
    repo.getActiveVisitors(websiteId),
    ...BREAKDOWN_PROPERTIES.map((property) =>
      repo.getBreakdown(query, property, 10),
    ),
  ]);

  const breakdownMap = Object.fromEntries(
    BREAKDOWN_PROPERTIES.map((prop, i) => [prop, breakdowns[i]]),
  ) as Record<BreakdownProperty, Awaited<ReturnType<typeof repo.getBreakdown>>>;

  return (
    <AnalyticsOverview
      websiteId={publicId}
      websiteName={website.name as string}
      dateRange={{
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      }}
      stats={stats}
      previousStats={previousStats}
      timeSeries={timeSeries}
      previousTimeSeries={previousTimeSeries}
      breakdowns={breakdownMap}
      activeVisitors={activeVisitors}
      filters={filters}
    />
  );
}
