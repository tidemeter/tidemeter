import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsRepository } from "@/lib/analytics";
import { requireWebsiteAccess } from "@/lib/auth";
import { parseDateRange } from "@/lib/utils/date";

interface RouteParams {
  params: Promise<{ websiteId: string; visitorId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { websiteId: websiteParam, visitorId } = await params;

  const auth = await requireWebsiteAccess(websiteParam);
  if ("error" in auth) return auth.error;
  // Resolve to the canonical numeric id that analytics data is keyed by.
  const websiteId = auth.websiteId;

  const searchParams = request.nextUrl.searchParams;
  const dateRange = parseDateRange(searchParams);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "50", 10)),
  );

  try {
    const repo = await getAnalyticsRepository();
    const sessions = await repo.getVisitorSessions(
      websiteId,
      visitorId,
      dateRange,
      limit,
    );

    return NextResponse.json(
      { sessions },
      {
        headers: { "Cache-Control": "private, max-age=30" },
      },
    );
  } catch (error) {
    console.error("[stats/visitors/sessions] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch visitor sessions" },
      { status: 500 },
    );
  }
}
