import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsRepository } from "@/lib/analytics";
import { parseDateRange, parseFilters } from "@/lib/utils/date";

interface RouteParams {
  params: Promise<{ websiteId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { websiteId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const dateRange = parseDateRange(searchParams);
  const filters = parseFilters(searchParams);

  try {
    const repo = await getAnalyticsRepository();
    const stats = await repo.getStats({ websiteId, dateRange, filters });

    return NextResponse.json(stats, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    console.error("[stats/summary] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
