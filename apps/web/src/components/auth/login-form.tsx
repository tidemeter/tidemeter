'use client';

import React, { useState } from 'react';
import { Card, Button } from '@tidemeter/ui';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.errors?.[0]?.message ?? 'Invalid email or password');
        return;
      }

      window.location.href = '/';
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="p-6 shadow-md shadow-gray-200/50 dark:shadow-none">
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 dark:bg-red-900/20">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-[13px] font-medium text-gray-700 dark:text-gray-300">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-[13px] font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <button type="button" className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
              Forgot password?
            </button>
          </div>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" className="h-10 w-full" loading={isLoading}>
          {isLoading ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
    </Card>
  );
}
