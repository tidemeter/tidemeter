import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsRepository } from "@/lib/analytics";
import { parseDateRange, parseFilters } from "@/lib/utils/date";
import type { BreakdownProperty } from "@tidemeter/analytics";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { websiteId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const dateRange = parseDateRange(searchParams);
  const filters = parseFilters(searchParams);
  const property = searchParams.get("property") as BreakdownProperty;
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (!property) {
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
