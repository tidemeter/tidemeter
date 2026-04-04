"use client";

import React, { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  Badge,
  Button,
  DateRangePicker,
  type DateRange,
} from "@tidemeter/ui";
import { formatNumber } from "@/lib/utils/date";
import type { VisitorSummary, VisitorListResult } from "@tidemeter/analytics";

interface VisitorListProps {
  websiteId: string;
  websiteName: string;
  initialData: VisitorListResult;
  dateRange: { from: string; to: string };
}

function DeviceBadge({ devices }: { devices: string[] }) {
  const icons: Record<string, string> = {
    mobile: "📱",
    tablet: "📲",
    desktop: "🖥️",
  };
  return (
    <div className="flex gap-1">
      {devices.map((d) => (
        <span key={d} title={d} className="text-base">
          {icons[d] ?? "💻"}
        </span>
      ))}
    </div>
  );
}

function VisitorRow({
  visitor,
  websiteId,
}: {
  visitor: VisitorSummary;
  websiteId: string;
}) {
  const lastSeen = new Date(visitor.lastSeen);
  const firstSeen = new Date(visitor.firstSeen);
  const displayId = visitor.userId || visitor.visitorId.slice(0, 12);

  return (
    <Link
      href={`/${websiteId}/visitors/${visitor.visitorId}`}
      className="group block"
    >
      <div className="flex items-center gap-4 rounded-xl border border-gray-200/80 bg-white px-5 py-4 transition-all duration-150 hover:border-blue-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-950 dark:hover:border-blue-800">
        {/* Avatar */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500">
          <span className="text-sm font-bold text-white">
            {displayId.slice(0, 2).toUpperCase()}
          </span>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
              {displayId}
            </span>
            {visitor.userId && <Badge variant="success">Identified</Badge>}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {visitor.lastCountry && (
              <span>
                {visitor.lastCity
                  ? `${visitor.lastCity}, ${visitor.lastCountry}`
                  : visitor.lastCountry}
              </span>
            )}
            <span>First seen {firstSeen.toLocaleDateString()}</span>
          </div>
        </div>

        {/* Devices */}
        <div className="hidden sm:block">
          <DeviceBadge devices={visitor.devices} />
        </div>

        {/* Stats */}
        <div className="hidden gap-6 text-center sm:flex">
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
              Sessions
            </p>
            <p className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
              {formatNumber(visitor.totalSessions)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
              Pageviews
            </p>
            <p className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
              {formatNumber(visitor.totalPageviews)}
            </p>
          </div>
        </div>

        {/* Last seen */}
        <div className="text-right">
          <p className="text-xs text-gray-400 dark:text-gray-500">Last seen</p>
          <p className="text-xs font-medium tabular-nums text-gray-600 dark:text-gray-300">
            {lastSeen.toLocaleDateString()}{" "}
            {lastSeen.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Arrow */}
        <svg
          className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 4.5l7.5 7.5-7.5 7.5"
          />
        </svg>
      </div>
    </Link>
  );
}

export function VisitorList({
  websiteId,
  websiteName,
  initialData,
  dateRange,
}: VisitorListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const data = initialData;
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const currentRange: DateRange = {
    from: new Date(dateRange.from),
    to: new Date(dateRange.to),
    label: searchParams.get("label") || "Last 30 days",
  };

  const currentPage = data.page;
  const totalPages = Math.ceil(data.total / data.pageSize);

  function handleDateChange(range: DateRange) {
    const params = new URLSearchParams();
    params.set("from", range.from.toISOString());
    params.set("to", range.to.toISOString());
    params.set("label", range.label);
    if (search) params.set("search", search);
    router.push(`${pathname}?${params.toString()}`);
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link
              href={`/${websiteId}`}
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              {websiteName}
            </Link>
            <span>/</span>
            <span className="font-medium text-gray-900 dark:text-white">
              Visitors
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            User Journeys
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {formatNumber(data.total)} visitors in this period
          </p>
        </div>
        <DateRangePicker value={currentRange} onChange={handleDateChange} />
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by visitor ID or user ID..."
          className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        />
        <Button type="submit" variant="secondary" size="sm">
          Search
        </Button>
      </form>

      {/* Visitor list */}
      {data.data.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20">
          <svg
            className="h-12 w-12 text-gray-300 dark:text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
          <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
            No visitors found
          </h3>
          <p className="mt-1.5 max-w-xs text-center text-sm text-gray-500 dark:text-gray-400">
            No visitor data available for this date range. Make sure your
            tracking script is installed.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.data.map((visitor) => (
            <VisitorRow
              key={visitor.visitorId}
              visitor={visitor}
              websiteId={websiteId}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
