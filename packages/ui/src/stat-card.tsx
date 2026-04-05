import React from "react";
import { cn } from "./utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  loading?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  loading,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200/80 bg-white px-6 py-5 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-950",
        className,
      )}
    >
      <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
        {title}
      </p>
      {loading ? (
        <div className="mt-2 flex flex-col items-start gap-2">
          <div className="skeleton h-8 w-24" />
        </div>
      ) : (
        <div className="mt-2 flex flex-col items-start gap-2">
          <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {value}
          </span>
          {change !== undefined && (
            <span
              className={cn(
                "mb-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                change > 0
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : change < 0
                    ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
              )}
            >
              {change > 0 ? "↑" : change < 0 ? "↓" : ""}{" "}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
