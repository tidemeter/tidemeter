import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsRepository } from "@/lib/analytics";
import { requireWebsiteAccess } from "@/lib/auth";
import { parseDateRange, parseFilters } from "@/lib/utils/date";
import { getPayload } from "payload";
import config from "@payload-config";
import type { FunnelStepDefinition } from "@tidemeter/analytics";

interface RouteParams {
  params: Promise<{ websiteId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { websiteId } = await params;

  const auth = await requireWebsiteAccess(websiteId);
  if ("error" in auth) return auth.error;

  const searchParams = request.nextUrl.searchParams;
  const funnelId = searchParams.get("funnelId");

  if (!funnelId) {
    return NextResponse.json(
      { error: "funnelId is required" },
      { status: 400 },
    );
  }

  const dateRange = parseDateRange(searchParams);
  const filters = parseFilters(searchParams);

  try {
    const payload = await getPayload({ config });

    // Fetch funnel definition
    const funnel = await payload.findByID({
      collection: "funnels",
      id: funnelId,
      depth: 0,
    });

    if (!funnel) {
      return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
    }

    // Verify funnel belongs to this website
    if (String(funnel.website) !== websiteId) {
      return NextResponse.json(
        { error: "Funnel does not belong to this website" },
        { status: 403 },
      );
    }

    const steps = (
      funnel.steps as Array<{
        name: string;
        matchType: string;
        matchOperator: string;
        matchValue: string;
      }>
    ).map(
      (s): FunnelStepDefinition => ({
        name: s.name,
        matchType: s.matchType as "url_path" | "event_name",
        matchOperator: s.matchOperator as "equals" | "contains" | "starts_with",
        matchValue: s.matchValue,
      }),
    );

    const repo = await getAnalyticsRepository();
    const result = await repo.getFunnelResult({
      websiteId,
      dateRange,
      steps,
      filters,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    console.error("[stats/funnel] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch funnel data" },
      { status: 500 },
    );
  }
}
