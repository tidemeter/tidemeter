import { getPayload } from "payload";
import config from "@payload-config";

/**
 * Authorization predicate for website access.
 *
 * Uses two ownership modes:
 * - Personal website (`team === null`): creator or global admin.
 * - Team-owned website (`team !== null`): team membership is the source of
 *   truth. `createdBy` is treated as audit metadata only.
 *
 * Grants read access when the user is:
 * 1. A global application admin, or
 * 2. The creator of a personal website (no team), or
 * 3. A member of the team that owns the website (any role: owner, admin, viewer).
 */
export async function canAccessWebsite(
  user: { id: string | number; roles?: string[] } | null | undefined,
  website: { createdBy: unknown; team?: unknown },
): Promise<boolean> {
  if (!user) return false;
  const roles = user.roles ?? [];
  if (roles.includes("admin")) return true;

  // Personal website: creator is the sole owner.
  if (!website.team) {
    return String(website.createdBy) === String(user.id);
  }

  // Team-owned website: check membership. `createdBy` is audit metadata only.
  try {
    const payload = await getPayload({ config });
    const memberships = await payload.find({
      collection: "team-members",
      where: {
        and: [
          { team: { equals: website.team } },
          { user: { equals: user.id } },
        ],
      },
      limit: 1,
      depth: 0,
    });
    return memberships.totalDocs > 0;
  } catch {
    // If the team-members collection is unavailable, fall through to deny.
    return false;
  }
}
