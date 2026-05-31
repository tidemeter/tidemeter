"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, StatCard, Badge } from "@tidemeter/ui";
import { cn } from "@tidemeter/ui";
import { formatNumber, formatDuration } from "@/lib/utils/date";
import { ActivityHeatmap } from "./activity-heatmap";
import { SessionTimeline } from "./session-timeline";
import type {
  VisitorProfileResult,
  VisitorDevice,
} from "@tidemeter/analytics";

interface VisitorProfileProps {
  websiteId: string;
  websiteName: string;
  profile: VisitorProfileResult;
}

const PROFILE_TABS = [
  { id: "sessions", label: "Sessions & Journeys" },
  { id: "activity", label: "Activity Heatmap" },
  { id: "devices", label: "Devices" },
] as const;

type ProfileTab = (typeof PROFILE_TABS)[number]["id"];

function DeviceCard({ device }: { device: VisitorDevice }) {
  const icons: Record<string, string> = {
    mobile: "📱",
    tablet: "📲",
    desktop: "🖥️",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icons[device.deviceType] ?? "💻"}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {device.browser} on {device.os}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {device.deviceType} · {device.screenSize || "Unknown size"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
            {device.sessions}
          </p>
          <p className="text-xs text-gray-400">
            {device.sessions === 1 ? "session" : "sessions"}
          </p>
        </div>
      </div>
    </Card>
  );
}

export function VisitorProfile({
  websiteId,
  websiteName,
  profile,
}: VisitorProfileProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("sessions");
  const { visitor, devices, recentSessions, activityHeatmap } = profile;

  const displayId = visitor.userId || visitor.visitorId.slice(0, 12);
  const firstSeen = new Date(visitor.firstSeen);
  const lastSeen = new Date(visitor.lastSeen);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link
          href={`/${websiteId}`}
          className="hover:text-primary-600 dark:hover:text-primary-400"
        >
          {websiteName}
        </Link>
        <span>/</span>
        <Link
          href={`/${websiteId}/visitors`}
          className="hover:text-primary-600 dark:hover:text-primary-400"
        >
          Visitors
        </Link>
        <span>/</span>
        <span className="font-medium text-gray-900 dark:text-white">
          {displayId}
        </span>
      </div>

      {/* Profile header */}
      <div className="flex items-start gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-lg">
          <span className="text-xl font-bold text-white">
            {displayId.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {displayId}
            </h1>
            {visitor.userId && <Badge variant="success">Identified</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            {visitor.lastCountry && (
              <span>
                📍{" "}
                {visitor.lastCity
                  ? `${visitor.lastCity}, ${visitor.lastCountry}`
                  : visitor.lastCountry}
              </span>
            )}
            <span>First seen {firstSeen.toLocaleDateString()}</span>
            <span>
              Last seen {lastSeen.toLocaleDateString()}{" "}
              {lastSeen.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {visitor.userId && visitor.userId !== visitor.visitorId && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              User ID: {visitor.userId} · Visitor hash: {visitor.visitorId}
            </p>
          )}
        </div>
      </div>

      {/* Key stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sessions"
          value={formatNumber(visitor.totalSessions)}
        />
        <StatCard
          title="Total Pageviews"
          value={formatNumber(visitor.totalPageviews)}
        />
        <StatCard
          title="Total Events"
          value={formatNumber(visitor.totalEvents)}
        />
        <StatCard
          title="Avg. Session Duration"
          value={formatDuration(visitor.avgSessionDuration)}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900/50">
        {PROFILE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "sessions" && (
        <SessionTimeline sessions={recentSessions} websiteId={websiteId} />
      )}

      {activeTab === "activity" && <ActivityHeatmap data={activityHeatmap} />}

      {activeTab === "devices" && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
            Devices Used
          </h2>
          {devices.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No device data available.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {devices.map((device, i) => (
                <DeviceCard key={i} device={device} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
