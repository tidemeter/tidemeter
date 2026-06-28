import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPayload } from "payload";
import config from "@payload-config";
import { processEvent } from "@/lib/ingestion/processor";
import { getCachedWebsite, setCachedWebsite } from "@/lib/website-cache";

// Valid website lookups are cached (in @/lib/website-cache) for 5 minutes to
// avoid a DB hit on every event, and invalidated by the Websites collection
// hooks when a site changes.

// Token-bucket rate limiter (per IP). Best-effort, in-memory; for multi-replica
// deployments put a real limiter (e.g. Redis) in front of this endpoint.
const RATE_LIMIT_PER_MINUTE = Number(
  process.env.COLLECT_RATE_LIMIT_PER_MINUTE ?? "120",
);
const rateBuckets = new Map<string, { tokens: number; updatedAt: number }>();

function rateLimit(key: string): boolean {
  if (!Number.isFinite(RATE_LIMIT_PER_MINUTE) || RATE_LIMIT_PER_MINUTE <= 0) {
    return true;
  }
  const now = Date.now();
  const refillPerMs = RATE_LIMIT_PER_MINUTE / 60_000;
  const bucket = rateBuckets.get(key) ?? {
    tokens: RATE_LIMIT_PER_MINUTE,
    updatedAt: now,
  };
  const elapsed = now - bucket.updatedAt;
  bucket.tokens = Math.min(
    RATE_LIMIT_PER_MINUTE,
    bucket.tokens + elapsed * refillPerMs,
  );
  bucket.updatedAt = now;
  if (bucket.tokens < 1) {
    rateBuckets.set(key, bucket);
    return false;
  }
  bucket.tokens -= 1;
  rateBuckets.set(key, bucket);
  // Opportunistic GC to keep the map bounded.
  if (rateBuckets.size > 10_000) {
    for (const [k, v] of rateBuckets) {
      if (now - v.updatedAt > 5 * 60_000) rateBuckets.delete(k);
    }
  }
  return true;
}

/**
 * Resolve the client IP honouring only `TRUSTED_PROXY_HOPS` proxy hops.
 * Defaults to 1 (single reverse proxy / ingress in front of the app).
 * Set to 0 to ignore X-Forwarded-For and use X-Real-IP when present.
 */
function getClientIp(request: NextRequest): string {
  const trustedHops = Math.max(
    0,
    Number(process.env.TRUSTED_PROXY_HOPS ?? "1") || 0,
  );
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (trustedHops === 0) {
    return realIp || "127.0.0.1";
  }
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    // Take the IP `trustedHops` from the right — that's the last hop we trust.
    const idx = parts.length - trustedHops;
    if (idx >= 0 && parts[idx]) return parts[idx];
    if (parts[0]) return parts[0];
  }
  return realIp || "127.0.0.1";
}

/**
 * Resolve the snippet's website identifier (public tracking id, or a legacy
 * numeric row id) to the canonical numeric website id and its domain. Returns
 * null when no active website matches. Analytics are always keyed by the
 * canonical numeric id so the dashboard and existing data keep working
 * regardless of which identifier the snippet embeds.
 */
async function resolveWebsite(
  websiteId: string,
): Promise<{ id: string; domain: string } | null> {
  const cached = getCachedWebsite(websiteId);
  if (cached) {
    return cached;
  }

  try {
    const payload = await getPayload({ config });
    // Resolve by public id first so a public id always wins; only fall back to
    // the legacy numeric row id when no active website matches, so snippets
    // generated before publicId existed keep working without any ambiguity.
    let doc: { id: string | number; domain: string } | undefined;
    const byPublicId = await payload.find({
      collection: "websites",
      where: {
        and: [
          { isActive: { equals: true } },
          { publicId: { equals: websiteId } },
        ],
      },
      limit: 1,
      depth: 0,
    });
    doc = byPublicId.docs[0] as
      | { id: string | number; domain: string }
      | undefined;
    if (!doc && /^\d+$/.test(websiteId)) {
      const byId = await payload.find({
        collection: "websites",
        where: {
          and: [{ isActive: { equals: true } }, { id: { equals: websiteId } }],
        },
        limit: 1,
        depth: 0,
      });
      doc = byId.docs[0] as { id: string | number; domain: string } | undefined;
    }
    if (doc) {
      const resolved = { id: String(doc.id), domain: doc.domain };
      setCachedWebsite(websiteId, resolved);
      return resolved;
    }
  } catch {
    // If DB is unavailable, reject — fail closed
  }
  return null;
}

const MAX_CUSTOM_KEYS = 32;
const MAX_CUSTOM_VALUE_LEN = 1024;

const customDataSchema = z
  .record(
    z.union([
      z.string().max(MAX_CUSTOM_VALUE_LEN),
      z.number().finite(),
      z.boolean(),
    ]),
  )
  .refine(
    (obj) => Object.keys(obj).length <= MAX_CUSTOM_KEYS,
    `data may contain at most ${MAX_CUSTOM_KEYS} keys`,
  );

const collectSchema = z.object({
  websiteId: z
    .string()
    .min(1)
    .max(64)
    // Accepts the generated public id (URL-safe base64), legacy numeric row
    // ids, and UUIDs — all of which are within [A-Za-z0-9_-].
    .regex(/^[A-Za-z0-9_-]+$/),
  url: z.string().max(2048),
  referrer: z.string().max(2048).default(""),
  title: z.string().max(512).default(""),
  screen: z.string().max(20).default(""),
  language: z.string().max(32).default(""),
  name: z.string().max(255).default("pageview"),
  data: customDataSchema.optional(),
  userId: z.string().max(255).optional(),
});

// Build CORS headers that echo the request's Origin instead of "*".
function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin ?? "",
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  try {
    const ip = getClientIp(request);

    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: {
            ...headers,
            "Cache-Control": "no-store",
          },
        },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400, headers },
      );
    }
    const payload = collectSchema.parse(body);

    // Validate the website exists and is active, and resolve to the canonical
    // numeric id that analytics are keyed by.
    const website = await resolveWebsite(payload.websiteId);
    if (!website) {
      return NextResponse.json(
        { error: "Invalid website" },
        { status: 403, headers },
      );
    }

    // Origin must be present and match the registered domain. Missing or
    // malformed Origin headers are rejected (fail-closed) to prevent
    // server-side callers from poisoning analytics for known websiteIds.
    if (!origin) {
      return NextResponse.json(
        { error: "Origin required" },
        { status: 403, headers },
      );
    }
    let originHost: string;
    try {
      originHost = new URL(origin).hostname;
    } catch {
      return NextResponse.json(
        { error: "Invalid origin" },
        { status: 403, headers },
      );
    }
    if (
      originHost !== website.domain &&
      !originHost.endsWith(`.${website.domain}`)
    ) {
      return NextResponse.json(
        { error: "Origin mismatch" },
        { status: 403, headers },
      );
    }

    const userAgent = request.headers.get("user-agent") || "";

    try {
      await processEvent({
        ...payload,
        // Always key analytics by the canonical numeric id, never the public id.
        websiteId: website.id,
        ip,
        userAgent,
      });
    } catch (err) {
      console.error("[collect] Failed to process event:", err);
    }

    return new NextResponse(null, {
      status: 202,
      headers: {
        ...headers,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400, headers },
      );
    }
    console.error("[collect] Error processing event:", error);
    return new NextResponse(null, {
      status: 500,
      headers,
    });
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}
