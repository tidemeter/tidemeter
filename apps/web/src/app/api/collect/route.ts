import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPayload } from "payload";
import config from "@payload-config";
import { processEvent } from "@/lib/ingestion/processor";

// Cache valid website IDs and domains for 5 minutes to avoid DB lookups on every event
const websiteCache = new Map<string, { timestamp: number; domain: string }>();
const CACHE_TTL = 5 * 60 * 1000;

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

const collectSchema = z.object({
  websiteId: z.union([z.string().uuid(), z.coerce.string().regex(/^\d+$/)]),
  url: z.string().max(2048),
  referrer: z.string().max(2048).default(""),
  title: z.string().max(512).default(""),
  screen: z.string().max(20).default(""),
  language: z.string().max(32).default(""),
  name: z.string().max(255).default("pageview"),
  data: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  userId: z.string().max(255).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = collectSchema.parse(body);

    // Validate the website exists and is active
    const websiteDomain = await getWebsiteDomain(payload.websiteId);
    if (!websiteDomain) {
      return NextResponse.json({ error: "Invalid website" }, { status: 403 });
    }

    // Validate origin matches the registered domain (anti-spam)
    const origin = request.headers.get("origin") || "";
    if (origin) {
      try {
        const originHost = new URL(origin).hostname;
        if (
          originHost !== websiteDomain &&
          !originHost.endsWith(`.${websiteDomain}`)
        ) {
          return NextResponse.json(
            { error: "Origin mismatch" },
            { status: 403 },
          );
        }
      } catch {
        // Malformed origin header — allow (server-side calls may lack origin)
      }
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

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
