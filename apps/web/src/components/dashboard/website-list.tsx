"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Badge, Button } from "@tidemeter/ui";
import { AddWebsiteDialog } from "./add-website-dialog";

interface Website {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
}

interface WebsiteListProps {
  websites: Website[];
  isDemoMode?: boolean;
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center py-20">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-gray-800">
        <svg
          className="h-7 w-7 text-gray-400 dark:text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
          />
        </svg>
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
        No websites yet
      </h3>
      <p className="mt-1.5 max-w-xs text-center text-sm text-gray-500 dark:text-gray-400">
        Add your first website to start tracking analytics. It only takes a
        minute.
      </p>
      <Button className="mt-5" onClick={onAdd}>
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
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
        Add your first website
      </Button>
    </Card>
  );
}

export function WebsiteList({
  websites,
  isDemoMode = false,
}: WebsiteListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Websites
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select a website to view analytics
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
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
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Add Website
        </Button>
      </div>

      {websites.length === 0 ? (
        <EmptyState onAdd={() => setDialogOpen(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {websites.map((site) => (
            <Link key={site.id} href={`/${site.id}`}>
              <Card className="group cursor-pointer p-6 transition-all duration-200 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
                    {site.name}
                  </h3>
                  <Badge variant={site.isActive ? "success" : "default"}>
                    {site.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  {site.domain}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <AddWebsiteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => {
          setDialogOpen(false);
          router.refresh();
        }}
        isDemoMode={isDemoMode}
      />
    </div>
  );
}
