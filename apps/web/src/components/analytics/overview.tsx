"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  StatCard,
  DateRangePicker,
  Button,
  type DateRange,
} from "@tidemeter/ui";
import { TimeSeriesChart } from "./time-series-chart";
import { BreakdownTabs } from "./breakdown-tabs";
import { FilterBar } from "./filter-bar";

import { formatNumber, formatDuration } from "@/lib/utils/date";
import type {
  StatsResult,
  TimeSeriesResult,
  BreakdownResult,
  BreakdownProperty,
  StatsFilter,
} from "@tidemeter/analytics";

interface AnalyticsOverviewProps {
  websiteId: string;
  websiteName: string;
  dateRange: { from: string; to: string };
  stats: StatsResult;
  previousStats: StatsResult;
  timeSeries: TimeSeriesResult;
  previousTimeSeries: TimeSeriesResult;
  breakdowns: Record<BreakdownProperty, BreakdownResult>;
  activeVisitors: number;
  filters: StatsFilter[];
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
      {children}
    </h2>
  );
}

function calcChange(current: number, previous: number): number | undefined {
  if (previous === 0 && current === 0) return undefined;
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

function ActiveVisitorsBadge({
  websiteId,
  initial,
}: {
  websiteId: string;
  initial: number;
}) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/stats/${websiteId}/active`);
        if (res.ok) {
          const data = await res.json();
          setCount(data.active);
        }
      } catch {
        // silently fail
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [websiteId]);

  return (
    <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 dark:border-emerald-800/50 dark:bg-emerald-500/10">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
        {count}
      </span>
      <span className="text-xs text-emerald-600 dark:text-emerald-500">
        current {count === 1 ? "visitor" : "visitors"}
      </span>
    </div>
  );
}

export function AnalyticsOverview({
  websiteId,
  websiteName,
  dateRange,
  stats,
  previousStats,
  timeSeries,
  previousTimeSeries,
  breakdowns,
  activeVisitors,
  filters,
}: AnalyticsOverviewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentRange: DateRange = useMemo(
    () => ({
      from: new Date(dateRange.from),
      to: new Date(dateRange.to),
      label:
        searchParams.get("label") ||
        (searchParams.get("from") ? "Custom" : "Last 30 days"),
    }),
    [dateRange.from, dateRange.to, searchParams],
  );

  const buildUrl = useCallback(
    (
      overrides: {
        dateRange?: { from: Date; to: Date };
        newFilters?: StatsFilter[];
      } = {},
    ) => {
      const params = new URLSearchParams();
      const range = overrides.dateRange ?? currentRange;
      params.set("from", range.from.toISOString());
      params.set("to", range.to.toISOString());
      const label = overrides.dateRange ? "" : currentRange.label;
      if (label) params.set("label", label);
      const f = overrides.newFilters ?? filters;
      if (f.length > 0) {
        params.set("filters", JSON.stringify(f));
      }
      return `${pathname}?${params.toString()}`;
    },
    [pathname, currentRange, filters],
  );

  function handleDateChange(range: DateRange) {
    const params = new URLSearchParams();
    params.set("from", range.from.toISOString());
    params.set("to", range.to.toISOString());
    params.set("label", range.label);
    const f = filters;
    if (f.length > 0) {
      params.set("filters", JSON.stringify(f));
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleFiltersChange(newFilters: StatsFilter[]) {
    router.push(buildUrl({ newFilters }));
  }

  function handleFilterFromBreakdown(property: string, value: string) {
    if (!value) return;
    // Don't add duplicate
    const exists = filters.some(
      (f) =>
        f.property === property && f.value === value && f.operator === "eq",
    );
    if (exists) return;
    const newFilters: StatsFilter[] = [
      ...filters,
      { property, operator: "eq", value },
    ];
    router.push(buildUrl({ newFilters }));
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {websiteName}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Analytics Dashboard
            </p>
          </div>
          <ActiveVisitorsBadge websiteId={websiteId} initial={activeVisitors} />
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/${websiteId}/visitors`}>
            <Button variant="secondary" size="sm">
              <svg
                className="mr-1.5 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
              User Journeys
            </Button>
          </Link>
          <Link href={`/${websiteId}/funnels`}>
            <Button variant="secondary" size="sm">
              <svg
                className="mr-1.5 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
                />
              </svg>
              Funnels
            </Button>
          </Link>
          <Link href={`/${websiteId}/retention`}>
            <Button variant="secondary" size="sm">
              <svg
                className="mr-1.5 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
              Retention
            </Button>
          </Link>
          <DateRangePicker value={currentRange} onChange={handleDateChange} />
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar filters={filters} onFiltersChange={handleFiltersChange} />

      {/* Key metrics — 6 stat cards with comparison */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Unique Visitors"
          value={formatNumber(stats.visitors)}
          change={calcChange(stats.visitors, previousStats.visitors)}
        />
        <StatCard
          title="Total Pageviews"
          value={formatNumber(stats.pageviews)}
          change={calcChange(stats.pageviews, previousStats.pageviews)}
        />
        <StatCard
          title="Sessions"
          value={formatNumber(stats.sessions)}
          change={calcChange(stats.sessions, previousStats.sessions)}
        />
        <StatCard
          title="Views / Visit"
          value={stats.viewsPerVisit.toFixed(1)}
          change={calcChange(stats.viewsPerVisit, previousStats.viewsPerVisit)}
        />
        <StatCard
          title="Bounce Rate"
          value={`${(stats.bounceRate * 100).toFixed(1)}%`}
          change={
            previousStats.bounceRate > 0
              ? calcChange(stats.bounceRate, previousStats.bounceRate)
              : undefined
          }
        />
        <StatCard
          title="Avg. Duration"
          value={formatDuration(stats.avgDuration)}
          change={calcChange(stats.avgDuration, previousStats.avgDuration)}
        />
      </div>

      {/* Time series chart */}
      <div className="space-y-3">
        <SectionHeader>Traffic Over Time</SectionHeader>
        <TimeSeriesChart
          data={timeSeries.data}
          previousData={previousTimeSeries.data}
          isLoading={false}
        />
      </div>

      {/* Tabbed breakdown panels */}
      <div className="space-y-3">
        <SectionHeader>Breakdowns</SectionHeader>
        <BreakdownTabs
          breakdowns={breakdowns}
          onFilterAdd={handleFilterFromBreakdown}
        />
      </div>
    </div>
  );
}
