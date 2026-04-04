# AGENTS.md — TideMeter

> Self-hosted, privacy-focused web analytics platform.

## Project Overview

TideMeter is a Turborepo monorepo with four packages:

| Package                | Path                  | Purpose                                         |
| ---------------------- | --------------------- | ----------------------------------------------- |
| `@tidemeter/web`       | `apps/web/`           | Next.js 16.2 + PayloadCMS 3 application         |
| `@tidemeter/tracker`   | `packages/tracker/`   | Lightweight tracking script (~1.5KB gzip)       |
| `@tidemeter/analytics` | `packages/analytics/` | Analytics data layer (Drizzle ORM + ClickHouse) |
| `@tidemeter/ui`        | `packages/ui/`        | Shared React UI components                      |

**Stack**: Next.js 16.2, PayloadCMS 3, Tailwind CSS 4, Recharts, Drizzle ORM, TypeScript 5.9, pnpm 9

## Setup

```bash
pnpm install          # Install all dependencies
cp .env.example .env  # Configure environment variables
pnpm dev              # Start dev server (port 3700)
```

## Build, Test & Lint

```bash
pnpm build                   # Build all packages (turbo)
pnpm test                    # Run all tests (vitest)
pnpm turbo build --force     # Force rebuild (no cache)
```

Individual packages:

```bash
pnpm --filter @tidemeter/web build
pnpm --filter @tidemeter/analytics test
pnpm --filter @tidemeter/tracker build
```

**Note**: The web app build requires `DATABASE_URL` to be set (even a dummy value works for type-checking):

```bash
DATABASE_URL="postgresql://x:x@localhost:5480/x" pnpm build
```

## Architecture

### Dual Database Pattern

- **PayloadCMS** manages app data (users, teams, websites, API keys) in PostgreSQL
- **Analytics** data (page events, sessions) stored separately via `@tidemeter/analytics` adapters
- Adapter pattern: `PostgresAnalyticsRepository`, `ClickHouseAnalyticsRepository`

### Authentication

- PayloadCMS built-in auth via `Users` collection (`auth: true`)
- Cookie-based: `payload-token` HTTP-only cookie
- Route protection via `proxy.ts` (Next.js 16 pattern — **NOT middleware.ts**)
- Login: `POST /api/users/login`, Logout: `POST /api/users/logout`, Session: `GET /api/users/me`

### Event Ingestion Pipeline

1. Tracker script sends `POST /api/collect` with page view data
2. `processor.ts` parses UA, generates visitor/session IDs (SHA-256 hash, no cookies)
3. `buffer.ts` batches events (100 events or 5s flush interval)
4. Repository adapter writes to database

### Next.js 16 Specifics

- Uses `proxy.ts` (not `middleware.ts`) for request interception
- Turbopack is the default bundler
- `use cache` directive available (not yet used)
- PayloadCMS catch-all routes at `(payload)/admin/[[...segments]]/`

## Code Conventions

- **TypeScript strict mode**, no `any` unless absolutely necessary
- **Named exports** for all modules (no default exports except Next.js pages/layouts)
- **Functional patterns** — pure functions, immutable data where practical
- **No `.js` extensions** in TypeScript imports (Turbopack doesn't resolve them)
- **Tailwind CSS 4** with CSS-first config (`@theme` in globals.css, no tailwind.config)
- Components use `cn()` utility from `@tidemeter/ui` for class merging

## Directory Structure

```
apps/web/src/
├── app/
│   ├── (app)/           # Protected dashboard routes
│   ├── (auth)/          # Login page (public)
│   ├── (payload)/       # PayloadCMS admin routes
│   └── api/             # API routes (collect, stats, health)
├── components/
│   ├── analytics/       # Charts, breakdowns, overview
│   ├── auth/            # Login form
│   └── dashboard/       # Shell, website list, settings
├── hooks/               # useAuth, useAnalytics
├── lib/
│   ├── ingestion/       # Event processor + buffer
│   └── utils/           # Date helpers
└── payload/
    └── collections/     # PayloadCMS collection configs

packages/analytics/src/
├── adapters/            # postgres.ts, clickhouse.ts
├── schema/              # Drizzle table definitions
├── types.ts             # Core interfaces
├── factory.ts           # Repository factory
└── migrate.ts           # SQL migration runner

packages/tracker/src/
└── index.ts             # IIFE tracking script

packages/ui/src/
├── card.tsx, button.tsx, badge.tsx, spinner.tsx
├── stat-card.tsx, data-table.tsx, date-range-picker.tsx
└── sidebar.tsx
```

## PayloadCMS Patterns

- Collections are in `apps/web/src/payload/collections/`
- Access control uses function pattern: `({ req }) => boolean | Where`
- Config at `apps/web/src/payload.config.ts` with `importMap.baseDir`
- REST API at `/api/{collection-slug}` (e.g., `/api/users`, `/api/websites`)
- Admin panel at `/admin` (catch-all route with importMap + serverFunction)
- See `apps/web/AGENTS.md` for detailed PayloadCMS conventions

## Docker

```bash
# PostgreSQL stack
docker compose -f docker/docker-compose.yml up -d

# With ClickHouse
docker compose -f docker/docker-compose.yml -f docker/docker-compose.ch.yml up -d
```

Ports: App=3700, PostgreSQL=5480, ClickHouse HTTP=8124, ClickHouse native=9001

## Boundaries

- **Do NOT** modify files in `old1/` or `old2/` — these are old repos (gitignored)
- **Do NOT** commit `.env` or secrets
- **Do NOT** use `middleware.ts` — use `proxy.ts` (Next.js 16)
- **Do NOT** use `.js` extensions in TypeScript imports
- Validate changes with `pnpm build && pnpm test` before committing
