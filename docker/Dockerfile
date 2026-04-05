# ============================================
# TideMeter — Multi-stage Production Build
# ============================================

# --- Stage 1: Dependencies ---
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/tracker/package.json ./packages/tracker/
COPY packages/analytics/package.json ./packages/analytics/
COPY packages/ui/package.json ./packages/ui/
COPY packages/tsconfig/package.json ./packages/tsconfig/

RUN pnpm install --frozen-lockfile || pnpm install

# --- Stage 2: Builder ---
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

ARG DATABASE_URL=postgresql://tidemeter:tidemeter@127.0.0.1:5432/tidemeter
ARG ANALYTICS_DATABASE_URL=postgresql://tidemeter:tidemeter@127.0.0.1:5432/tidemeter
ARG PAYLOAD_SECRET=build-only-secret-change-me
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG SESSION_SALT_SECRET=build-only-session-salt
ENV DATABASE_URL=$DATABASE_URL \
    ANALYTICS_DATABASE_URL=$ANALYTICS_DATABASE_URL \
    PAYLOAD_SECRET=$PAYLOAD_SECRET \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    SESSION_SALT_SECRET=$SESSION_SALT_SECRET

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/tracker/node_modules ./packages/tracker/node_modules
COPY --from=deps /app/packages/analytics/node_modules ./packages/analytics/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY . .

# Build packages first, then the web app
RUN pnpm turbo build

# --- Stage 3: Runner ---
FROM node:22-alpine AS runner
RUN addgroup --system --gid 1001 tidemeter && \
    adduser --system --uid 1001 tidemeter

WORKDIR /app

# Copy standalone build
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Copy tracker script into public
COPY --from=builder /app/packages/tracker/dist/t.js ./apps/web/public/t.js

USER tidemeter

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "apps/web/server.js"]
