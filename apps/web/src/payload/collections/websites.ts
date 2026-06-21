import type { CollectionConfig } from "payload";
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
 * - On create: set `createdBy` from the request user and generate a `publicId`.
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
    if (!data.publicId) {
      data.publicId = generatePublicId();
    }
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
      admin: { description: "Optional team that owns this website" },
    },
  ],
  hooks: {
    beforeChange: [
      ({ req, operation, data, originalDoc }) =>
        applyWebsiteBeforeChange({ req, operation, data, originalDoc }),
    ],
    // Drop the collect endpoint's resolution cache so domain/active changes
    // take effect immediately instead of after the 5-minute TTL.
    afterChange: [() => invalidateWebsiteCache()],
    afterDelete: [() => invalidateWebsiteCache()],
  },
  access: {
    create: ({ req }) => !!req.user,
    read: ({ req }) => {
      const roles = req.user?.roles;
      if (Array.isArray(roles) && roles.includes("admin")) return true;
      if (req.user) {
        return {
          or: [
            { createdBy: { equals: req.user.id } },
            // Team-based access is handled via team members
          ],
        };
      }
      return false;
    },
    update: ({ req }) => {
      const roles = req.user?.roles;
      if (Array.isArray(roles) && roles.includes("admin")) return true;
      if (req.user) return { createdBy: { equals: req.user.id } };
      return false;
    },
    delete: ({ req }) => {
      const roles = req.user?.roles;
      if (Array.isArray(roles) && roles.includes("admin")) return true;
      if (req.user) return { createdBy: { equals: req.user.id } };
      return false;
    },
  },
};
