"use client";

import React, { useState } from "react";
import { Card, CardContent, Badge } from "@tidemeter/ui";
import { cn } from "@tidemeter/ui";
import { formatDuration } from "@/lib/utils/date";
import type { VisitorSession, JourneyStep } from "@tidemeter/analytics";

interface SessionTimelineProps {
  sessions: VisitorSession[];
  websiteId: string;
}

function StepRow({ step, isLast }: { step: JourneyStep; isLast: boolean }) {
  const ts = new Date(step.timestamp);
  const isPageview = step.eventName === "pageview";

  return (
    <div className="relative flex gap-3 pb-4">
      {/* Vertical connector line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 h-full w-px bg-gray-200 dark:bg-gray-700" />
      )}

      {/* Dot */}
      <div
        className={cn(
          "relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          isPageview
            ? "bg-blue-100 dark:bg-blue-900/30"
            : "bg-violet-100 dark:bg-violet-900/30",
        )}
      >
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            isPageview ? "bg-blue-500" : "bg-violet-500",
          )}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {step.urlPath}
          </span>
          {!isPageview && <Badge variant="default">{step.eventName}</Badge>}
        </div>
        {step.pageTitle && (
          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
            {step.pageTitle}
          </p>
        )}
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          <span>
            {ts.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
          {step.duration > 0 && (
            <span>Spent {formatDuration(step.duration)}</span>
          )}
          {step.referrerPath && step.referrerPath !== step.urlPath && (
            <span>from {step.referrerPath}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionCard({
  session,
  index,
}: {
  session: VisitorSession;
  index: number;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const startedAt = new Date(session.startedAt);

  return (
    <Card>
      {/* Session header (clickable) */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left"
      >
        {/* Session number */}
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
            session.isBounce
              ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
              : "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
          )}
        >
          {session.steps.length}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {startedAt.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-xs text-gray-400">
              {startedAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {session.isBounce && <Badge variant="warning">Bounce</Badge>}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>{session.pageviews} pages</span>
            <span>{formatDuration(session.duration)}</span>
            <span>
              {session.entryPage} → {session.exitPage}
            </span>
          </div>
        </div>

        {/* Context */}
        <div className="hidden flex-wrap gap-2 sm:flex">
          {session.referrerDomain && <Badge>{session.referrerDomain}</Badge>}
          {session.utmSource && <Badge>utm:{session.utmSource}</Badge>}
          <Badge>{session.browser}</Badge>
          <Badge>{session.deviceType}</Badge>
        </div>

        {/* Expand icon */}
        <svg
          className={cn(
            "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200",
            expanded && "rotate-180",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {/* Journey steps */}
      {expanded && session.steps.length > 0 && (
        <CardContent className="border-t border-gray-100 pt-4 dark:border-gray-800">
          <p className="mb-3 text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
            Journey Path
          </p>
          <div>
            {session.steps.map((step, i) => (
              <StepRow
                key={`${step.timestamp}-${i}`}
                step={step}
                isLast={i === session.steps.length - 1}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function SessionTimeline({ sessions }: SessionTimelineProps) {
  if (sessions.length === 0) {
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
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No sessions recorded in this period.
        </p>
      </Card>
    );
  }

  // Group sessions by date
  const grouped = new Map<string, VisitorSession[]>();
  for (const session of sessions) {
    const dateKey = new Date(session.startedAt).toLocaleDateString();
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(session);
  }

  let sessionIndex = 0;

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
        Sessions & Journey Paths ({sessions.length})
      </h2>
      {[...grouped.entries()].map(([date, daySessions]) => (
        <div key={date} className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500">
            {date}
          </h3>
          {daySessions.map((session) => {
            const idx = sessionIndex++;
            return (
              <SessionCard
                key={session.sessionId}
                session={session}
                index={idx}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
