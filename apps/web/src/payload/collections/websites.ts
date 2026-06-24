import type { CollectionConfig, Where } from "payload";
import { randomBytes } from "crypto";
import { invalidateWebsiteCache } from "@/lib/website-cache";

/**
 * Generate a stable, non-sequential public identifier for the tracking
 * snippet. Using a random id (instead of the Postgres serial row id) avoids
 * leaking how many websites exist or their creation order.
 */
export function generatePublicId(): string {
  // 12 random bytes -> 16 URL-safe chars ([A-Za-z0-9_-]), ~96 bits of entropy.
  return randomBytes(12).toString("base64url");
}

type WebsiteBeforeChangeArgs = {
  req: { user?: { id: string | number } | null };
  operation: "create" | "update";
  data: Record<string, unknown>;
  originalDoc?: { publicId?: string | null } | null;
};

/**
 * `beforeChange` logic for the Websites collection, extracted for testing.
 *
 * - On create: set `createdBy` from the request user and always generate the
 *   `publicId` server-side. Any client-supplied value is ignored so callers
 *   cannot choose malformed, short, or all-numeric ids that could collide with
 *   a legacy numeric route.
 * - On update: the `publicId` is immutable. Any client-supplied value (e.g. a
 *   REST PATCH) is ignored and the stored id is preserved; a legacy row that
 *   never received one is backfilled.
 */
export function applyWebsiteBeforeChange({
  req,
  operation,
  data,
  originalDoc,
}: WebsiteBeforeChangeArgs): Record<string, unknown> {
  if (operation === "create") {
    if (req.user) {
      data.createdBy = req.user.id;
    }
    data.publicId = generatePublicId();
  } else {
    data.publicId = originalDoc?.publicId ?? generatePublicId();
  }
  return data;
}

export const Websites: CollectionConfig = {
  slug: "websites",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "domain", "isActive", "createdAt"],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      label: "Website Name",
    },
    {
      name: "domain",
      type: "text",
      required: true,
      label: "Domain",
      admin: { description: "e.g. example.com" },
    },
    {
      name: "timezone",
      type: "text",
      defaultValue: "UTC",
      label: "Timezone",
      admin: { description: "IANA timezone (e.g. America/New_York)" },
    },
    {
      name: "isActive",
      type: "checkbox",
      defaultValue: true,
      label: "Active",
      admin: { description: "Enable or disable tracking for this website" },
    },
    {
      name: "publicId",
      type: "text",
      required: true,
      unique: true,
      index: true,
      label: "Public Tracking ID",
      // Defense in depth: even though the value is always generated in
      // beforeChange, reject anything that is not a 16-char Base64URL string.
      validate: (value: string | string[] | null | undefined) => {
        if (typeof value !== "string" || !/^[A-Za-z0-9_-]{16}$/.test(value)) {
          return "Public ID must be a 16-character Base64URL value";
        }
        return true;
      },
      admin: {
        readOnly: true,
        description:
          "Stable public identifier used in the tracking snippet (data-website-id).",
      },
    },
    {
      name: "shareId",
      type: "text",
      unique: true,
      label: "Public Share ID",
      admin: {
        description: "Set to make dashboard publicly accessible via share link",
      },
    },
    {
      name: "createdBy",
      type: "relationship",
      relationTo: "users",
      required: true,
      admin: { readOnly: true },
    },
    {
      name: "team",
      type: "relationship",
      relationTo: "teams",
      label: "Team",
      admin: {
        description:
          "Optional team that owns this website. Once set, the team—not the " +
          "creator—controls access to this website.",
      },
      // Protect the team field: only global admins or team owners can change it.
      // This prevents a team admin or viewer from transferring the website to
      // another team or clearing the team assignment.
      access: {
        update: async ({ req, doc }) => {
          const roles = req.user?.roles;
          if (Array.isArray(roles) && roles.includes("admin")) return true;
          if (!req.user || !doc) return false;

          // If the website has no team yet, the creator can assign it.
          if (!doc.team) {
            return String(doc.createdBy) === String(req.user.id);
          }

          // Team-owned website: only a team owner can change the team field.
          const memberships = await req.payload.find({
            collection: "team-members",
            where: {
              and: [
                { team: { equals: doc.team } },
                { user: { equals: req.user.id } },
                { role: { equals: "owner" } },
              ],
            },
            limit: 1,
            depth: 0,
          });
          return memberships.totalDocs > 0;
        },
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ req, operation, data, originalDoc }) =>
        applyWebsiteBeforeChange({ req, operation, data, originalDoc }),
    ],
    // Drop the collect endpoint's resolution cache so domain/active changes
    // take effect without waiting for the 5-minute TTL. Note: the cache is
    // per-process, so in a multi-replica deployment this only clears the
    // replica that handled the write (see lib/website-cache.ts).
    afterChange: [() => invalidateWebsiteCache()],
    afterDelete: [() => invalidateWebsiteCache()],
  },
  access: {
    create: async ({ req, data }) => {
      if (!req.user) return false;
      const roles = req.user.roles;
      if (Array.isArray(roles) && roles.includes("admin")) return true;

      // If creating a personal website (no team), any authenticated user can.
      if (!data?.team) return true;

      // If creating a team-owned website, verify the user is an owner or admin
      // of that team. A viewer or non-member cannot create sites in a team.
      const memberships = await req.payload.find({
        collection: "team-members",
        where: {
          and: [
            { team: { equals: data.team } },
            { user: { equals: req.user.id } },
            { role: { in: ["owner", "admin"] } },
          ],
        },
        limit: 1,
        depth: 0,
      });
      return memberships.totalDocs > 0;
    },
    read: async ({ req }): Promise<boolean | Where> => {
      const roles = req.user?.roles;
      if (Array.isArray(roles) && roles.includes("admin")) return true;
      if (!req.user) return false;

      // Find teams this user is a member of (any role: owner, admin, viewer).
      const memberships = await req.payload.find({
        collection: "team-members",
        where: { user: { equals: req.user.id } },
        limit: 100,
        depth: 0,
      });

      const teamIds = memberships.docs.map((m) =>
        typeof m.team === "object" ? m.team.id : m.team,
      );

      // Two-mode ownership:
      // - Personal site (team is null): only creator can read.
      // - Team site (team is set): any team member can read.
      if (teamIds.length === 0) {
        return {
          and: [
            { createdBy: { equals: req.user.id } },
            { team: { equals: null } },
          ],
        };
      }

      return {
        or: [
          // Personal site: creator
          { createdBy: { equals: req.user.id }, team: { equals: null } },
          // Team site: any team member
          { team: { in: teamIds } },
        ],
      };
    },
    update: async ({ req }): Promise<boolean | Where> => {
      const roles = req.user?.roles;
      if (Array.isArray(roles) && roles.includes("admin")) return true;
      if (!req.user) return false;

      // Find teams where this user is an owner or admin.
      const memberships = await req.payload.find({
        collection: "team-members",
        where: {
          and: [
            { user: { equals: req.user.id } },
            { role: { in: ["owner", "admin"] } },
          ],
        },
        limit: 100,
        depth: 0,
      });

      const teamIds = memberships.docs.map((m) =>
        typeof m.team === "object" ? m.team.id : m.team,
      );

      // Two-mode ownership:
      // - Personal site (team is null): only creator can update.
      // - Team site (team is set): team owner/admin can update.
      if (teamIds.length === 0) {
        return {
          and: [
            { createdBy: { equals: req.user.id } },
            { team: { equals: null } },
          ],
        };
      }

      return {
        or: [
          // Personal site: creator
          { createdBy: { equals: req.user.id }, team: { equals: null } },
          // Team site: team owner/admin
          { team: { in: teamIds } },
        ],
      };
    },
    delete: async ({ req }): Promise<boolean | Where> => {
      const roles = req.user?.roles;
      if (Array.isArray(roles) && roles.includes("admin")) return true;
      if (!req.user) return false;

      // Find teams where this user is an owner.
      const memberships = await req.payload.find({
        collection: "team-members",
        where: {
          and: [
            { user: { equals: req.user.id } },
            { role: { equals: "owner" } },
          ],
        },
        limit: 100,
        depth: 0,
      });

      const teamIds = memberships.docs.map((m) =>
        typeof m.team === "object" ? m.team.id : m.team,
      );

      // Two-mode ownership:
      // - Personal site (team is null): only creator can delete.
      // - Team site (team is set): team owner can delete.
      if (teamIds.length === 0) {
        return {
          and: [
            { createdBy: { equals: req.user.id } },
            { team: { equals: null } },
          ],
        };
      }

      return {
        or: [
          // Personal site: creator
          { createdBy: { equals: req.user.id }, team: { equals: null } },
          // Team site: team owner
          { team: { in: teamIds } },
        ],
      };
    },
  },
};
