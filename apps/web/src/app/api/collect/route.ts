import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPayload } from "payload";
import config from "@payload-config";
import { processEvent } from "@/lib/ingestion/processor";

// Cache valid website IDs for 5 minutes to avoid DB lookups on every event
const websiteCache = new Map<string, number>();
const CACHE_TTL = 5 * 60 * 1000;

async function isValidWebsite(websiteId: string): Promise<boolean> {
  const cached = websiteCache.get(websiteId);
  if (cached && Date.now() - cached < CACHE_TTL) return true;

  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "websites",
      where: { id: { equals: websiteId }, isActive: { equals: true } },
      limit: 1,
      depth: 0,
    });
    if (result.docs.length > 0) {
      websiteCache.set(websiteId, Date.now());
      return true;
    }
  } catch {
    // If DB is unavailable, reject — fail closed
  }
  return false;
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
    if (!(await isValidWebsite(payload.websiteId))) {
      return NextResponse.json({ error: "Invalid website" }, { status: 403 });
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
