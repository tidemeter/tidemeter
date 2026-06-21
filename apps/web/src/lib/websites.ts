import { getPayload } from "payload";
import config from "@payload-config";
import type { Where } from "payload";
import type { Website } from "@/payload-types";

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
  const or: Where[] = [{ publicId: { equals: param } }];
  // Only attempt an id match for numeric values; the id column is a serial
  // integer and a non-numeric value would be an invalid comparison.
  if (/^\d+$/.test(param)) {
    or.push({ id: { equals: param } });
  }
  const result = await payload.find({
    collection: "websites",
    where: { or },
    limit: 1,
    depth: 0,
  });
  return (result.docs[0] as Website | undefined) ?? null;
}
