import type { CollectionConfig } from "payload";
import crypto from "crypto";

export const ApiKeys: CollectionConfig = {
  slug: "api-keys",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "website", "createdAt", "expiresAt"],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      label: "Key Name",
      admin: { description: "A friendly name to identify this API key" },
    },
    {
      name: "key",
      type: "text",
      required: true,
      unique: true,
      label: "API Key",
      admin: {
        readOnly: true,
        description:
          "Auto-generated. Store securely — it cannot be retrieved later.",
      },
      access: {
        // Key is only readable on creation
        read: () => false,
      },
    },
    {
      name: "keyPrefix",
      type: "text",
      label: "Key Prefix",
      admin: {
        readOnly: true,
        description: "First 8 characters of the key for identification",
      },
    },
    {
      name: "website",
      type: "relationship",
      relationTo: "websites",
      required: true,
    },
    {
      name: "user",
      type: "relationship",
      relationTo: "users",
      required: true,
      admin: { readOnly: true },
    },
    {
      name: "expiresAt",
      type: "date",
      label: "Expires At",
      admin: { description: "Leave empty for no expiration" },
    },
  ],
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        if (operation === "create") {
          const rawKey = `tm_${crypto.randomBytes(32).toString("hex")}`;
          // Store hashed key
          data.key = crypto.createHash("sha256").update(rawKey).digest("hex");
          data.keyPrefix = rawKey.substring(0, 11);
          data.user = req.user?.id;
          // Return the raw key in the response (only time it's visible)
          data._rawKey = rawKey;
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
      if (req.user) return { user: { equals: req.user.id } };
      return false;
    },
    update: () => false, // API keys are immutable
    delete: ({ req }) => {
      const roles = req.user?.roles;
      if (Array.isArray(roles) && roles.includes("admin")) return true;
      if (req.user) return { user: { equals: req.user.id } };
      return false;
    },
  },
};
