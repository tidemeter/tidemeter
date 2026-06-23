import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requireWebsiteAccess } from "@/lib/auth";

type Ctx = { params: Promise<{ publicId: string }> };

/**
 * List/create funnels for a website addressed by its public id, so the numeric
 * website id is never exposed to the browser. The funnel's `website`
 * relationship is set server-side from the resolved numeric id.
 */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { publicId } = await params;
  const auth = await requireWebsiteAccess(publicId);
  if ("error" in auth) return auth.error;
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "funnels",
    where: { website: { equals: Number(auth.websiteId) } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });
  return NextResponse.json({ docs: result.docs });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { publicId } = await params;
  const auth = await requireWebsiteAccess(publicId);
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => ({}));
  const payload = await getPayload({ config });
  const doc = await payload.create({
    collection: "funnels",
    data: {
      name: body.name,
      steps: body.steps,
      website: Number(auth.websiteId),
      createdBy: Number(auth.user.id),
    },
    overrideAccess: true,
  });
  return NextResponse.json({ doc });
}
