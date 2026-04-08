"use client";

import React, { useState } from "react";
import { Card, Button } from "@tidemeter/ui";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  function validate(): boolean {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Enter a valid email address";
    }
    if (!password) {
      errors.password = "Password is required";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.errors?.[0]?.message ?? "Invalid email or password");
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="p-6 shadow-md shadow-gray-200/50 dark:shadow-none">
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 dark:bg-red-500/10">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-[13px] font-medium text-gray-700 dark:text-gray-300"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((p) => ({ ...p, email: undefined }));
            }}
            className={`mt-1.5 block h-10 w-full rounded-lg border bg-white px-3 text-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 ${
              fieldErrors.email
                ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/50"
                : "border-gray-200 focus:border-primary-500 focus:ring-primary-500/20 dark:border-gray-700"
            }`}
            placeholder="you@example.com"
          />
          {fieldErrors.email && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-[13px] font-medium text-gray-700 dark:text-gray-300"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((p) => ({ ...p, password: undefined }));
            }}
            className={`mt-1.5 block h-10 w-full rounded-lg border bg-white px-3 text-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 ${
              fieldErrors.password
                ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/50"
                : "border-gray-200 focus:border-primary-500 focus:ring-primary-500/20 dark:border-gray-700"
            }`}
            placeholder="••••••••"
          />
          {fieldErrors.password && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <Button type="submit" className="h-10 w-full" loading={isLoading}>
          {isLoading ? "Signing in…" : "Sign In"}
        </Button>
      </form>
    </Card>
  );
}
