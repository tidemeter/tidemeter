"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  BarChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card } from "@tidemeter/ui";

interface TimeSeriesPoint {
  date: string;
  visitors: number;
  pageviews: number;
  sessions: number;
}

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  previousData?: TimeSeriesPoint[];
  isLoading: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ChartSkeleton() {
  // Use deterministic heights to prevent server/client hydration mismatch
  const heights = [63, 76, 36, 71, 47, 54, 61, 75, 75, 40, 63, 60];
  return (
    <Card className="h-80 p-6">
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-end gap-4 h-full pb-6">
          {heights.map((h, i) => (
            <div
              key={i}
              className="skeleton flex-1 rounded-sm"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="skeleton h-3 w-full rounded" />
      </div>
    </Card>
  );
}

interface ComparisonTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ payload?: Record<string, unknown> }>;
}

function ComparisonTooltip({
  active,
  payload,
  label,
}: ComparisonTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload as
    | {
        visitors?: number;
        pageviews?: number;
        prevVisitors?: number | null;
        prevPageviews?: number | null;
        prevDate?: string;
      }
    | undefined;
  if (!data) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] shadow-lg dark:border-gray-700 dark:bg-gray-900">
      <p className="mb-1 font-semibold text-gray-900 dark:text-white">
        {label ? formatDate(label) : null}
      </p>
      <p className="text-primary-500">
        Visitors: {data.visitors}
        {data.prevVisitors != null && (
          <span className="opacity-50"> vs {data.prevVisitors}</span>
        )}
      </p>
      <p className="text-violet-500">
        Pageviews: {data.pageviews}
        {data.prevPageviews != null && (
          <span className="opacity-50"> vs {data.prevPageviews}</span>
        )}
      </p>
      {data.prevDate && (
        <p className="mt-1 text-xs text-gray-400">
          Previous: {formatDate(data.prevDate)}
        </p>
      )}
    </div>
  );
}

type ChartStyle = "area" | "bar";

export function TimeSeriesChart({
  data,
  previousData,
  isLoading,
}: TimeSeriesChartProps) {
  const [mounted, setMounted] = useState(false);
  const [chartStyle, setChartStyle] = useState<ChartStyle>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("tm-chart-style") as ChartStyle) || "area";
    }
    return "area";
  });

  useEffect(() => {
    // Small delay to let the DOM settle before rendering Recharts
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  function switchStyle(style: ChartStyle) {
    setChartStyle(style);
    localStorage.setItem("tm-chart-style", style);
  }

  if (isLoading || !mounted) {
    return <ChartSkeleton />;
  }

  if (data.length === 0) {
    return (
      <Card className="flex h-80 items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No data yet
          </p>
        </div>
      </Card>
    );
  }

  const hasPrevious = previousData && previousData.length > 0;

  // Merge previous period data by index so both periods align on the same x-axis
  const chartData = data.map((point, i) => ({
    ...point,
    ...(hasPrevious && previousData[i]
      ? {
          prevVisitors: previousData[i].visitors,
          prevPageviews: previousData[i].pageviews,
          prevDate: previousData[i].date,
        }
      : {}),
  }));

  const tooltipConfig = hasPrevious
    ? { content: <ComparisonTooltip /> }
    : {
        contentStyle: {
          backgroundColor: "var(--tooltip-bg, #fff)",
          border: "1px solid var(--tooltip-border, #e5e7eb)",
          borderRadius: "0.75rem",
          fontSize: "0.8125rem",
          boxShadow: "0 4px 12px -1px rgb(0 0 0 / 0.1)",
          padding: "8px 12px",
        },
        labelFormatter: formatDate,
      };

  const xAxisProps = {
    dataKey: "date" as const,
    tickFormatter: formatDate,
    tick: { fontSize: 12, fill: "#94a3b8" },
    axisLine: false,
    tickLine: false,
  };

  const yAxisProps = {
    tick: { fontSize: 12, fill: "#94a3b8" },
    axisLine: false,
    tickLine: false,
    width: 40,
  };

  const gridProps = {
    strokeDasharray: "3 3",
    stroke: "#e5e7eb",
    vertical: false,
  };

  return (
    <Card className="animate-fade-in p-6">
      {/* Chart style toggle */}
      <div className="mb-4 flex items-center justify-end">
        <div className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800/60">
          <button
            type="button"
            onClick={() => switchStyle("area")}
            className={`rounded-md px-2 py-1.5 transition-all ${
              chartStyle === "area"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            title="Area chart"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2 17l4-5 4 3 4-6 4 3 4-4M2 17V7m0 10h20"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => switchStyle("bar")}
            className={`rounded-md px-2 py-1.5 transition-all ${
              chartStyle === "bar"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            title="Bar chart"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 21V13h4v8H3zm7 0V8h4v13h-4zm7 0V3h4v18h-4z"
              />
            </svg>
          </button>
        </div>
      </div>

      {chartStyle === "area" ? (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient
                id="pageviewsGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipConfig} />
            <Area
              type="monotone"
              dataKey="visitors"
              stroke="#3b82f6"
              fill="url(#visitorsGradient)"
              strokeWidth={2}
              name="Visitors"
              animationDuration={600}
            />
            <Area
              type="monotone"
              dataKey="pageviews"
              stroke="#8b5cf6"
              fill="url(#pageviewsGradient)"
              strokeWidth={2}
              name="Pageviews"
              animationDuration={600}
            />
            {hasPrevious && (
              <Area
                type="monotone"
                dataKey="prevVisitors"
                stroke="#3b82f6"
                fill="none"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                strokeOpacity={0.45}
                name="Prev. Visitors"
                animationDuration={600}
              />
            )}
            {hasPrevious && (
              <Area
                type="monotone"
                dataKey="prevPageviews"
                stroke="#8b5cf6"
                fill="none"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                strokeOpacity={0.45}
                name="Prev. Pageviews"
                animationDuration={600}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} barGap={2}>
            <defs>
              <linearGradient id="visitorsBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="pageviewsBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipConfig} />
            <Bar
              dataKey="visitors"
              fill="url(#visitorsBarGrad)"
              radius={[4, 4, 0, 0]}
              name="Visitors"
              animationDuration={600}
            />
            <Bar
              dataKey="pageviews"
              fill="url(#pageviewsBarGrad)"
              radius={[4, 4, 0, 0]}
              name="Pageviews"
              animationDuration={600}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
