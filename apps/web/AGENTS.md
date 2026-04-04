# AGENTS.md — @tidemeter/web

> Next.js 16.2 + PayloadCMS 3 web application for TideMeter analytics.

## Quick Reference

```bash
pnpm dev                    # Start dev server (port 3700)
pnpm build                  # Production build (requires DATABASE_URL)
pnpm test                   # Run vitest tests
```

## Next.js 16 Conventions

### proxy.ts (NOT middleware.ts)

Next.js 16 replaced `middleware.ts` with `proxy.ts`. The exported function is `proxy()`, not `middleware()`.

- File: `src/proxy.ts`
- Runs on Node.js runtime (not Edge)
- Used for lightweight route protection (cookie check + redirect)
- Do NOT put heavy logic here (DB queries, JWT verification) — do that in server components/API routes

### Route Groups

```
src/app/
├── (app)/        # Protected routes — require payload-token cookie
├── (auth)/       # Public routes — login page
├── (payload)/    # PayloadCMS admin — managed by PayloadCMS (has own CSS/layout)
├── (share)/      # Public shared dashboards
└── api/          # API routes
```

### Turbopack

- Default bundler in Next.js 16 — do NOT use `.js` extensions in TS imports
- Internal packages transpiled via `transpilePackages` in next.config.ts
- Server-only packages declared in `serverExternalPackages`

## PayloadCMS 3 Patterns

### Configuration

- Config: `src/payload.config.ts`
- Uses `importMap.baseDir` in admin config (required for PayloadCMS 3.80+)
- `__dirname` derived via `fileURLToPath(import.meta.url)` (not `import.meta.dirname` — Turbopack doesn't support it)

### Collections

Located in `src/payload/collections/`:

| Collection  | Slug           | Auth | Purpose                                        |
| ----------- | -------------- | ---- | ---------------------------------------------- |
| Users       | `users`        | ✅   | User accounts with roles (admin/user)          |
| Websites    | `websites`     | -    | Tracked websites, linked to creator            |
| Teams       | `teams`        | -    | Team collaboration groups                      |
| TeamMembers | `team-members` | -    | Junction table with roles (owner/admin/viewer) |
| ApiKeys     | `api-keys`     | -    | API access tokens (hashed)                     |

### REST API Endpoints (built-in)

- `POST /api/users/login` — authenticate, sets `payload-token` cookie
- `POST /api/users/logout` — clear session
- `GET /api/users/me` — current user
- `GET /api/{slug}` — list documents
- `POST /api/{slug}` — create document
- `PATCH /api/{slug}/:id` — update document
- `DELETE /api/{slug}/:id` — delete document

All requests requiring auth must include `credentials: 'include'` for cookie forwarding.

### Access Control Pattern

```typescript
access: {
  read: ({ req }) => {
    if (req.user?.role === 'admin') return true;
    if (req.user) return { createdBy: { equals: req.user.id } };
    return false;
  },
}
```

### Admin Panel Routes

```
src/app/(payload)/admin/[[...segments]]/
├── layout.tsx      # RootLayout with importMap + serverFunction
├── page.tsx        # RootPage with importMap
└── importMap.ts    # Auto-generated (run pnpm generate:importmap to regenerate)
```

### Getting Payload Instance (Server Components / API Routes)

```typescript
import { getPayload } from "payload";
import config from "@payload-config";

const payload = await getPayload({ config });
const { docs } = await payload.find({ collection: "websites" });
```

### Security Pitfalls

- Local API bypasses access control by default — use `overrideAccess: false` when operating on behalf of a user
- Always pass `req` to nested operations in hooks to maintain transaction atomicity
- Use `context` flags to prevent infinite hook loops

## Analytics API Routes

| Route                               | Method | Purpose                                |
| ----------------------------------- | ------ | -------------------------------------- |
| `/api/collect`                      | POST   | Event ingestion (public, CORS enabled) |
| `/api/health`                       | GET    | Health check (public)                  |
| `/api/stats/[websiteId]/summary`    | GET    | Aggregate stats                        |
| `/api/stats/[websiteId]/timeseries` | GET    | Time series data                       |
| `/api/stats/[websiteId]/breakdown`  | GET    | Breakdown by property                  |
| `/api/stats/[websiteId]/active`     | GET    | Active visitors count                  |

## Component Patterns

### Client Components

- Must have `'use client'` directive
- Use `useAuth()` hook for current user
- Use `useQuery()` from `@tanstack/react-query` for data fetching
- Import UI components from `@tidemeter/ui`

### Data Fetching

- Dashboard components fetch from PayloadCMS REST API (`/api/{slug}`)
- Analytics components use hooks in `src/hooks/use-analytics.ts`
- All fetches include `credentials: 'include'` for cookie auth

### Styling

- Tailwind CSS 4 with `@theme` in `globals.css`
- Custom color scale: `primary-50` through `primary-900` (blue)
- Use `cn()` from `@tidemeter/ui` for conditional classes
- Cards: `rounded-xl border shadow-sm`
- Loading: use `.skeleton` class for animated placeholders

## Testing

- Vitest with path alias `@` → `./src`
- Tests in `src/__tests__/`
- Current tests: ingestion pipeline (visitor ID hashing, session ID, bot filtering)

## Boundaries

- Do NOT create `middleware.ts` — use `proxy.ts`
- Do NOT use `import.meta.dirname` — use `fileURLToPath` pattern
- Do NOT add `.js` extensions to TypeScript imports
- Do NOT put heavy auth logic in `proxy.ts` — only cookie presence checks
