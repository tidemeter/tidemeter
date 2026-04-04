"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@tidemeter/ui";
import { cn } from "@tidemeter/ui";
import type { ActivityHeatmapPoint } from "@tidemeter/analytics";

interface ActivityHeatmapProps {
  data: ActivityHeatmapPoint[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0"),
);

function getIntensityClass(value: number, maxValue: number): string {
  if (value === 0) return "bg-gray-100 dark:bg-gray-800";
  const ratio = value / maxValue;
  if (ratio < 0.15) return "bg-blue-100 dark:bg-blue-900/30";
  if (ratio < 0.3) return "bg-blue-200 dark:bg-blue-800/40";
  if (ratio < 0.5) return "bg-blue-300 dark:bg-blue-700/50";
  if (ratio < 0.7) return "bg-blue-400 dark:bg-blue-600/60";
  if (ratio < 0.85) return "bg-blue-500 dark:bg-blue-500/70";
  return "bg-blue-600 dark:bg-blue-400/80";
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // Build a 7×24 grid from the data
  const grid: number[][] = Array.from({ length: 7 }, () =>
    new Array(24).fill(0),
  );
  let maxValue = 0;

  for (const point of data) {
    const day = point.dayOfWeek;
    const hour = point.hour;
    if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
      grid[day][hour] = point.count;
      if (point.count > maxValue) maxValue = point.count;
    }
  }

  const totalEvents = data.reduce((sum, p) => sum + p.count, 0);

  // Find the most active day and hour
  let peakDay = 0;
  let peakHour = 0;
  let peakValue = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (grid[d][h] > peakValue) {
        peakValue = grid[d][h];
        peakDay = d;
        peakHour = h;
      }
    }
  }

  if (totalEvents === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16">
        <svg
          className="h-10 w-10 text-gray-300 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
          />
        </svg>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No activity data to display.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
        Activity Heatmap
      </h2>

      {/* Peak info */}
      <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-300">
        <span>
          Most active:{" "}
          <span className="font-semibold">
            {DAY_LABELS[peakDay]}s at {HOUR_LABELS[peakHour]}:00
          </span>
        </span>
        <span>
          Total events:{" "}
          <span className="font-semibold">{totalEvents.toLocaleString()}</span>
        </span>
      </div>

      <Card className="overflow-x-auto p-5">
        <div className="inline-block min-w-[600px]">
          {/* Hour labels across top */}
          <div className="mb-1 flex">
            <div className="w-10 shrink-0" />
            {HOUR_LABELS.map((label, i) => (
              <div
                key={i}
                className="flex-1 text-center text-[10px] text-gray-400 dark:text-gray-500"
              >
                {i % 3 === 0 ? label : ""}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {DAY_LABELS.map((dayLabel, dayIdx) => (
            <div key={dayIdx} className="flex items-center gap-0.5 mb-0.5">
              <div className="w-10 shrink-0 text-right text-[11px] font-medium text-gray-500 dark:text-gray-400 pr-2">
                {dayLabel}
              </div>
              {Array.from({ length: 24 }, (_, hourIdx) => {
                const value = grid[dayIdx][hourIdx];
                return (
                  <div
                    key={hourIdx}
                    className={cn(
                      "flex-1 aspect-square rounded-sm transition-colors duration-150",
                      getIntensityClass(value, maxValue),
                    )}
                    title={`${dayLabel} ${HOUR_LABELS[hourIdx]}:00 — ${value} events`}
                  />
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="mt-3 flex items-center justify-end gap-1">
            <span className="mr-1 text-[10px] text-gray-400 dark:text-gray-500">
              Less
            </span>
            {[0, 0.15, 0.3, 0.5, 0.7, 0.85, 1].map((ratio, i) => (
              <div
                key={i}
                className={cn(
                  "h-3 w-3 rounded-sm",
                  getIntensityClass(ratio * maxValue, maxValue),
                )}
              />
            ))}
            <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">
              More
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
