"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  StatCard,
} from "@tidemeter/ui";
import { TimeSeriesChart } from "@/components/analytics/time-series-chart";
import type {
  StatsResult,
  TimeSeriesResult,
  BreakdownResult,
} from "@tidemeter/analytics";

interface SharedDashboardProps {
  shareId: string;
  period: string;
  website: { name: string; domain: string };
  stats: StatsResult;
  timeSeries: TimeSeriesResult;
  pages: BreakdownResult;
  referrers: BreakdownResult;
}

type Period = "today" | "7d" | "30d" | "12mo";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "12mo", label: "12 Months" },
];

interface BreakdownItem {
  value: string;
  visitors: number;
  percentage: number;
}

function SimpleBreakdown({
  title,
  data,
}: {
  title: string;
  data: BreakdownItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            No data
          </p>
        ) : (
          <div className="space-y-1">
            {data.map((item) => (
              <div
                key={item.value}
                className="group relative flex items-center justify-between rounded-md px-3 py-2"
              >
                <div
                  className="absolute inset-0 rounded-md bg-primary-50 dark:bg-primary-500/10"
                  style={{ width: `${Math.max(item.percentage * 100, 2)}%` }}
                />
                <span className="relative z-10 truncate text-sm text-gray-700 dark:text-gray-300">
                  {item.value || "(direct)"}
                </span>
                <span className="relative z-10 ml-2 shrink-0 text-sm font-medium tabular-nums text-gray-900 dark:text-white">
                  {item.visitors}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SharedDashboard({
  shareId,
  period,
  website,
  stats,
  timeSeries,
  pages,
  referrers,
}: SharedDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handlePeriodChange(newPeriod: Period) {
    router.push(`${pathname}?period=${newPeriod}`);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {website.name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {website.domain}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePeriodChange(p.value)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                period === p.value
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Visitors" value={stats.visitors} />
        <StatCard title="Page Views" value={stats.pageviews} />
        <StatCard title="Sessions" value={stats.sessions} />
        <StatCard
          title="Bounce Rate"
          value={`${Math.round((stats.bounceRate ?? 0) * 100)}%`}
        />
      </div>

      {/* Time Series */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Traffic</CardTitle>
        </CardHeader>
        <CardContent>
          <TimeSeriesChart data={timeSeries.data} isLoading={false} />
        </CardContent>
      </Card>

      {/* Breakdowns */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SimpleBreakdown title="Top Pages" data={pages.data} />
        <SimpleBreakdown title="Top Referrers" data={referrers.data} />
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
        Powered by <span className="font-medium">TideMeter</span> —
        Privacy-focused web analytics for developers
      </p>
    </div>
  );
}
