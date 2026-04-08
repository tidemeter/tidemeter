"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar, SidebarItem, SidebarSection } from "@tidemeter/ui";
import { ThemeToggle } from "@/components/theme-toggle";

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  roles: string[];
  avatarUrl?: string;
}

export interface ShellWebsite {
  id: string;
  name: string;
  domain: string;
}

function DashboardIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function HamburgerIcon() {
  return (
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
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3m16.5 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008z"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function FunnelIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
      />
    </svg>
  );
}

function RetentionIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
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
        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
      />
    </svg>
  );
}

function GlobeIcon() {
  return (
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
  );
}

function getInitials(user: { displayName?: string; email: string }): string {
  if (user.displayName) {
    return user.displayName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return user.email[0]?.toUpperCase() ?? "U";
}

export function DashboardShell({
  children,
  user,
  isDemoMode = false,
  websites = [],
}: {
  children: React.ReactNode;
  user: AuthUser | null;
  isDemoMode?: boolean;
  websites?: ShellWebsite[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sitePickerOpen, setSitePickerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const sitePickerRef = useRef<HTMLDivElement>(null);

  const isHome = pathname === "/" || pathname === "/dashboard";
  const isSettings = pathname === "/settings";
  const isStatus = pathname === "/status";

  // Extract websiteId from path if we're in a website context
  const pathParts = pathname.split("/").filter(Boolean);
  const websiteId =
    pathParts.length >= 1 &&
    pathParts[0] !== "settings" &&
    pathParts[0] !== "dashboard" &&
    pathParts[0] !== "status"
      ? pathParts[0]
      : null;
  const isVisitors = websiteId ? pathname.includes("/visitors") : false;
  const isFunnels = websiteId ? pathname.includes("/funnels") : false;
  const isRetention = websiteId ? pathname.includes("/retention") : false;

  const currentSite = websites.find((w) => w.id === websiteId);

  const logout = useCallback(async () => {
    await fetch("/api/users/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/login");
  }, [router]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (
        sitePickerRef.current &&
        !sitePickerRef.current.contains(e.target as Node)
      ) {
        setSitePickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const displayLabel = user?.displayName || user?.email || "Account";
  const initials = user ? getInitials(user) : "U";

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0b0b11]">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        footer={
          <SidebarSection title="Resources">
            <SidebarItem href="https://tidemeter.com/docs">
              <BookIcon />
              Documentation
            </SidebarItem>

            <SidebarItem href="https://github.com/tidemeter/tidemeter">
              <CodeIcon />
              GitHub
            </SidebarItem>

            <SidebarItem href="/status" active={isStatus}>
              <ServerIcon />
              System Status
            </SidebarItem>

            <SidebarItem href="https://github.com/tidemeter/tidemeter/releases">
              <HeartIcon />
              What&apos;s New
            </SidebarItem>
          </SidebarSection>
        }
      >
        <div className="space-y-1">
          <SidebarItem href="/" active={isHome}>
            <DashboardIcon />
            Dashboard
          </SidebarItem>

          {/* Site selector — shown when there are websites */}
          {websites.length > 0 && (
            <div className="relative px-1 py-2" ref={sitePickerRef}>
              <button
                type="button"
                onClick={() => setSitePickerOpen((prev) => !prev)}
                className="flex w-full items-center gap-2 rounded-lg border border-gray-200/80 bg-gray-100 px-3 py-2 text-left text-[13px] transition-all hover:bg-gray-200/70 dark:border-gray-700/60 dark:bg-gray-900/80 dark:hover:border-gray-600/60 dark:hover:bg-gray-800/80"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary-600/10 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                  <GlobeIcon />
                </span>
                <span className="flex-1 truncate font-medium text-gray-800 dark:text-gray-200">
                  {currentSite ? currentSite.name : "Select a site"}
                </span>
                <ChevronDownIcon />
              </button>
              {sitePickerOpen && (
                <div className="absolute left-1 right-1 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700/60 dark:bg-gray-950">
                  {websites.map((site) => (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => {
                        setSitePickerOpen(false);
                        router.push(`/${site.id}`);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        site.id === websiteId
                          ? "bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <GlobeIcon />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{site.name}</p>
                        <p className="truncate text-[11px] text-gray-400 dark:text-gray-500">
                          {site.domain}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Analytics nav — dimmed when no site is selected */}
          {websiteId ? (
            <>
              <SidebarItem href={`/${websiteId}/funnels`} active={isFunnels}>
                <FunnelIcon />
                Funnels
              </SidebarItem>
              <SidebarItem href={`/${websiteId}/visitors`} active={isVisitors}>
                <UsersIcon />
                User Journeys
              </SidebarItem>
              <SidebarItem
                href={`/${websiteId}/retention`}
                active={isRetention}
              >
                <RetentionIcon />
                Retention
              </SidebarItem>
            </>
          ) : (
            <div
              className="space-y-0.5 opacity-40 pointer-events-none select-none"
              aria-hidden
            >
              <SidebarItem href="#">
                <FunnelIcon />
                Funnels
              </SidebarItem>
              <SidebarItem href="#">
                <UsersIcon />
                User Journeys
              </SidebarItem>
              <SidebarItem href="#">
                <RetentionIcon />
                Retention
              </SidebarItem>
            </div>
          )}

          <SidebarItem href="/settings" active={isSettings}>
            <SettingsIcon />
            Settings
          </SidebarItem>
        </div>
      </Sidebar>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-sm sm:px-6 dark:border-gray-800 dark:bg-gray-950/60 dark:backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="cursor-pointer rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <HamburgerIcon />
          </button>

          <div className="hidden text-sm text-gray-400 lg:block dark:text-gray-500" />

          <div className="relative flex items-center gap-3" ref={menuRef}>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600">
                <span className="text-xs font-semibold text-white">
                  {initials}
                </span>
              </div>
              <span className="hidden text-[13px] font-medium sm:inline">
                {displayLabel}
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                {user && (
                  <div className="border-b border-gray-100 px-4 py-2.5 dark:border-gray-700">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {user.displayName || user.email}
                    </p>
                    {user.displayName && (
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
