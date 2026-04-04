import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@tidemeter/ui";
import type { BreakdownResult } from "@tidemeter/analytics";

interface BreakdownPanelProps {
  title: string;
  data: BreakdownResult;
  onItemClick?: (value: string) => void;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <svg
        className="h-8 w-8 text-gray-300 dark:text-gray-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
      <p className="mt-2 text-sm font-medium text-gray-400 dark:text-gray-500">
        No data for this period
      </p>
    </div>
  );
}

export function BreakdownPanel({
  title,
  data,
  onItemClick,
}: BreakdownPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {data?.data && data.data.length > 0 && (
          <div className="flex gap-4 text-[11px] font-medium tracking-wide text-gray-400 uppercase">
            <span>Visitors</span>
            <span className="w-10 text-right">%</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!data?.data || data.data.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-0.5">
            {data.data.map((item, i) => (
              <div
                key={i}
                className={`group relative rounded-lg ${onItemClick ? "cursor-pointer" : ""}`}
                role={onItemClick ? "button" : undefined}
                tabIndex={onItemClick ? 0 : undefined}
                onClick={
                  onItemClick && item.value
                    ? () => onItemClick(item.value)
                    : undefined
                }
                onKeyDown={
                  onItemClick && item.value
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onItemClick(item.value);
                        }
                      }
                    : undefined
                }
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-lg bg-blue-50/80 transition-all duration-300 dark:bg-blue-900/15"
                  style={{
                    width: `${Math.max(item.percentage * 100, 2).toFixed(0)}%`,
                  }}
                />
                <div className="relative flex items-center justify-between px-3 py-2">
                  <span
                    className={`truncate text-[13px] font-medium text-gray-700 dark:text-gray-200 ${onItemClick ? "group-hover:text-blue-600 dark:group-hover:text-blue-400" : ""}`}
                  >
                    {item.value || "(direct / none)"}
                  </span>
                  <div className="ml-3 flex shrink-0 items-center gap-3">
                    <span className="tabular-nums text-[13px] text-gray-700 dark:text-gray-300">
                      {item.visitors.toLocaleString()}
                    </span>
                    <span className="w-10 text-right tabular-nums text-[13px] text-gray-400 dark:text-gray-500">
                      {(item.percentage * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
