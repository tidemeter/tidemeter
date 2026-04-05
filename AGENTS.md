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

### Build-time constraints (CI/CD)

The Docker image is built on GitHub Actions **without any database connection**. This means:

- **Do NOT** run migrations, DB queries, or seed data during `pnpm build` / `next build`
- **Do NOT** put top-level `await` or side-effects that contact a database in imported modules
- All database access in `payload.config.ts` must be inside the `onInit` callback (which runs at **runtime**, not build time)
- Dummy env vars (`DATABASE_URL`, `PAYLOAD_SECRET`, etc.) are passed as build args purely for type-checking
- Any new server-side dependency that uses native modules or requires network must be added to both `apps/web/package.json` (so Turbopack can resolve it) and `next.config.ts` `serverExternalPackages` (so it's not bundled)

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
- **Do NOT** connect to a database or run migrations at build time — all DB access happens at runtime via `onInit`
- Validate changes with `pnpm build && pnpm test` before committing

## Database Migrations & Demo Data

There is **no database connection at build time** (CI/CD builds on GitHub). All schema changes are applied **at runtime on first startup** via the `onInit` hook in `apps/web/src/payload.config.ts`.

### Two separate migration systems

#### 1. PayloadCMS schema (users, teams, websites, API keys, funnels)

PayloadCMS auto-pushes schema changes on startup — it compares its collection definitions against the actual database and applies DDL as needed. **No explicit migration files are required** for most changes (adding/removing fields, collections).

For breaking changes that need a data migration (renaming columns, transforming data):

1. Run `npx payload migrate:create` inside `apps/web/` to generate a migration file
2. Commit the migration file — PayloadCMS auto-runs pending migrations on next startup
3. Migration files go in `apps/web/src/migrations/` (auto-created by PayloadCMS CLI)

#### 2. Analytics schema (page_events, sessions, visitor_identities)

Uses a custom SQL migration runner (`packages/analytics/src/migrate.ts`) that auto-runs on every startup via `onInit`. Migration `.sql` files live in `packages/analytics/drizzle/`.

When changing analytics tables:

1. Update the Drizzle schema in `packages/analytics/src/schema/tables.ts`
2. Create a new numbered `.sql` file in `packages/analytics/drizzle/` (e.g. `0002_add_column.sql`)
3. The migration runs automatically on next app startup

### Demo data (`DEMO_MODE=true`)

When `DEMO_MODE=true` env var is set, the `onInit` hook seeds demo data via `apps/web/src/lib/seed-demo.ts`:

- Creates `demo@demo.com` / `demodemo` user
- Creates "Demo Website" (`demo.example.com`)
- Generates ~1500 analytics events with realistic patterns
- Creates 3 demo funnels
- Login page shows a banner with demo credentials

All seeding is **idempotent** — it checks for existing data and skips if already present.

### When database changes are made, you MUST

| Change type                                     | Required action                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| New/changed PayloadCMS collection fields        | PayloadCMS auto-handles it; for data migrations use `npx payload migrate:create`            |
| New/changed analytics tables or columns         | Add `.sql` migration in `packages/analytics/drizzle/`, update Drizzle schema in `tables.ts` |
| New collection or field visible in demo         | Update `apps/web/src/lib/seed-demo.ts` to seed demo data for it                             |
| Removed collection/field used by demo seed      | Update `apps/web/src/lib/seed-demo.ts` to remove references                                 |
| Changed `scripts/seed-demo.mjs` data generation | Mirror relevant changes in `apps/web/src/lib/seed-demo.ts` (server-side equivalent)         |

### Startup sequence (production / k8s)

```
Pod starts → PostgreSQL connects →
  PayloadCMS auto-creates/migrates its tables →
  onInit: runMigrations() applies analytics SQL migrations →
  onInit (if DEMO_MODE=true): seedDemoData() creates demo user + website + events →
  App ready to serve requests
```

## Documentation Sync

When changes are made to this repository that affect user-facing behavior, **also update the documentation** in the companion `tidemeter-website/` repository:

### What triggers a docs update

- New or changed environment variables → update `configuration.mdx`
- New or changed API endpoints → update `api.mdx`
- New or changed collections/fields → update `api.mdx` and `architecture.mdx`
- Tracker script changes (attributes, API, behavior) → update `tracker.mdx`
- New packages or architecture changes → update `architecture.mdx` and `index.mdx`
- Deployment or Docker changes → update `deployment.mdx`
- New prerequisites or setup steps → update `getting-started.mdx`
- FAQ-worthy changes → update `faq.mdx`
- Code convention changes → update `contributing.mdx`

### Files to update

| This repo change                     | Update in `tidemeter-website/`                                |
| ------------------------------------ | ------------------------------------------------------------- |
| `.env.example`, env var usage        | `src/content/configuration.mdx`                               |
| `apps/web/src/app/api/` routes       | `src/content/api.mdx`                                         |
| `packages/tracker/`                  | `src/content/tracker.mdx`                                     |
| `packages/analytics/` types/adapters | `src/content/architecture.mdx`                                |
| `apps/web/src/payload/collections/`  | `src/content/api.mdx`                                         |
| `docker/` files                      | `src/content/deployment.mdx`, `src/content/configuration.mdx` |
| Root `package.json` scripts          | `src/content/getting-started.mdx`                             |
| Code conventions                     | `src/content/contributing.mdx`                                |

### Also update in this repo

- **`README.md`** — Keep the quick start, environment variables table, architecture diagram, and project structure in sync with actual code.
