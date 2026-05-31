import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPayload } from "payload";
import config from "@payload-config";
import { processEvent } from "@/lib/ingestion/processor";

// Cache valid website IDs and domains for 5 minutes to avoid DB lookups on every event
const websiteCache = new Map<string, { timestamp: number; domain: string }>();
const CACHE_TTL = 5 * 60 * 1000;

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
 * Set to 0 to ignore X-Forwarded-For entirely (use the socket peer).
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

async function getWebsiteDomain(websiteId: string): Promise<string | null> {
  const cached = websiteCache.get(websiteId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.domain;

  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "websites",
      where: { id: { equals: websiteId }, isActive: { equals: true } },
      limit: 1,
      depth: 0,
    });
    if (result.docs.length > 0) {
      const domain = (result.docs[0] as { domain: string }).domain;
      websiteCache.set(websiteId, { timestamp: Date.now(), domain });
      return domain;
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
  websiteId: z.union([z.string().uuid(), z.coerce.string().regex(/^\d+$/)]),
  url: z.string().max(2048),
  referrer: z.string().max(2048).default(""),
  title: z.string().max(512).default(""),
  screen: z.string().max(20).default(""),
  language: z.string().max(32).default(""),
  name: z.string().max(255).default("pageview"),
  data: customDataSchema.optional(),
  userId: z.string().max(255).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const body = await request.json();
    const payload = collectSchema.parse(body);

    // Validate the website exists and is active
    const websiteDomain = await getWebsiteDomain(payload.websiteId);
    if (!websiteDomain) {
      return NextResponse.json({ error: "Invalid website" }, { status: 403 });
    }

    // Origin must be present and match the registered domain. Missing or
    // malformed Origin headers are rejected (fail-closed) to prevent
    // server-side callers from poisoning analytics for known websiteIds.
    const origin = request.headers.get("origin");
    if (!origin) {
      return NextResponse.json(
        { error: "Origin required" },
        { status: 403 },
      );
    }
    let originHost: string;
    try {
      originHost = new URL(origin).hostname;
    } catch {
      return NextResponse.json(
        { error: "Invalid origin" },
        { status: 403 },
      );
    }
    if (
      originHost !== websiteDomain &&
      !originHost.endsWith(`.${websiteDomain}`)
    ) {
      return NextResponse.json(
        { error: "Origin mismatch" },
        { status: 403 },
      );
    }

    const userAgent = request.headers.get("user-agent") || "";

    await processEvent({
      ...payload,
      ip,
      userAgent,
    });

    return new NextResponse(null, {
      status: 202,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    console.error("[collect] Error processing event:", error);
    return new NextResponse(null, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
