import type { TimeInterval, StatsFilter } from "@tidemeter/analytics";

export interface DateRange {
  from: Date;
  to: Date;
}

export function parseDateRange(searchParams: URLSearchParams): DateRange {
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const period = searchParams.get("period");

  if (fromStr && toStr) {
    return { from: new Date(fromStr), to: new Date(toStr) };
  }

  const to = new Date();

  switch (period) {
    case "today": {
      const from = new Date(to.getFullYear(), to.getMonth(), to.getDate());
      return { from, to };
    }
    case "7d":
      return { from: new Date(to.getTime() - 7 * 86400000), to };
    case "30d":
      return { from: new Date(to.getTime() - 30 * 86400000), to };
    case "12mo":
      return {
        from: new Date(to.getFullYear() - 1, to.getMonth(), to.getDate()),
        to,
      };
    default:
      return { from: new Date(to.getTime() - 30 * 86400000), to };
  }
}

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

export function parseFilters(searchParams: URLSearchParams): StatsFilter[] {
  const filters: StatsFilter[] = [];
  const filterParam = searchParams.get("filters");
  if (!filterParam) return filters;

  try {
    const parsed = JSON.parse(filterParam);
    if (!Array.isArray(parsed)) return filters;
    for (const f of parsed) {
      if (
        typeof f.property === "string" &&
        typeof f.operator === "string" &&
        typeof f.value === "string" &&
        VALID_FILTER_PROPERTIES.has(f.property) &&
        VALID_FILTER_OPERATORS.has(f.operator)
      ) {
        filters.push({
          property: f.property,
          operator: f.operator as StatsFilter["operator"],
          value: f.value,
        });
      }
    }
  } catch {
    // Invalid JSON, return empty
  }
  return filters;
}

export function inferInterval(dateRange: DateRange): TimeInterval {
  const diffMs = dateRange.to.getTime() - dateRange.from.getTime();
  const diffDays = diffMs / 86400000;

  if (diffDays <= 1) return "hour";
  if (diffDays <= 90) return "day";
  if (diffDays <= 365) return "week";
  return "month";
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
