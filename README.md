<div align="center">

# TideMeter

**Self-hosted, privacy-focused web analytics**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![PayloadCMS](https://img.shields.io/badge/PayloadCMS-3-blue)](https://payloadcms.com)

</div>

---

## Features

- **Privacy-focused** — no cookies, no fingerprinting, GDPR-friendly by design
- **Lightweight tracker** — ~1.5 KB gzipped, zero dependencies
- **Real-time dashboard** — interactive charts powered by Recharts
- **Multiple database support** — PostgreSQL, ClickHouse, or SQLite for analytics storage
- **Built on PayloadCMS 3 + Next.js 16** — modern, extensible full-stack architecture
- **Docker Compose** — one-command self-hosting
- **SPA support** — automatic history API interception for single-page apps
- **Custom event tracking** — track signups, clicks, purchases, anything
- **Team collaboration** — multi-user with role-based access
- **API for programmatic access** — query your analytics data from anywhere

## Quick Start (Docker)

```bash
git clone https://github.com/your-org/tidemeter.git
cd tidemeter
cp .env.example .env
# Edit .env with your settings (at minimum, change PAYLOAD_SECRET and SESSION_SALT_SECRET)
docker compose -f docker/docker-compose.yml up -d
```

Visit **http://localhost:3000** to create your admin account and add your first website.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org) 22+
- [pnpm](https://pnpm.io) 9+
- [PostgreSQL](https://www.postgresql.org) 16+ (or use Docker for the database)

### Install & Run

```bash
# Install dependencies
pnpm install

# Create your environment file
cp .env.example .env
# Edit .env — point DATABASE_URL / ANALYTICS_DATABASE_URL to your PostgreSQL instance

# Start all packages in dev mode
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint

# Run analytics database migrations
pnpm db:migrate
```

The dev server starts at **http://localhost:3000** with Turbopack HMR.

## Adding the Tracker

Add the tracking script to any website you want to monitor. The `data-website-id` comes from your TideMeter dashboard after adding a site.

```html
<script
  defer
  data-website-id="YOUR_WEBSITE_ID"
  src="https://your-tidemeter-domain.com/t.js"
></script>
```

### Script Attributes

| Attribute          | Description                                   | Default       |
| ------------------ | --------------------------------------------- | ------------- |
| `data-website-id`  | **(required)** Website ID from your dashboard | —             |
| `data-host-url`    | Override the analytics endpoint URL           | Script origin |
| `data-auto-track`  | Auto-track pageviews                          | `true`        |
| `data-respect-dnt` | Respect the Do-Not-Track header               | `true`        |
| `data-domains`     | Comma-separated list of allowed domains       | All domains   |

### Custom Events

```javascript
// Track a named event
tidemeter.track("signup", { plan: "pro" });

// Track a pageview manually (when auto-track is disabled)
tidemeter.track();
```

## Architecture

TideMeter is a **Turborepo monorepo** with a clear separation between the application layer and the analytics data layer.

```
┌─────────────────────────────────────────────┐
│                  apps/web                   │
│        Next.js 16 + PayloadCMS 3            │
│     (dashboard, admin, API routes)          │
├──────────────┬──────────────┬───────────────┤
│ @tidemeter/  │ @tidemeter/  │ @tidemeter/   │
│   tracker    │  analytics   │      ui       │
│  (t.js)      │ (Drizzle ORM)│  (components) │
└──────────────┴──────┬───────┴───────────────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
      PostgreSQL  ClickHouse   SQLite
```

- **Dual database design** — PayloadCMS manages application data (users, sites, settings) in PostgreSQL; analytics events are stored in a separate database that can be PostgreSQL, ClickHouse, or SQLite.
- **Repository pattern** — the `@tidemeter/analytics` package defines an `AnalyticsRepository` interface with swappable adapters (`postgres`, `clickhouse`), selected at runtime via the `ANALYTICS_DB_TYPE` env var.
- **Tracker** — `@tidemeter/tracker` compiles to a single `t.js` file via Rollup, served as a static asset.

## Configuration

All configuration is done through environment variables. Copy `.env.example` to `.env` and adjust:

| Variable                 | Description                                                    | Default                                                     |
| ------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`           | PostgreSQL connection string for PayloadCMS                    | `postgresql://tidemeter:tidemeter@localhost:5432/tidemeter` |
| `PAYLOAD_SECRET`         | Secret for PayloadCMS auth (min 32 chars)                      | —                                                           |
| `ANALYTICS_DB_TYPE`      | Analytics storage engine: `postgresql`, `clickhouse`, `sqlite` | `postgresql`                                                |
| `ANALYTICS_DATABASE_URL` | Connection string for analytics DB (PostgreSQL)                | Same as `DATABASE_URL`                                      |
| `CLICKHOUSE_URL`         | ClickHouse HTTP endpoint                                       | `http://localhost:8123`                                     |
| `CLICKHOUSE_DATABASE`    | ClickHouse database name                                       | `tidemeter_analytics`                                       |
| `ANALYTICS_SQLITE_PATH`  | Path to SQLite file (when using SQLite)                        | `./data/analytics.db`                                       |
| `NEXT_PUBLIC_APP_URL`    | Public URL of the application                                  | `http://localhost:3000`                                     |
| `SESSION_SALT_SECRET`    | Secret for hashing visitor IDs (rotated daily)                 | —                                                           |
| `GEOIP_DB_PATH`          | Path to MaxMind GeoLite2-City.mmdb (optional)                  | —                                                           |

See [`.env.example`](.env.example) for the full annotated reference.

## ClickHouse Mode

For high-traffic sites, use ClickHouse as the analytics storage engine. The override compose file adds a ClickHouse container and reconfigures the app:

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.ch.yml up -d
```

This starts PostgreSQL (for PayloadCMS) + ClickHouse (for analytics) + the TideMeter app.

## Tech Stack

| Layer         | Technology                       |
| ------------- | -------------------------------- |
| Framework     | Next.js 16                       |
| CMS           | PayloadCMS 3                     |
| Styling       | Tailwind CSS 4                   |
| Charts        | Recharts                         |
| State         | Zustand + TanStack Query         |
| Analytics ORM | Drizzle ORM                      |
| Build         | Turborepo + pnpm                 |
| Runtime       | Node.js 22 (Alpine)              |
| Docker        | Multi-stage Dockerfile + Compose |

## Project Structure

```
tidemeter/
├── apps/
│   └── web/                 # Next.js 16 + PayloadCMS application
├── packages/
│   ├── analytics/           # Analytics data layer (Drizzle ORM, adapters)
│   │   └── src/
│   │       ├── adapters/    # postgres, clickhouse implementations
│   │       ├── schema/      # Drizzle table definitions
│   │       ├── types.ts     # Core interfaces (AnalyticsRepository, etc.)
│   │       └── factory.ts   # Adapter factory
│   ├── tracker/             # Lightweight tracking script (Rollup → t.js)
│   ├── ui/                  # Shared UI components
│   └── tsconfig/            # Shared TypeScript configs
├── docker/
│   ├── Dockerfile           # Multi-stage production build
│   ├── docker-compose.yml   # Default stack (PostgreSQL)
│   ├── docker-compose.ch.yml # ClickHouse override
│   └── clickhouse/          # ClickHouse init scripts
├── turbo.json               # Turborepo pipeline config
├── pnpm-workspace.yaml      # pnpm workspace definition
└── package.json             # Root scripts (dev, build, test, lint)
```

## License

[MIT](LICENSE) © 2026 TideMeter
