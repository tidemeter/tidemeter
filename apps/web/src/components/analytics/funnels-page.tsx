"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  DateRangePicker,
  cn,
  type DateRange,
} from "@tidemeter/ui";
import type { FunnelResult } from "@tidemeter/analytics";

// ── Types ────────────────────────────────────────────────────────────

interface FunnelDefinition {
  id: string;
  name: string;
  steps: FunnelStep[];
}

interface FunnelsPageProps {
  websiteId: string;
  numericWebsiteId: string;
  websiteName: string;
  dateRange: { from: string; to: string };
}

// ── Funnel Chart ─────────────────────────────────────────────────────

function FunnelChart({ data }: { data: FunnelResult }) {
  if (data.steps.length === 0) return null;

  const maxVisitors = data.steps[0]?.visitors || 1;

  return (
    <div className="space-y-1">
      {data.steps.map((step, i) => {
        const barWidth =
          maxVisitors > 0 ? (step.visitors / maxVisitors) * 100 : 0;
        const isLast = i === data.steps.length - 1;

        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="w-6 shrink-0 text-center text-xs font-bold text-gray-400">
                {i + 1}
              </span>
              <div className="flex-1">
                <div
                  className={cn(
                    "relative h-10 rounded-md transition-all",
                    i === 0
                      ? "bg-blue-500/20"
                      : isLast
                        ? "bg-emerald-500/20"
                        : "bg-blue-500/15",
                  )}
                  style={{ width: `${Math.max(barWidth, 4)}%` }}
                >
                  <div
                    className={cn(
                      "absolute inset-0 rounded-md",
                      i === 0
                        ? "bg-blue-500"
                        : isLast
                          ? "bg-emerald-500"
                          : "bg-blue-400",
                    )}
                    style={{ opacity: 0.8 }}
                  />
                  <div className="relative flex h-full items-center justify-between px-3">
                    <span className="truncate text-sm font-medium text-white">
                      {step.name}
                    </span>
                    <span className="ml-2 shrink-0 text-sm font-bold text-white">
                      {step.visitors.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <span className="w-14 shrink-0 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">
                {step.conversionRate.toFixed(1)}%
              </span>
            </div>

            {!isLast && (
              <div className="ml-9 flex items-center gap-2 py-0.5">
                <svg
                  className="h-3 w-3 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
                <span className="text-xs text-red-400">
                  {step.dropoffRate.toFixed(1)}% dropped off{" · "}
                  {(
                    data.steps[i].visitors - data.steps[i + 1].visitors
                  ).toLocaleString()}{" "}
                  visitors
                </span>
              </div>
            )}
          </div>
        );
      })}

      <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/50">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Overall Conversion
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {data.convertedVisitors.toLocaleString()} /{" "}
            {data.totalVisitors.toLocaleString()}
          </span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {data.overallConversionRate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Create/Edit Funnel Dialog ────────────────────────────────────────

interface FunnelStep {
  name: string;
  matchType: "url_path" | "event_name";
  matchOperator: "equals" | "contains" | "starts_with";
  matchValue: string;
}

interface FunnelDialogProps {
  websiteId: string;
  editId?: string | null;
  initialName?: string;
  initialSteps?: FunnelStep[];
  onSaved: () => void;
  onClose: () => void;
}

function FunnelDialog({
  websiteId,
  editId,
  initialName = "",
  initialSteps,
  onSaved,
  onClose,
}: FunnelDialogProps) {
  const isEdit = !!editId;
  const [name, setName] = useState(initialName);
  const [steps, setSteps] = useState<FunnelStep[]>(
    initialSteps ?? [
      {
        name: "",
        matchType: "url_path",
        matchOperator: "equals",
        matchValue: "",
      },
      {
        name: "",
        matchType: "url_path",
        matchOperator: "equals",
        matchValue: "",
      },
    ],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateStep(index: number, updates: Partial<FunnelStep>) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s)),
    );
  }

  function addStep() {
    if (steps.length >= 10) return;
    setSteps((prev) => [
      ...prev,
      {
        name: "",
        matchType: "url_path",
        matchOperator: "equals",
        matchValue: "",
      },
    ]);
  }

  function removeStep(index: number) {
    if (steps.length <= 2) return;
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Funnel name is required");
      return;
    }
    const invalidStep = steps.find(
      (s) => !s.name.trim() || !s.matchValue.trim(),
    );
    if (invalidStep) {
      setError("All steps need a name and match value");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = isEdit ? `/api/funnels/${editId}` : "/api/funnels";
      const method = isEdit ? "PATCH" : "POST";
      const body: Record<string, unknown> = { name, steps };
      if (!isEdit) body.website = websiteId;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data?.errors?.[0]?.message ||
            `Failed to ${isEdit ? "update" : "create"} funnel`,
        );
        return;
      }

      onSaved();
    } catch {
      setError(`Failed to ${isEdit ? "update" : "create"} funnel`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {isEdit ? "Edit Funnel" : "Create Funnel"}
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Funnel Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Signup Flow"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Steps ({steps.length}/10)
            </label>
            {steps.map((step, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-gray-400">
                    Step {i + 1}
                  </span>
                  {steps.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      className="cursor-pointer text-xs text-red-400 hover:text-red-500"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Step name"
                    value={step.name}
                    onChange={(e) => updateStep(i, { name: e.target.value })}
                    className="rounded border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <select
                    value={step.matchType}
                    onChange={(e) =>
                      updateStep(i, {
                        matchType: e.target.value as FunnelStep["matchType"],
                      })
                    }
                    className="cursor-pointer rounded border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="url_path">Page URL</option>
                    <option value="event_name">Custom Event</option>
                  </select>
                  <select
                    value={step.matchOperator}
                    onChange={(e) =>
                      updateStep(i, {
                        matchOperator: e.target
                          .value as FunnelStep["matchOperator"],
                      })
                    }
                    className="cursor-pointer rounded border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                    <option value="starts_with">Starts with</option>
                  </select>
                  <input
                    type="text"
                    placeholder={
                      step.matchType === "url_path"
                        ? "/pricing"
                        : "signup_click"
                    }
                    value={step.matchValue}
                    onChange={(e) =>
                      updateStep(i, { matchValue: e.target.value })
                    }
                    className="rounded border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            ))}
            {steps.length < 10 && (
              <button
                type="button"
                onClick={addStep}
                className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-gray-200 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 dark:border-gray-700 dark:text-gray-400"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Step
              </button>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Funnel"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Funnels Page ────────────────────────────────────────────────

export function FunnelsPage({
  websiteId,
  numericWebsiteId,
  websiteName,
  dateRange,
}: FunnelsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [funnels, setFunnels] = useState<FunnelDefinition[]>([]);
  const [funnelsLoaded, setFunnelsLoaded] = useState(false);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [funnelResult, setFunnelResult] = useState<FunnelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const currentRange: DateRange = {
    from: new Date(dateRange.from),
    to: new Date(dateRange.to),
    label: searchParams.get("label") || "Last 30 days",
  };

  function handleDateChange(range: DateRange) {
    const params = new URLSearchParams();
    params.set("from", range.from.toISOString());
    params.set("to", range.to.toISOString());
    params.set("label", range.label);
    router.push(`${pathname}?${params.toString()}`);
  }

  // Fetch funnel definitions
  const loadFunnels = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/funnels?where[website][equals]=${numericWebsiteId}&limit=50`,
      );
      if (!res.ok) return;
      const data = await res.json();
      const docs = (data.docs ?? []).map(
        (d: { id: string; name: string; steps: FunnelStep[] }) => ({
          id: String(d.id),
          name: d.name,
          steps: (d.steps ?? []).map((s: FunnelStep) => ({
            name: s.name,
            matchType: s.matchType,
            matchOperator: s.matchOperator,
            matchValue: s.matchValue,
          })),
        }),
      );
      setFunnels(docs);
      setFunnelsLoaded(true);
      if (docs.length > 0 && !selectedFunnelId) {
        setSelectedFunnelId(docs[0].id);
      }
    } catch {
      setFunnelsLoaded(true);
    }
  }, [numericWebsiteId, selectedFunnelId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch with loading state
    loadFunnels();
  }, [loadFunnels]);

  // Fetch funnel analysis
  useEffect(() => {
    if (!selectedFunnelId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale result when selection unset
      setFunnelResult(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      funnelId: selectedFunnelId,
      from: dateRange.from,
      to: dateRange.to,
    });

    fetch(`/api/stats/${websiteId}/funnel?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) {
          setFunnelResult(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedFunnelId, websiteId, dateRange.from, dateRange.to]);

  async function handleDeleteFunnel() {
    if (!selectedFunnelId) return;
    try {
      const res = await fetch(`/api/funnels/${selectedFunnelId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSelectedFunnelId(null);
        setFunnelResult(null);
        loadFunnels();
      }
    } catch {
      // silently fail
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link
              href={`/${websiteId}`}
              className="hover:text-primary-600 dark:hover:text-primary-400"
            >
              {websiteName}
            </Link>
            <span>/</span>
            <span className="font-medium text-gray-900 dark:text-white">
              Funnels
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Funnels
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Track conversion rates through a series of steps
          </p>
        </div>
        <DateRangePicker value={currentRange} onChange={handleDateChange} />
      </div>

      {/* Funnel selector + actions */}
      {funnelsLoaded && funnels.length > 0 && (
        <div className="space-y-4">
          {/* Funnel tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {funnels.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFunnelId(f.id)}
                className={cn(
                  "cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                  f.id === selectedFunnelId
                    ? "border-primary-500 bg-primary-50 text-primary-700 shadow-sm dark:border-primary-400 dark:bg-primary-500/10 dark:text-primary-300"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-700",
                )}
              >
                {f.name}
              </button>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCreate(true)}
            >
              <svg
                className="mr-1 h-3.5 w-3.5"
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
              New Funnel
            </Button>
          </div>

          {/* Selected funnel title + actions */}
          {selectedFunnelId &&
            (() => {
              const selected = funnels.find((f) => f.id === selectedFunnelId);
              return selected ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selected.name}
                    </h2>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      {selected.steps.length} steps
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowEdit(true)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-primary-400"
                      title="Edit funnel"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                        />
                      </svg>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteFunnel}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      title="Delete funnel"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              ) : null;
            })()}
        </div>
      )}

      {/* New Funnel button when no funnels exist yet */}
      {funnelsLoaded && funnels.length === 0 && !showCreate && <div />}

      {/* Funnel content */}
      <Card>
        <CardContent className="p-6">
          {!funnelsLoaded ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
            </div>
          ) : funnels.length === 0 && !showCreate ? (
            <div className="flex flex-col items-center justify-center py-16">
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
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                No funnels yet
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Create a funnel to track conversion through a series of steps
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-5"
                onClick={() => setShowCreate(true)}
              >
                Create Your First Funnel
              </Button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
            </div>
          ) : funnelResult ? (
            <FunnelChart data={funnelResult} />
          ) : (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-gray-400">Select a funnel to view</p>
            </div>
          )}
        </CardContent>
      </Card>

      {showCreate && (
        <FunnelDialog
          websiteId={numericWebsiteId}
          onSaved={() => {
            setShowCreate(false);
            loadFunnels();
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {showEdit &&
        selectedFunnelId &&
        (() => {
          const funnel = funnels.find((f) => f.id === selectedFunnelId);
          return funnel ? (
            <FunnelDialog
              websiteId={numericWebsiteId}
              editId={funnel.id}
              initialName={funnel.name}
              initialSteps={funnel.steps}
              onSaved={() => {
                setShowEdit(false);
                loadFunnels();
              }}
              onClose={() => setShowEdit(false)}
            />
          ) : null;
        })()}
    </div>
  );
}
