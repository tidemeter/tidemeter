"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from "@tidemeter/ui";

interface SettingsUser {
  id: string;
  email: string;
  displayName?: string;
  roles: string[];
}

interface UserSettingsProps {
  user: SettingsUser | null;
  isReadOnly?: boolean;
}

export function UserSettings({ user, isReadOnly = false }: UserSettingsProps) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? "");
      setEmail(user.email ?? "");
    }
  }, [user]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (isReadOnly) {
      setProfileMessage({
        type: "error",
        text: "Demo account changes are disabled in demo mode.",
      });
      return;
    }
    setProfileMessage(null);
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.errors?.[0]?.message ?? `Failed to save (${res.status})`,
        );
      }
      setProfileMessage({
        type: "success",
        text: "Profile updated successfully.",
      });
    } catch (err) {
      setProfileMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save.",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (isReadOnly) {
      setPasswordMessage({
        type: "error",
        text: "Demo account changes are disabled in demo mode.",
      });
      return;
    }
    if (!newPassword) {
      setPasswordMessage({
        type: "error",
        text: "Please enter a new password.",
      });
      return;
    }
    setPasswordMessage(null);
    setSavingPassword(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.errors?.[0]?.message ??
            `Failed to update password (${res.status})`,
        );
      }
      setPasswordMessage({
        type: "success",
        text: "Password updated successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update password.",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setDeleteMessage(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to delete account (${res.status})`);
      router.push("/login");
    } catch (err) {
      setDeleteMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete account.",
      });
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  function MessageBanner({
    message,
  }: {
    message: { type: "success" | "error"; text: string };
  }) {
    return (
      <div
        className={`rounded-lg px-4 py-3 text-sm ${
          message.type === "success"
            ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
            : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
        }`}
      >
        {message.text}
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your account and preferences
        </p>
      </div>

      {isReadOnly && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-300">
          Demo account is read-only in demo mode. Profile and password changes
          are disabled.
        </div>
      )}

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {profileMessage && <MessageBanner message={profileMessage} />}
          <form className="space-y-4" onSubmit={handleSaveProfile}>
            <div>
              <label
                htmlFor="display-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Display Name
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isReadOnly}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Your name"
              />
            </div>
            <div>
              <label
                htmlFor="settings-email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email
              </label>
              <input
                id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isReadOnly}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="you@example.com"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isReadOnly || savingProfile}>
                {savingProfile ? "Saving…" : "Save Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          {passwordMessage && <MessageBanner message={passwordMessage} />}
          <form className="space-y-4" onSubmit={handleChangePassword}>
            <div>
              <label
                htmlFor="current-password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Current Password
              </label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isReadOnly}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label
                htmlFor="new-password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isReadOnly}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="••••••••"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isReadOnly || savingPassword}>
                {savingPassword ? "Updating…" : "Update Password"}
              </Button>
            </div>
          </form>
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
          {deleteMessage && <MessageBanner message={deleteMessage} />}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Delete Account
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Permanently delete your account and all associated data.
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
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting
                  ? "Deleting…"
                  : confirmDelete
                    ? "Confirm Delete"
                    : "Delete Account"}
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
