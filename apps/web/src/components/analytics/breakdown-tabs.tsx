"use client";

import React, { useState } from "react";
import { cn } from "@tidemeter/ui";
import { BreakdownPanel } from "./breakdown-panel";
import type { BreakdownResult, BreakdownProperty } from "@tidemeter/analytics";

interface BreakdownTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  panels: { property: BreakdownProperty; title: string }[];
}

const TABS: BreakdownTab[] = [
  {
    id: "pages",
    label: "Pages",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    ),
    panels: [
      { property: "url_path", title: "Top Pages" },
      { property: "entry_page", title: "Entry Pages" },
      { property: "exit_page", title: "Exit Pages" },
    ],
  },
  {
    id: "sources",
    label: "Sources",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-1.627a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.35 8.798"
        />
      </svg>
    ),
    panels: [
      { property: "referrer_domain", title: "Referrers" },
      { property: "utm_source", title: "UTM Source" },
      { property: "utm_medium", title: "UTM Medium" },
      { property: "utm_campaign", title: "UTM Campaign" },
    ],
  },
  {
    id: "locations",
    label: "Locations",
    icon: (
      <svg
        className="h-4 w-4"
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
    ),
    panels: [
      { property: "country", title: "Countries" },
      { property: "region", title: "Regions" },
      { property: "city", title: "Cities" },
    ],
  },
  {
    id: "technology",
    label: "Technology",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z"
        />
      </svg>
    ),
    panels: [
      { property: "browser", title: "Browsers" },
      { property: "os", title: "Operating Systems" },
      { property: "device_type", title: "Devices" },
      { property: "screen_size", title: "Screen Sizes" },
    ],
  },
];

interface BreakdownTabsProps {
  breakdowns: Record<BreakdownProperty, BreakdownResult>;
  onFilterAdd?: (property: string, value: string) => void;
}

export function BreakdownTabs({ breakdowns, onFilterAdd }: BreakdownTabsProps) {
  const [activeTab, setActiveTab] = useState("pages");

  const currentTab = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800/50">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {currentTab.panels.map(({ property, title }) => (
          <BreakdownPanel
            key={property}
            title={title}
            data={breakdowns[property]}
            onItemClick={
              onFilterAdd ? (value) => onFilterAdd(property, value) : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
