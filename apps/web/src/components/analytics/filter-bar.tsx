"use client";

import React, { useState } from "react";
import { cn } from "@tidemeter/ui";
import type { StatsFilter, BreakdownProperty } from "@tidemeter/analytics";

interface FilterBarProps {
  filters: StatsFilter[];
  onFiltersChange: (filters: StatsFilter[]) => void;
}

const FILTER_OPTIONS: {
  property: BreakdownProperty;
  label: string;
  group: string;
}[] = [
  { property: "url_path", label: "Page", group: "Content" },
  { property: "entry_page", label: "Entry Page", group: "Content" },
  { property: "exit_page", label: "Exit Page", group: "Content" },
  { property: "page_title", label: "Page Title", group: "Content" },
  { property: "referrer_domain", label: "Referrer", group: "Sources" },
  { property: "utm_source", label: "UTM Source", group: "Sources" },
  { property: "utm_medium", label: "UTM Medium", group: "Sources" },
  { property: "utm_campaign", label: "UTM Campaign", group: "Sources" },
  { property: "country", label: "Country", group: "Location" },
  { property: "region", label: "Region", group: "Location" },
  { property: "city", label: "City", group: "Location" },
  { property: "browser", label: "Browser", group: "Technology" },
  { property: "os", label: "OS", group: "Technology" },
  { property: "device_type", label: "Device", group: "Technology" },
  { property: "screen_size", label: "Screen Size", group: "Technology" },
  { property: "hostname", label: "Hostname", group: "Content" },
];

const OPERATOR_LABELS: Record<StatsFilter["operator"], string> = {
  eq: "is",
  neq: "is not",
  contains: "contains",
};

function FilterPill({
  filter,
  onRemove,
}: {
  filter: StatsFilter;
  onRemove: () => void;
}) {
  const option = FILTER_OPTIONS.find((o) => o.property === filter.property);
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
      <span className="font-semibold">{option?.label ?? filter.property}</span>
      <span className="text-blue-500 dark:text-blue-400">
        {OPERATOR_LABELS[filter.operator]}
      </span>
      <span>{filter.value}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 cursor-pointer rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-800"
        aria-label="Remove filter"
      >
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
          <path d="M3.05 3.05a.75.75 0 011.06 0L6 4.94l1.89-1.89a.75.75 0 111.06 1.06L7.06 6l1.89 1.89a.75.75 0 01-1.06 1.06L6 7.06 4.11 8.95a.75.75 0 01-1.06-1.06L4.94 6 3.05 4.11a.75.75 0 010-1.06z" />
        </svg>
      </button>
    </span>
  );
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [selectedOperator, setSelectedOperator] =
    useState<StatsFilter["operator"]>("eq");
  const [filterValue, setFilterValue] = useState("");

  function handleAdd() {
    if (!selectedProperty || !filterValue.trim()) return;
    const newFilter: StatsFilter = {
      property: selectedProperty,
      operator: selectedOperator,
      value: filterValue.trim(),
    };
    onFiltersChange([...filters, newFilter]);
    setSelectedProperty("");
    setSelectedOperator("eq");
    setFilterValue("");
    setIsAdding(false);
  }

  function handleRemove(index: number) {
    onFiltersChange(filters.filter((_, i) => i !== index));
  }

  function handleClearAll() {
    onFiltersChange([]);
  }

  // Group filter options for the dropdown
  const groups = FILTER_OPTIONS.reduce(
    (acc, opt) => {
      if (!acc[opt.group]) acc[opt.group] = [];
      acc[opt.group].push(opt);
      return acc;
    },
    {} as Record<string, typeof FILTER_OPTIONS>,
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter, i) => (
          <FilterPill
            key={i}
            filter={filter}
            onRemove={() => handleRemove(i)}
          />
        ))}

        {!isAdding ? (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add filter
          </button>
        ) : null}

        {filters.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Clear all
          </button>
        )}
      </div>

      {isAdding && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="min-w-[140px]">
            <label className="mb-1 block text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Property
            </label>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            >
              <option value="">Select...</option>
              {Object.entries(groups).map(([group, options]) => (
                <optgroup key={group} label={group}>
                  {options.map((opt) => (
                    <option key={opt.property} value={opt.property}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="min-w-[100px]">
            <label className="mb-1 block text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Operator
            </label>
            <select
              value={selectedOperator}
              onChange={(e) =>
                setSelectedOperator(e.target.value as StatsFilter["operator"])
              }
              className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            >
              <option value="eq">is</option>
              <option value="neq">is not</option>
              <option value="contains">contains</option>
            </select>
          </div>

          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Value
            </label>
            <input
              type="text"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Enter value..."
              className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!selectedProperty || !filterValue.trim()}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                selectedProperty && filterValue.trim()
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500",
              )}
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setSelectedProperty("");
                setFilterValue("");
              }}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
