<div align="center">

# TideMeter

**Self-hosted, privacy-focused web analytics for developers and small teams**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![PayloadCMS](https://img.shields.io/badge/PayloadCMS-3-blue)](https://payloadcms.com)
[![Docker Hub](https://img.shields.io/docker/pulls/tidemeter/tidemeter)](https://hub.docker.com/r/tidemeter/tidemeter)

[Website](https://tidemeter.com) · [Docs](https://tidemeter.com/docs) · [Live Demo](https://demo.tidemeter.com) · [Docker Hub](https://hub.docker.com/r/tidemeter/tidemeter)

<br />

<img src="tidemeter-dashboard-screenshot.png" alt="TideMeter Dashboard" width="100%" />

</div>

---

## Features

- **Privacy-focused** — no cookies, no fingerprinting, GDPR-friendly by design
- **Lightweight tracker** — ~1.5 KB gzipped, zero dependencies
- **Real-time dashboard** — interactive charts powered by Recharts
- **Funnels & journeys** — built-in conversion funnels and visitor path visualization
- **Multiple database support** — PostgreSQL, ClickHouse, or SQLite for analytics storage
- **Built on PayloadCMS 3 + Next.js 16** — modern, extensible full-stack architecture
- **Docker image on Docker Hub** — `docker pull tidemeter/tidemeter` and you're running
- **SPA support** — automatic history API interception for single-page apps
- **Custom event tracking** — track signups, clicks, purchases, anything
- **Team collaboration** — multi-user with role-based access
- **Public dashboards** — share read-only analytics views without requiring login
- **REST API** — query your analytics data programmatically

## Quick Start

### Option A: Docker Hub Image (Fastest)

Pull the pre-built image from [Docker Hub](https://hub.docker.com/r/tidemeter/tidemeter) — no cloning, no build step:

```bash
# Start a PostgreSQL database (skip if you already have one)
docker run -d \
  --name tidemeter-db \
  -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tidemeter \
  postgres:16-alpine

# Pull and run TideMeter
docker run -d \
  -p 3700:3000 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/tidemeter" \
  -e PAYLOAD_SECRET="your-secret-key-minimum-32-characters" \
  -e SESSION_SALT_SECRET="your-session-salt-minimum-32-characters" \
  -e NEXT_PUBLIC_APP_URL="http://localhost:3700" \
  tidemeter/tidemeter:latest
```

Browse all available tags on [Docker Hub → tidemeter/tidemeter](https://hub.docker.com/r/tidemeter/tidemeter).

Optional GeoIP location lookup uses the MaxMind GeoLite2 City database. With the Docker image, set your MaxMind credentials or a custom database URL and mount `/app/apps/web/data` to persistent storage. The container downloads the database on startup when it is missing; if the volume already contains `GeoLite2-City.mmdb`, the download is skipped.

```bash
docker volume create tidemeter-geoip
docker run -d \
  -p 3700:3000 \
  -v tidemeter-geoip:/app/apps/web/data \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/tidemeter" \
  -e PAYLOAD_SECRET="your-secret-key-minimum-32-characters" \
  -e SESSION_SALT_SECRET="your-session-salt-minimum-32-characters" \
  -e NEXT_PUBLIC_APP_URL="http://localhost:3700" \
  -e MAXMIND_ACCOUNT_ID="your-account-id" \
  -e MAXMIND_LICENSE_KEY="your-license-key" \
  tidemeter/tidemeter:latest
```

You can also set `GEO_DATABASE_URL` to a direct `.mmdb` or `.tar.gz` URL instead of using MaxMind credentials.

### Option B: Docker Compose

Clone the repo and bring up everything (app + database) with one command:

```bash
git clone https://github.com/tidemeter/tidemeter.git
cd tidemeter
cp apps/web/.env.example .env
# Edit .env — at minimum, set PAYLOAD_SECRET and SESSION_SALT_SECRET
docker compose -f docker/docker-compose.yml up -d
```

Visit **http://localhost:3700** to create your admin account and add your first website.

> **Full documentation**: [tidemeter.com/docs](https://tidemeter.com/docs)

## Development Setup

For contributors and anyone who wants to build from source.

### Prerequisites

- [Node.js](https://nodejs.org) 22+
- [pnpm](https://pnpm.io) 9+
- [PostgreSQL](https://www.postgresql.org) 16+ (or use Docker for the database)

### Install & Run

```bash
git clone https://github.com/tidemeter/tidemeter.git
cd tidemeter
pnpm install

cp apps/web/.env.example apps/web/.env
# Edit .env — point DATABASE_URL to your PostgreSQL instance

pnpm dev        # Start dev server with Turbopack HMR
pnpm build      # Production build
pnpm test       # Run tests
pnpm lint       # Lint
```

The dev server starts at **http://localhost:3700**.

## Adding the Tracker

Add the tracking script to any website you want to monitor. The `data-website-id` is the auto-generated **public Website ID** shown under **Settings → Tracking Code** for the site (a short random identifier, not a sequential number).

```html
<script
  defer
  data-website-id="YOUR_WEBSITE_ID"
  src="https://your-tidemeter-domain.com/t.js"
></script>
```

### Script Attributes

| Attribute          | Description                                                    | Default       |
| ------------------ | -------------------------------------------------------------- | ------------- |
| `data-website-id`  | **(required)** Public Website ID from Settings → Tracking Code | —             |
| `data-host-url`    | Override the analytics endpoint URL                            | Script origin |
| `data-auto-track`  | Auto-track pageviews                                           | `true`        |
| `data-respect-dnt` | Respect the Do-Not-Track header                                | `true`        |
| `data-domains`     | Comma-separated list of allowed domains                        | All domains   |

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

All configuration is done through environment variables. For Docker Compose, copy `apps/web/.env.example` to `.env` in the repository root. For local development, copy it to `apps/web/.env`.

| Variable                      | Description                                                    | Default                                                     |
| ----------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`                | PostgreSQL connection string for PayloadCMS                    | `postgresql://tidemeter:tidemeter@localhost:5432/tidemeter` |
| `PAYLOAD_SECRET`              | Secret for PayloadCMS auth (min 32 chars)                      | —                                                           |
| `ANALYTICS_DB_TYPE`           | Analytics storage engine: `postgresql`, `clickhouse`, `sqlite` | `postgresql`                                                |
| `ANALYTICS_DATABASE_URL`      | Connection string for analytics DB (PostgreSQL)                | Same as `DATABASE_URL`                                      |
| `CLICKHOUSE_URL`              | ClickHouse HTTP endpoint                                       | `http://localhost:8123`                                     |
| `CLICKHOUSE_DATABASE`         | ClickHouse database name                                       | `tidemeter_analytics`                                       |
| `ANALYTICS_SQLITE_PATH`       | Path to SQLite file (when using SQLite)                        | `./data/analytics.db`                                       |
| `NEXT_PUBLIC_APP_URL`         | Public URL of the application                                  | `http://localhost:3700`                                     |
| `SESSION_SALT_SECRET`         | Secret for hashing visitor IDs (rotated daily)                 | —                                                           |
| `GEOIP_DB_PATH`               | Path to MaxMind GeoLite2-City.mmdb (optional)                  | Docker: `/app/apps/web/data/GeoLite2-City.mmdb`             |
| `MAXMIND_ACCOUNT_ID`          | MaxMind account ID for downloading GeoLite2 City (optional)    | —                                                           |
| `MAXMIND_LICENSE_KEY`         | MaxMind license key for downloading GeoLite2 City (optional)   | —                                                           |
| `GEO_DATABASE_URL`            | Direct `.mmdb` or `.tar.gz` GeoIP database URL (optional)      | —                                                           |
| `DEMO_MODE`                   | Seed `demo@demo.com` user, sample website, events, and funnels | `false`                                                     |
| `RESEND_API_KEY`              | Resend API key — if set, email is sent via Resend HTTP API     | —                                                           |
| `SMTP_HOST`                   | SMTP server for password reset / verification email (optional) | —                                                           |
| `SMTP_PORT`                   | SMTP server port                                               | `587`                                                       |
| `SMTP_USER` / `SMTP_PASSWORD` | SMTP credentials                                               | —                                                           |
| `SMTP_FROM_ADDRESS`           | From address for outgoing email                                | `no-reply@localhost`                                        |
| `SMTP_FROM_NAME`              | From name for outgoing email                                   | `TideMeter`                                                 |

See [`apps/web/.env.example`](apps/web/.env.example) for the full annotated reference.

### GeoIP Location Lookup

TideMeter can enrich events with country, region, and city from an IP address when a MaxMind GeoLite2 City database is available. Without a database, location fields stay empty and ingestion continues normally.

For Docker and Docker Compose, the image defaults `GEOIP_DB_PATH` to `/app/apps/web/data/GeoLite2-City.mmdb`. Provide either `MAXMIND_ACCOUNT_ID` + `MAXMIND_LICENSE_KEY`, or `GEO_DATABASE_URL`, and mount `/app/apps/web/data` to persistent storage. On each container start, TideMeter downloads the database only if that file is missing.

For local development or a self-built server:

```bash
cd apps/web
MAXMIND_ACCOUNT_ID="..." MAXMIND_LICENSE_KEY="..." pnpm geoip:download
```

Then set `GEOIP_DB_PATH=./data/GeoLite2-City.mmdb` before starting the app.

## First Admin & Email

On the very first boot the database has no users. Visit `/admin` and PayloadCMS will redirect you to `/admin/create-first-user` to create the initial admin account — **no email server required**. Subsequent users are created from the admin panel by an existing admin.

Email is **optional**:

- If you never use "forgot password" (e.g. a single-user, private deployment) you can leave it unconfigured. Payload will print a one-time `WARN: No email adapter provided` on startup and any email it would send is written to stdout.
- To enable real delivery TideMeter supports two backends, picked in this order:
  1. **Resend** — set `RESEND_API_KEY`. Uses Resend's HTTP API via `@payloadcms/email-resend` (no SMTP port required).
  2. **SMTP / Nodemailer** — set `SMTP_HOST`. Works with any SMTP provider (your own Postfix, Gmail, SendGrid, Mailgun, Postmark, AWS SES, …).

```env
# Either set this …
RESEND_API_KEY=re_xxxxxxxxxxxx

# … or these:
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-username   # SendGrid: literal "apikey"; Mailgun: postmaster@<domain>; Gmail: full address
SMTP_PASSWORD=your-smtp-password

# Shared "From" header (applies to both backends):
SMTP_FROM_ADDRESS=no-reply@your-domain.com
SMTP_FROM_NAME=TideMeter
```

You can also change your password at any time from the admin panel (`/admin/account`) without needing email.

## Database Migrations

**Migrations run automatically when a new image starts — there is no manual `migrate` command.**

When the app boots and first initializes PayloadCMS:

1. PayloadCMS schema is applied:
   - **Development** (`NODE_ENV != "production"`): Drizzle "push" mode auto-diffs collections vs the database and applies DDL on every boot. Fast iteration, no migration files required.
   - **Production** (`NODE_ENV == "production"`): the versioned migrations in [`apps/web/src/migrations/`](apps/web/src/migrations/) are applied via `payload.db.migrate()`. Each migration is recorded in the `payload_migrations` table and skipped on subsequent boots.
2. The analytics package applies any pending SQL migrations from `packages/analytics/drizzle/` (or ClickHouse migrations from `packages/analytics/clickhouse/` when `ANALYTICS_DB_TYPE=clickhouse`). A Postgres advisory lock serializes concurrent runners, so rolling deploys with multiple replicas are safe.
3. If `DEMO_MODE=true`, demo data is seeded (idempotent — see [Demo Mode](#demo-mode)).

If **any** of these steps fail, `onInit` re-throws and the pod fails its readiness probe. Kubernetes then halts the rollout and keeps the previous version serving traffic. Logs always end with the failing step.

Init is triggered by any request that imports the Payload config — including `/api/health`, which is hit by the readiness/startup probes. So a freshly-rolled pod self-migrates as soon as the probe starts. The database user just needs `CREATE` privileges.

> **No tables right after deploy?** That's expected for a few seconds. Migrations don't run at process start — they run on the **first request** that touches Payload. If you `kubectl apply` and immediately inspect the DB, it will be empty until the readiness probe hits `/api/health` (or you `curl` it yourself). Once the pod reports `Ready`, the schema is in place. If tables still don't appear, check pod logs for `[payload:onInit]` errors and verify the `DATABASE_URL` role has `CREATE` privileges.

> The first probe after a fresh pod start can take longer than usual (especially with `DEMO_MODE=true`, which generates ~1500 analytics events). The Helm/Kustomize manifests in `cluster/apps/tidemeter/` use a `startupProbe` to give init enough time.

### Adding a schema change (production)

When you change a Payload collection (add a field, new collection, etc.):

1. In a dev environment with `NODE_ENV=development`, push mode applies the change instantly to your local DB.
2. Generate a versioned migration for production:

   ```bash
   cd apps/web && pnpm exec payload migrate:create
   ```

3. Commit the new file under `apps/web/src/migrations/` plus the regenerated `index.ts`. The next image build picks it up and applies it on boot.

For analytics tables, add a new numbered `.sql` file in `packages/analytics/drizzle/` (e.g. `0002_add_column.sql`) and update the Drizzle schema in `packages/analytics/src/schema/tables.ts`.

### Upgrading an old deployment created in push mode

If your existing database was created by an older TideMeter image (which used Drizzle push in production), the schema is already there but the `payload_migrations` table is empty — the new migration runner would fail trying to recreate existing tables. Two options:

- **One-shot push override**: set `PAYLOAD_DB_PUSH=true` for a single boot, let push reconcile, then unset it. Subsequent boots use migrations.
- **Baseline manually**: insert a row marking the initial migration as applied:

  ```sql
  INSERT INTO payload_migrations (name, batch, created_at, updated_at)
  VALUES ('20260405_190832', 1, NOW(), NOW());
  ```

  Then restart the pod normally.

## Demo Mode

Set `DEMO_MODE=true` to boot a fully-populated instance — useful for evaluating TideMeter, recording screenshots, or running a public sandbox. On first startup the container will:

- Create a demo user (`demo@demo.com` / `demodemo`)
- Create a sample website (`demo.example.com`)
- Generate ~1500 analytics events spanning the last 90 days
- Create three example funnels

Seeding is idempotent — it runs only when the demo data is missing, so restarts and upgrades are safe.

```bash
# Docker run
docker run -d -p 3700:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e PAYLOAD_SECRET="..." \
  -e SESSION_SALT_SECRET="..." \
  -e DEMO_MODE=true \
  tidemeter/tidemeter:latest

# Docker Compose overlay (PostgreSQL + DEMO_MODE=true)
docker compose -f docker/docker-compose.yml -f docker/docker-compose.demo.yml up -d
```

A public instance built with this flag is available at [demo.tidemeter.com](https://demo.tidemeter.com).

## ClickHouse Mode

For high-traffic sites, use ClickHouse as the analytics storage engine. The override compose file adds a ClickHouse container and reconfigures the app:

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.ch.yml up -d
```

This starts PostgreSQL (for PayloadCMS) + ClickHouse (for analytics) + the TideMeter app.

## Deployment

TideMeter runs anywhere Docker runs. Minimum requirements: 1 CPU core, 1 GB RAM.

For production, place TideMeter behind a reverse proxy (Nginx, Caddy, Traefik) for HTTPS. See the [Deployment Guide](https://tidemeter.com/docs/deployment) for Nginx/Caddy examples, Railway, Fly.io, and DigitalOcean instructions.

### Production Checklist

- [ ] `NODE_ENV=production`
- [ ] `PAYLOAD_SECRET` — strong random value (32+ characters)
- [ ] `SESSION_SALT_SECRET` — strong random value
- [ ] `NEXT_PUBLIC_APP_URL` — your actual domain
- [ ] HTTPS via reverse proxy
- [ ] Database backups scheduled

## Tech Stack

| Layer         | Technology                       |
| ------------- | -------------------------------- |
| Framework     | Next.js 16                       |
| CMS           | PayloadCMS 3                     |
| Styling       | Tailwind CSS 4                   |
| Charts        | Recharts                         |
| State         | React Hooks                      |
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
