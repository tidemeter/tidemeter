"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from "@tidemeter/ui";

interface HealthData {
  status: string;
  timestamp: string;
}

type CheckStatus = "loading" | "operational" | "degraded" | "error";

interface StatusCheck {
  name: string;
  description: string;
  status: CheckStatus;
  responseTime?: number;
  detail?: string;
}

function StatusDot({ status }: { status: CheckStatus }) {
  const colorMap: Record<CheckStatus, string> = {
    loading: "bg-gray-400 animate-pulse",
    operational: "bg-green-500",
    degraded: "bg-amber-500",
    error: "bg-red-500",
  };
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${colorMap[status]}`}
    />
  );
}

function StatusLabel({ status }: { status: CheckStatus }) {
  const labels: Record<CheckStatus, { text: string; className: string }> = {
    loading: { text: "Checking…", className: "text-gray-500" },
    operational: {
      text: "Operational",
      className: "text-green-600 dark:text-green-400",
    },
    degraded: {
      text: "Degraded",
      className: "text-amber-600 dark:text-amber-400",
    },
    error: { text: "Error", className: "text-red-600 dark:text-red-400" },
  };
  const label = labels[status];
  return (
    <span className={`text-[13px] font-medium ${label.className}`}>
      {label.text}
    </span>
  );
}

export function SystemStatus() {
  const [checks, setChecks] = useState<StatusCheck[]>([
    {
      name: "API Server",
      description: "Core application server",
      status: "loading",
    },
    {
      name: "Health Endpoint",
      description: "Health check API response",
      status: "loading",
    },
    {
      name: "Authentication",
      description: "User authentication service",
      status: "loading",
    },
  ]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const runChecks = useCallback(async () => {
    setIsRefreshing(true);
    const results: StatusCheck[] = [];

    // Check health endpoint
    try {
      const start = performance.now();
      const res = await fetch("/api/health", { cache: "no-store" });
      const elapsed = Math.round(performance.now() - start);

      if (res.ok) {
        const data: HealthData = await res.json();
        results.push({
          name: "API Server",
          description: "Core application server",
          status: "operational",
          responseTime: elapsed,
          detail: `Responded in ${elapsed}ms`,
        });
        results.push({
          name: "Health Endpoint",
          description: "Health check API response",
          status: "operational",
          responseTime: elapsed,
          detail: `Status: ${data.status}, Timestamp: ${new Date(data.timestamp).toLocaleTimeString()}`,
        });
      } else {
        results.push({
          name: "API Server",
          description: "Core application server",
          status: "degraded",
          responseTime: elapsed,
          detail: `HTTP ${res.status}`,
        });
        results.push({
          name: "Health Endpoint",
          description: "Health check API response",
          status: "error",
          responseTime: elapsed,
          detail: `Returned status ${res.status}`,
        });
      }
    } catch {
      results.push({
        name: "API Server",
        description: "Core application server",
        status: "error",
        detail: "Failed to connect",
      });
      results.push({
        name: "Health Endpoint",
        description: "Health check API response",
        status: "error",
        detail: "Unreachable",
      });
    }

    // Check auth
    try {
      const start = performance.now();
      const res = await fetch("/api/users/me", {
        credentials: "include",
        cache: "no-store",
      });
      const elapsed = Math.round(performance.now() - start);

      results.push({
        name: "Authentication",
        description: "User authentication service",
        status: res.ok ? "operational" : "degraded",
        responseTime: elapsed,
        detail: res.ok ? `Session valid (${elapsed}ms)` : `HTTP ${res.status}`,
      });
    } catch {
      results.push({
        name: "Authentication",
        description: "User authentication service",
        status: "error",
        detail: "Failed to connect",
      });
    }

    setChecks(results);
    setLastChecked(new Date());
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  const overallStatus: CheckStatus = checks.some((c) => c.status === "error")
    ? "error"
    : checks.some((c) => c.status === "degraded")
      ? "degraded"
      : checks.some((c) => c.status === "loading")
        ? "loading"
        : "operational";

  const overallLabel: Record<CheckStatus, string> = {
    loading: "Checking system status…",
    operational: "All systems operational",
    degraded: "Some systems degraded",
    error: "System issues detected",
  };

  const overallColor: Record<CheckStatus, string> = {
    loading: "text-gray-500",
    operational: "text-green-600 dark:text-green-400",
    degraded: "text-amber-600 dark:text-amber-400",
    error: "text-red-600 dark:text-red-400",
  };

  const overallBg: Record<CheckStatus, string> = {
    loading:
      "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50",
    operational:
      "border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-500/5",
    degraded:
      "border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-500/5",
    error: "border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-500/5",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            System Status
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor the health of your TideMeter instance
          </p>
        </div>
        <Button variant="secondary" onClick={runChecks} disabled={isRefreshing}>
          {isRefreshing ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Checking…
            </>
          ) : (
            <>
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                />
              </svg>
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* Overall status banner */}
      <div
        className={`flex items-center gap-3 rounded-xl border px-5 py-4 ${overallBg[overallStatus]}`}
      >
        <StatusDot status={overallStatus} />
        <span
          className={`text-base font-semibold ${overallColor[overallStatus]}`}
        >
          {overallLabel[overallStatus]}
        </span>
        {lastChecked && (
          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
            Last checked: {lastChecked.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Individual checks */}
      <Card>
        <CardHeader>
          <CardTitle>Service Checks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {checks.map((check) => (
              <div
                key={check.name}
                className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
              >
                <StatusDot status={check.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {check.name}
                  </p>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400">
                    {check.description}
                  </p>
                </div>
                <div className="text-right">
                  <StatusLabel status={check.status} />
                  {check.detail && (
                    <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                      {check.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
                Platform
              </p>
              <p className="mt-0.5 text-sm text-gray-900 dark:text-white">
                TideMeter
              </p>
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
                Type
              </p>
              <p className="mt-0.5 text-sm text-gray-900 dark:text-white">
                Self-hosted
              </p>
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
                Privacy
              </p>
              <p className="mt-0.5 text-sm text-gray-900 dark:text-white">
                No cookies, GDPR compliant
              </p>
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
                Documentation
              </p>
              <a
                href="https://tidemeter.com/docs"
                className="mt-0.5 inline-block text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
                target="_blank"
                rel="noopener noreferrer"
              >
                tidemeter.com/docs
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
