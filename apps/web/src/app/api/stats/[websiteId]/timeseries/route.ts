import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsRepository } from "@/lib/analytics";
import { requireWebsiteAccess } from "@/lib/auth";
import { parseDateRange, parseFilters, inferInterval } from "@/lib/utils/date";
import type { TimeInterval } from "@tidemeter/analytics";

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
  const interval =
    (searchParams.get("interval") as TimeInterval) || inferInterval(dateRange);

  try {
    const repo = await getAnalyticsRepository();
    const result = await repo.getTimeSeries(
      { websiteId, dateRange, filters },
      interval,
    );

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    console.error("[stats/timeseries] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch timeseries" },
      { status: 500 },
    );
  }
}
