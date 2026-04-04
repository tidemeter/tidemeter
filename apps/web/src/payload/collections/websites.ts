import type { CollectionConfig } from "payload";

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
      ({ req, operation, data }) => {
        // Auto-set createdBy on create
        if (operation === "create" && req.user) {
          data.createdBy = req.user.id;
        }
        return data;
      },
    ],
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
