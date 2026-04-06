import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";

type AuthSuccess = { user: { id: string; roles: string[] } };
type AuthFailure = { error: NextResponse };
type AuthResult = AuthSuccess | AuthFailure;

/**
 * Authenticate the current request and verify the user owns the given website.
 * Returns the user on success, or a NextResponse error to return immediately.
 */
export async function requireWebsiteAccess(
  websiteId: string,
): Promise<AuthResult> {
  const payload = await getPayload({ config });
  const hdrs = await headers();
  const { user } = await payload.auth({ headers: hdrs });

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const roles = (user as unknown as { roles?: string[] }).roles ?? [];
  const isAdmin = roles.includes("admin");

  if (!isAdmin) {
    try {
      const website = await payload.findByID({
        collection: "websites",
        id: websiteId,
        depth: 0,
      });
      if (String(website.createdBy) !== String(user.id)) {
        return {
          error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        };
      }
    } catch {
      return {
        error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }
  }

  return { user: { id: String(user.id), roles } };
}
