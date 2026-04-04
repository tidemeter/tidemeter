import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { getAnalyticsRepository } from "@/lib/analytics";
import { parseDateRange, inferInterval } from "@/lib/utils/date";

interface RouteParams {
  params: Promise<{ shareId: string }>;
}

async function getWebsiteByShareId(shareId: string) {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "websites",
    where: { shareId: { equals: shareId }, isActive: { equals: true } },
    limit: 1,
    depth: 0,
  });
  return result.docs[0] ?? null;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { shareId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "summary";

  const website = await getWebsiteByShareId(shareId);
  if (!website) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const dateRange = parseDateRange(searchParams);
  const repo = await getAnalyticsRepository();

  try {
    switch (type) {
      case "summary": {
        const stats = await repo.getStats({
          websiteId: String(website.id),
          dateRange,
        });
        return NextResponse.json(
          { website: { name: website.name, domain: website.domain }, stats },
          {
            headers: { "Cache-Control": "public, max-age=120" },
          },
        );
      }
      case "timeseries": {
        const interval = inferInterval(dateRange);
        const data = await repo.getTimeSeries(
          { websiteId: String(website.id), dateRange },
          interval,
        );
        return NextResponse.json(data, {
          headers: { "Cache-Control": "public, max-age=120" },
        });
      }
      case "breakdown": {
        const property = searchParams.get("property") || "urlPath";
        const data = await repo.getBreakdown(
          { websiteId: String(website.id), dateRange },
          property as Parameters<typeof repo.getBreakdown>[1],
          10,
        );
        return NextResponse.json(data, {
          headers: { "Cache-Control": "public, max-age=120" },
        });
      }
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("[share] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 },
    );
  }
}
