"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Spinner,
} from "@tidemeter/ui";

interface WebsiteSettingsProps {
  /** Canonical numeric id, used for Payload REST calls (GET/PATCH/DELETE). */
  websiteId: string;
  /** Public tracking id, used in the snippet and dashboard URLs. */
  publicId: string;
}

interface WebsiteData {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
  timezone?: string;
  shareId?: string | null;
}

export function WebsiteSettings({ websiteId, publicId }: WebsiteSettingsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [shareId, setShareId] = useState<string | null>(null);
  const [togglingShare, setTogglingShare] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/websites/${websiteId}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Failed to load website (${res.status})`);
        const data: WebsiteData = await res.json();
        setName(data.name);
        setDomain(data.domain);
        setShareId(data.shareId ?? null);
      } catch (err) {
        setFetchError(
          err instanceof Error ? err.message : "Failed to load website.",
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [websiteId]);

  // The public tracking id goes into the snippet and dashboard URLs; the
  // numeric id is only used for authenticated REST calls.
  const trackingId = publicId;
  const trackingSnippet = `<script defer data-website-id="${trackingId}" src="${typeof window !== "undefined" ? window.location.origin : ""}/t.js"></script>`;

  function handleCopy() {
    navigator.clipboard.writeText(trackingSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), domain: domain.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.errors?.[0]?.message ?? `Failed to save (${res.status})`,
        );
      }
      setMessage({ type: "success", text: "Settings saved successfully." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to delete (${res.status})`);
      router.push("/");
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete.",
      });
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <Card className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-red-600 dark:text-red-400">{fetchError}</p>
        <Link href="/">
          <Button className="mt-4" variant="secondary">
            Back to Dashboard
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/${publicId}`}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Website Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure tracking for this website
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* General info */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSave}>
            <div>
              <label
                htmlFor="site-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Website Name
              </label>
              <input
                id="site-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="site-domain"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Domain
              </label>
              <input
                id="site-domain"
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="example.com"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tracking code */}
      <Card>
        <CardHeader>
          <CardTitle>Tracking Code</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
            Add this snippet to the{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800">
              &lt;head&gt;
            </code>{" "}
            section of your website:
          </p>
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
              <code>{trackingSnippet}</code>
            </pre>
            <Button
              variant="secondary"
              size="sm"
              className="absolute right-2 top-2"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Public sharing */}
      <Card>
        <CardHeader>
          <CardTitle>Public Sharing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
            Share a read-only view of your analytics with anyone.
          </p>
          {shareId ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareId}`}
                  className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/share/${shareId}`,
                    );
                  }}
                >
                  Copy
                </Button>
              </div>
              <Button
                variant="secondary"
                disabled={togglingShare}
                onClick={async () => {
                  setTogglingShare(true);
                  try {
                    const res = await fetch(`/api/websites/${websiteId}`, {
                      method: "PATCH",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ shareId: null }),
                    });
                    if (res.ok) setShareId(null);
                  } finally {
                    setTogglingShare(false);
                  }
                }}
              >
                {togglingShare ? "Disabling…" : "Disable Sharing"}
              </Button>
            </div>
          ) : (
            <Button
              disabled={togglingShare}
              onClick={async () => {
                setTogglingShare(true);
                try {
                  const newShareId = crypto
                    .randomUUID()
                    .replace(/-/g, "")
                    .slice(0, 12);
                  const res = await fetch(`/api/websites/${websiteId}`, {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ shareId: newShareId }),
                  });
                  if (res.ok) setShareId(newShareId);
                } finally {
                  setTogglingShare(false);
                }
              }}
            >
              {togglingShare ? "Enabling…" : "Enable Public Link"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Delete Website
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Permanently delete this website and all its analytics data.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {confirmDelete && (
                <Button
                  variant="secondary"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              )}
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting
                  ? "Deleting…"
                  : confirmDelete
                    ? "Confirm Delete"
                    : "Delete"}
              </Button>
            </div>
          </div>
          {confirmDelete && !deleting && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              Are you sure? This action cannot be undone.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
