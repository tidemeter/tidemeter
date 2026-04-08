"use client";

import React, { useState } from "react";
import { cn } from "./utils";

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const presets: { label: string; getDates: () => { from: Date; to: Date } }[] = [
  {
    label: "Today",
    getDates: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from, to: now };
    },
  },
  {
    label: "Yesterday",
    getDates: () => {
      const now = new Date();
      const from = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1,
      );
      const to = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1,
        23,
        59,
        59,
      );
      return { from, to };
    },
  },
  {
    label: "Last 7 days",
    getDates: () => {
      const to = new Date();
      const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { from, to };
    },
  },
  {
    label: "Last 30 days",
    getDates: () => {
      const to = new Date();
      const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { from, to };
    },
  },
  {
    label: "Last 3 months",
    getDates: () => {
      const to = new Date();
      const from = new Date(to.getFullYear(), to.getMonth() - 3, to.getDate());
      return { from, to };
    },
  },
  {
    label: "Last 6 months",
    getDates: () => {
      const to = new Date();
      const from = new Date(to.getFullYear(), to.getMonth() - 6, to.getDate());
      return { from, to };
    },
  },
  {
    label: "Last 12 months",
    getDates: () => {
      const to = new Date();
      const from = new Date(to.getFullYear() - 1, to.getMonth(), to.getDate());
      return { from, to };
    },
  },
  {
    label: "This month",
    getDates: () => {
      const to = new Date();
      const from = new Date(to.getFullYear(), to.getMonth(), 1);
      return { from, to };
    },
  },
  {
    label: "This year",
    getDates: () => {
      const to = new Date();
      const from = new Date(to.getFullYear(), 0, 1);
      return { from, to };
    },
  },
];

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        {value.label}
      </button>
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                const dates = preset.getDates();
                onChange({ ...dates, label: preset.label });
                setIsOpen(false);
              }}
              className={cn(
                "w-full cursor-pointer px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800",
                value.label === preset.label
                  ? "bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400"
                  : "text-gray-700 dark:text-gray-200",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
