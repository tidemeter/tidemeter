import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsRepository } from "@/lib/analytics";
import { requireWebsiteAccess } from "@/lib/auth";
import { parseDateRange } from "@/lib/utils/date";

interface RouteParams {
  params: Promise<{ websiteId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { websiteId } = await params;

  const auth = await requireWebsiteAccess(websiteId);
  if ("error" in auth) return auth.error;

  const searchParams = request.nextUrl.searchParams;
  const dateRange = parseDateRange(searchParams);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") || "25", 10)),
  );
  const search = searchParams.get("search") || undefined;

  try {
    const repo = await getAnalyticsRepository();
    const result = await repo.getVisitors(
      websiteId,
      dateRange,
      page,
      pageSize,
      search,
    );

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (error) {
    console.error("[stats/visitors] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch visitors" },
      { status: 500 },
    );
  }
}
