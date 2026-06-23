import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsRepository } from "@/lib/analytics";
import { requireWebsiteAccess } from "@/lib/auth";
import { parseDateRange, parseFilters } from "@/lib/utils/date";
import type { CohortGranularity } from "@tidemeter/analytics";

interface RouteParams {
  params: Promise<{ websiteId: string }>;
}

const VALID_GRANULARITIES = new Set<CohortGranularity>([
  "day",
  "week",
  "month",
]);

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { websiteId: websiteParam } = await params;

  const auth = await requireWebsiteAccess(websiteParam);
  if ("error" in auth) return auth.error;
  // Resolve to the canonical numeric id that analytics data is keyed by.
  const websiteId = auth.websiteId;

  const searchParams = request.nextUrl.searchParams;
  const dateRange = parseDateRange(searchParams);
  const filters = parseFilters(searchParams);

  const granularity = (searchParams.get("granularity") ||
    "week") as CohortGranularity;
  if (!VALID_GRANULARITIES.has(granularity)) {
    return NextResponse.json(
      { error: "Invalid granularity. Must be day, week, or month." },
      { status: 400 },
    );
  }

  try {
    const repo = await getAnalyticsRepository();
    const result = await repo.getRetention({
      websiteId,
      dateRange,
      granularity,
      filters,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    console.error("[stats/retention] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch retention data" },
      { status: 500 },
    );
  }
}
