"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  DateRangePicker,
  cn,
  type DateRange,
} from "@tidemeter/ui";
import type {
  RetentionResult,
  RetentionCohort,
  CohortGranularity,
} from "@tidemeter/analytics";

// ── Types ────────────────────────────────────────────────────────────

interface RetentionPageProps {
  websiteId: string;
  websiteName: string;
  dateRange: { from: string; to: string };
}

// ── Retention Grid ───────────────────────────────────────────────────

function getRetentionColor(percentage: number): string {
  if (percentage >= 80) return "bg-blue-600 text-white";
  if (percentage >= 60) return "bg-blue-500 text-white";
  if (percentage >= 40) return "bg-blue-400 text-white";
  if (percentage >= 25) return "bg-blue-300 text-gray-900";
  if (percentage >= 15) return "bg-blue-200 text-gray-900";
  if (percentage >= 5) return "bg-blue-100 text-gray-700";
  if (percentage > 0) return "bg-blue-50 text-gray-600";
  return "bg-gray-50 text-gray-400 dark:bg-gray-800/50 dark:text-gray-600";
}

function formatCohortDate(
  isoDate: string,
  granularity: CohortGranularity,
): string {
  const date = new Date(isoDate);
  if (granularity === "month") {
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function periodLabel(period: number, granularity: CohortGranularity): string {
  if (period === 0)
    return granularity === "day"
      ? "Day 0"
      : granularity === "week"
        ? "Week 0"
        : "Month 0";
  return granularity === "day"
    ? `Day ${period}`
    : granularity === "week"
      ? `Wk ${period}`
      : `Mo ${period}`;
}

function RetentionGrid({ data }: { data: RetentionResult }) {
  if (data.cohorts.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        No retention data for this period.
      </div>
    );
  }

  // Find the max number of periods across all cohorts
  const maxPeriods = Math.max(
    ...data.cohorts.map((c) =>
      c.retention.length > 0
        ? Math.max(...c.retention.map((r) => r.period))
        : 0,
    ),
  );
  const periods = Array.from({ length: maxPeriods + 1 }, (_, i) => i);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium text-gray-500 dark:bg-gray-950 dark:text-gray-400">
              Cohort
            </th>
            <th className="bg-white px-3 py-2 text-right font-medium text-gray-500 dark:bg-gray-950 dark:text-gray-400">
              Users
            </th>
            {periods.map((p) => (
              <th
                key={p}
                className="bg-white px-2 py-2 text-center font-medium text-gray-500 dark:bg-gray-950 dark:text-gray-400"
              >
                {periodLabel(p, data.granularity)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.cohorts.map((cohort) => {
            const retentionMap = new Map(
              cohort.retention.map((r) => [r.period, r]),
            );

            return (
              <tr
                key={cohort.date}
                className="border-t border-gray-100 dark:border-gray-800"
              >
                <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium text-gray-700 whitespace-nowrap dark:bg-gray-950 dark:text-gray-300">
                  {formatCohortDate(cohort.date, data.granularity)}
                </td>
                <td className="px-3 py-1.5 text-right font-medium text-gray-600 tabular-nums dark:text-gray-400">
                  {cohort.visitors.toLocaleString()}
                </td>
                {periods.map((p) => {
                  const cell = retentionMap.get(p);
                  // No cell at all means the cohort hasn't reached that period
                  if (!cell) {
                    return (
                      <td key={p} className="px-1 py-1">
                        <div className="h-8 rounded" />
                      </td>
                    );
                  }

                  return (
                    <td key={p} className="px-1 py-1">
                      <div
                        className={cn(
                          "flex h-8 min-w-[48px] items-center justify-center rounded text-[11px] font-medium tabular-nums",
                          getRetentionColor(cell.percentage),
                        )}
                        title={`${cell.visitors.toLocaleString()} visitors (${cell.percentage.toFixed(1)}%)`}
                      >
                        {cell.percentage.toFixed(1)}%
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Summary Stats ────────────────────────────────────────────────────

function RetentionSummary({ data }: { data: RetentionResult }) {
  if (data.cohorts.length === 0) return null;

  // Calculate average retention for key periods
  const periodAverages = new Map<number, { sum: number; count: number }>();
  for (const cohort of data.cohorts) {
    for (const cell of cohort.retention) {
      if (cell.period === 0) continue; // Skip period 0 (always 100%)
      const entry = periodAverages.get(cell.period) ?? { sum: 0, count: 0 };
      entry.sum += cell.percentage;
      entry.count++;
      periodAverages.set(cell.period, entry);
    }
  }

  // Show key milestones based on granularity
  const milestones =
    data.granularity === "day"
      ? [1, 7, 14, 30]
      : data.granularity === "week"
        ? [1, 2, 4, 8, 12]
        : [1, 3, 6, 12];

  const stats = milestones
    .map((period) => {
      const entry = periodAverages.get(period);
      if (!entry || entry.count === 0) return null;
      return {
        period,
        label:
          data.granularity === "day"
            ? `Day ${period}`
            : data.granularity === "week"
              ? `Week ${period}`
              : `Month ${period}`,
        avg: entry.sum / entry.count,
      };
    })
    .filter(Boolean) as Array<{ period: number; label: string; avg: number }>;

  if (stats.length === 0) return null;

  return (
    <div className="grid auto-cols-fr grid-flow-col gap-3">
      {stats.map((stat) => (
        <div
          key={stat.period}
          className="rounded-lg border border-gray-200/80 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950"
        >
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {stat.label} Retention
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums dark:text-white">
            {stat.avg.toFixed(1)}%
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Granularity Picker ───────────────────────────────────────────────

function GranularityPicker({
  value,
  onChange,
}: {
  value: CohortGranularity;
  onChange: (g: CohortGranularity) => void;
}) {
  const options: { value: CohortGranularity; label: string }[] = [
    { value: "day", label: "Daily" },
    { value: "week", label: "Weekly" },
    { value: "month", label: "Monthly" },
  ];

  return (
    <div className="inline-flex rounded-lg border border-gray-200/80 bg-white dark:border-gray-700 dark:bg-gray-800">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg",
            value === opt.value
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────

function RetentionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
          />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────

export function RetentionPage({
  websiteId,
  websiteName,
  dateRange: initialDateRange,
}: RetentionPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [granularity, setGranularity] = useState<CohortGranularity>(
    (searchParams.get("granularity") as CohortGranularity) || "week",
  );
  const [data, setData] = useState<RetentionResult | null>(null);
  const [loading, setLoading] = useState(true);

  const currentRange: DateRange = {
    from: new Date(initialDateRange.from),
    to: new Date(initialDateRange.to),
    label: searchParams.get("label") || "Last 90 days",
  };

  const fetchRetention = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: currentRange.from.toISOString(),
        to: currentRange.to.toISOString(),
        granularity,
      });
      const res = await fetch(
        `/api/stats/${websiteId}/retention?${params.toString()}`,
        { credentials: "include" },
      );
      if (res.ok) {
        const result: RetentionResult = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error("Failed to fetch retention data:", err);
    } finally {
      setLoading(false);
    }
  }, [
    websiteId,
    currentRange.from.getTime(),
    currentRange.to.getTime(),
    granularity,
  ]);

  useEffect(() => {
    fetchRetention();
  }, [fetchRetention]);

  const handleDateChange = useCallback(
    (range: DateRange) => {
      const params = new URLSearchParams();
      params.set("from", range.from.toISOString());
      params.set("to", range.to.toISOString());
      params.set("label", range.label);
      params.set("granularity", granularity);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, granularity],
  );

  const handleGranularityChange = useCallback(
    (g: CohortGranularity) => {
      setGranularity(g);
      const params = new URLSearchParams();
      params.set("from", currentRange.from.toISOString());
      params.set("to", currentRange.to.toISOString());
      params.set("label", currentRange.label);
      params.set("granularity", g);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, currentRange],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link
              href={`/${websiteId}?from=${currentRange.from.toISOString()}&to=${currentRange.to.toISOString()}`}
              className="hover:text-gray-700 dark:hover:text-gray-200"
            >
              {websiteName}
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">Retention</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            Cohort Retention
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <GranularityPicker
            value={granularity}
            onChange={handleGranularityChange}
          />
          <DateRangePicker value={currentRange} onChange={handleDateChange} />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <RetentionSkeleton />
      ) : data ? (
        <div className="space-y-6">
          <RetentionSummary data={data} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-blue-500"
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
                Retention Grid
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <RetentionGrid data={data} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          Failed to load retention data.
        </div>
      )}
    </div>
  );
}
