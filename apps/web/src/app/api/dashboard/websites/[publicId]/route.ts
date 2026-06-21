import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requireWebsiteAccess } from "@/lib/auth";

type Ctx = { params: Promise<{ publicId: string }> };

/**
 * Dashboard-facing website endpoint keyed by the public id so the numeric row
 * id never reaches the browser. Authorization is enforced by
 * `requireWebsiteAccess`; the resolved numeric id is used internally only.
 */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { publicId } = await params;
  const auth = await requireWebsiteAccess(publicId);
  if ("error" in auth) return auth.error;
  const payload = await getPayload({ config });
  const w = await payload.findByID({
    collection: "websites",
    id: auth.websiteId,
    overrideAccess: true,
    depth: 0,
  });
  return NextResponse.json({
    name: w.name,
    domain: w.domain,
    shareId: w.shareId ?? null,
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { publicId } = await params;
  const auth = await requireWebsiteAccess(publicId);
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.domain === "string") data.domain = body.domain;
  if ("shareId" in body) {
    if (body.shareId === null || typeof body.shareId === "string") {
      data.shareId = body.shareId;
    }
  }
  const payload = await getPayload({ config });
  const w = await payload.update({
    collection: "websites",
    id: auth.websiteId,
    data,
    overrideAccess: true,
  });
  return NextResponse.json({
    name: w.name,
    domain: w.domain,
    shareId: w.shareId ?? null,
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { publicId } = await params;
  const auth = await requireWebsiteAccess(publicId);
  if ("error" in auth) return auth.error;
  const payload = await getPayload({ config });
  await payload.delete({
    collection: "websites",
    id: auth.websiteId,
    overrideAccess: true,
  });
  return NextResponse.json({ ok: true });
}
