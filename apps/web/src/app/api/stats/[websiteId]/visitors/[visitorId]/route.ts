import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsRepository } from "@/lib/analytics";
import { requireWebsiteAccess } from "@/lib/auth";
import { parseDateRange } from "@/lib/utils/date";

interface RouteParams {
  params: Promise<{ websiteId: string; visitorId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { websiteId, visitorId } = await params;

  const auth = await requireWebsiteAccess(websiteId);
  if ("error" in auth) return auth.error;

  const searchParams = request.nextUrl.searchParams;
  const dateRange = parseDateRange(searchParams);

  try {
    const repo = await getAnalyticsRepository();
    const profile = await repo.getVisitorProfile(
      websiteId,
      visitorId,
      dateRange,
    );

    if (!profile) {
      return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
    }

    return NextResponse.json(profile, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (error) {
    console.error("[stats/visitors/profile] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch visitor profile" },
      { status: 500 },
    );
  }
}
