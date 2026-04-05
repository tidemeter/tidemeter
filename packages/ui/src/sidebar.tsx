"use client";

import React from "react";
import { cn } from "./utils";

interface SidebarProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  open?: boolean;
  onClose?: () => void;
}

function TideMeterLogo() {
  return (
    <svg className="h-7 w-7 text-blue-600" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="8" fill="currentColor" />
      <path
        d="M7 18 L10 12 L14 16 L18 9 L21 13"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Sidebar({
  children,
  footer,
  className,
  open,
  onClose,
}: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-gray-200/80 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 dark:border-gray-800 dark:bg-gray-950",
          open ? "translate-x-0" : "-translate-x-full",
          className,
        )}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-gray-200/80 px-5 dark:border-gray-800">
          <a
            href="https://tidemeter.com"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <TideMeterLogo />
            <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
              TideMeter
            </span>
          </a>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">{children}</nav>
        {footer && (
          <div className="shrink-0 border-t border-gray-200/80 px-3 py-4 dark:border-gray-800">
            {footer}
          </div>
        )}
        <div className="border-t border-gray-200/80 px-4 py-3 dark:border-gray-800">
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            Privacy-first analytics
          </p>
        </div>
      </aside>
    </>
  );
}

interface SidebarItemProps {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}

export function SidebarItem({
  href,
  icon,
  children,
  active,
}: SidebarItemProps) {
  const isExternal = href.startsWith("http");
  return (
    <a
      href={href}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
        active
          ? "bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-900/30 dark:text-blue-300"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-100",
      )}
    >
      {icon && <span className="h-5 w-5">{icon}</span>}
      {children}
      {isExternal && (
        <svg
          className="ml-auto h-3.5 w-3.5 opacity-40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
          />
        </svg>
      )}
    </a>
  );
}

export function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
