import { getPayload } from "payload";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import config from "@payload-config";
import type { Website } from "@/payload-types";
import { canAccessWebsite } from "@/lib/website-access";

export { canAccessWebsite } from "@/lib/website-access";

/**
 * Resolve a route/API identifier to its website record.
 *
 * Accepts the public tracking id (`publicId`) or — for backward compatibility
 * with links, bookmarks and snippets created before `publicId` existed — the
 * legacy numeric row id. Returns `null` when no website matches.
 *
 * Analytics data is keyed by the numeric row id, so callers that need to query
 * analytics should use `String(website.id)` from the returned record.
 */
export async function resolveWebsite(param: string): Promise<Website | null> {
  const payload = await getPayload({ config });

  // Resolve by public id first so a public id always wins; only fall back to
  // the legacy numeric row id when nothing matches. This removes any ambiguity
  // between a public id and another website's numeric id.
  const byPublicId = await payload.find({
    collection: "websites",
    where: { publicId: { equals: param } },
    limit: 1,
    depth: 0,
  });
  if (byPublicId.docs[0]) return byPublicId.docs[0] as Website;

  // Only attempt an id match for numeric values; the id column is a serial
  // integer and a non-numeric value would be an invalid comparison.
  if (/^\d+$/.test(param)) {
    const byId = await payload.find({
      collection: "websites",
      where: { id: { equals: param } },
      limit: 1,
      depth: 0,
    });
    if (byId.docs[0]) return byId.docs[0] as Website;
  }

  return null;
}

/**
 * Single source of truth for "may this user access this website?" lives in
 * `@/lib/website-access` (re-exported above) so it can be unit-tested without
 * Payload/Next imports.
 */

export type WebsitePageAccess = {
  user: { id: string; roles: string[] };
  website: Website;
  /** Canonical numeric id that analytics data is keyed by. */
  numericId: string;
  /** Public tracking id used in client-side links and APIs. */
  publicId: string;
};

/**
 * Authenticate the current request and authorize access to `param`'s website
 * for a server-rendered dashboard page.
 *
 * Returns `null` when the user is unauthenticated, the website does not exist,
 * or the user is not allowed to access it — callers should treat all three the
 * same (e.g. `notFound()`) so the public, non-secret tracking id cannot be used
 * to probe for other tenants' websites.
 *
 * `canonicalSuffix` is the part of the path after the website segment (e.g.
 * "/visitors"). When a legacy numeric id is used, the authorized request is
 * redirected to the canonical `/{publicId}{canonicalSuffix}` URL.
 */
export async function requireWebsitePageAccess(
  param: string,
  canonicalSuffix = "",
): Promise<WebsitePageAccess | null> {
  const payload = await getPayload({ config });
  const hdrs = await headers();
  const { user } = await payload.auth({ headers: hdrs });
  if (!user) return null;

  const website = await resolveWebsite(param);
  if (!website) return null;

  const roles = (user as unknown as { roles?: string[] }).roles ?? [];
  if (!canAccessWebsite({ id: user.id, roles }, website)) return null;

  const publicId = String(website.publicId ?? website.id);
  // Send legacy numeric URLs to the canonical public-id URL.
  if (param !== publicId) redirect(`/${publicId}${canonicalSuffix}`);

  return {
    user: { id: String(user.id), roles },
    website,
    numericId: String(website.id),
    publicId,
  };
}
