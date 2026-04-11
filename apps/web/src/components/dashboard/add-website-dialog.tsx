"use client";

import React, { useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@tidemeter/ui";

interface AddWebsiteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isDemoMode?: boolean;
}

export function AddWebsiteDialog({
  open,
  onClose,
  onSuccess,
  isDemoMode = false,
}: AddWebsiteDialogProps) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  function reset() {
    setName("");
    setDomain("");
    setError("");
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isDemoMode) {
      handleClose();
      return;
    }

    setError("");

    if (!name.trim() || !domain.trim()) {
      setError("Name and domain are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/websites", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          domain: domain.trim(),
          isActive: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.errors?.[0]?.message ??
            `Failed to create website (${res.status})`,
        );
      }

      reset();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <Card className="relative z-10 w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Add Website</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isDemoMode && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300">
                Demo mode — adding sites is disabled
              </div>
            )}
            <div>
              <label
                htmlFor="new-site-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Website Name
              </label>
              <input
                id="new-site-name"
                type="text"
                required={!isDemoMode}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isDemoMode}
                className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="My Website"
              />
            </div>

            <div>
              <label
                htmlFor="new-site-domain"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Domain
              </label>
              <input
                id="new-site-domain"
                type="text"
                required={!isDemoMode}
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={isDemoMode}
                className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="example.com"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {isDemoMode
                  ? "Close"
                  : submitting
                    ? "Creating\u2026"
                    : "Create Website"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
