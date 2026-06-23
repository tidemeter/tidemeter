import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { resolveWebsite, canAccessWebsite } from "@/lib/websites";

type AuthSuccess = {
  user: { id: string; roles: string[] };
  /** Canonical numeric website id that analytics data is keyed by. */
  websiteId: string;
};
type AuthFailure = { error: NextResponse };
type AuthResult = AuthSuccess | AuthFailure;

/**
 * Authenticate the current request and verify the user owns the given website.
 *
 * `param` may be the public tracking id (`publicId`) or a legacy numeric row
 * id. On success returns the user plus the canonical numeric `websiteId` to use
 * for analytics queries; on failure returns a NextResponse to return directly.
 */
export async function requireWebsiteAccess(param: string): Promise<AuthResult> {
  const payload = await getPayload({ config });
  const hdrs = await headers();
  const { user } = await payload.auth({ headers: hdrs });

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const roles = (user as unknown as { roles?: string[] }).roles ?? [];

  const website = await resolveWebsite(param);
  if (!website) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  if (!canAccessWebsite({ id: user.id, roles }, website)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    user: { id: String(user.id), roles },
    websiteId: String(website.id),
  };
}
