import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsRepository } from "@/lib/analytics";
import { requireWebsiteAccess } from "@/lib/auth";
import { parseDateRange, parseFilters } from "@/lib/utils/date";
import type { BreakdownProperty } from "@tidemeter/analytics";

const VALID_PROPERTIES = new Set<BreakdownProperty>([
  "url_path",
  "referrer_domain",
  "country",
  "region",
  "city",
  "browser",
  "browser_version",
  "os",
  "os_version",
  "device_type",
  "screen_size",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "entry_page",
  "exit_page",
  "hostname",
  "page_title",
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { websiteId } = await params;

  const auth = await requireWebsiteAccess(websiteId);
  if ("error" in auth) return auth.error;

  const searchParams = request.nextUrl.searchParams;
  const dateRange = parseDateRange(searchParams);
  const filters = parseFilters(searchParams);
  const property = searchParams.get("property") as BreakdownProperty;
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "10", 10)),
  );

  if (!property || !VALID_PROPERTIES.has(property)) {
    return NextResponse.json(
      { error: "Missing property parameter" },
      { status: 400 },
    );
  }

  try {
    const repo = await getAnalyticsRepository();
    const result = await repo.getBreakdown(
      { websiteId, dateRange, filters },
      property,
      limit,
    );

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    console.error("[stats/breakdown] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch breakdown" },
      { status: 500 },
    );
  }
}
