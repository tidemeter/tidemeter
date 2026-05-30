import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";

/**
 * Health endpoint.
 *
 * Calling getPayload() on the first request triggers PayloadCMS init —
 * which runs DB schema sync, analytics SQL migrations, and (when
 * DEMO_MODE=true) demo data seeding via the onInit hook in
 * payload.config.ts. Subsequent calls return the cached singleton and
 * are effectively free, so this is also safe as a k8s liveness probe.
 *
 * Without this, /api/health responds before payload is ever
 * initialized, leaving the database unmigrated until the first user
 * request reaches a route that touches payload.
 */
export async function GET() {
  try {
    await getPayload({ config });
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[health] payload init failed:", err);
    return NextResponse.json(
      {
        status: "error",
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
