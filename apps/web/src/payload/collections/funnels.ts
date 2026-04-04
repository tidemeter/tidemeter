import type { CollectionConfig } from "payload";

export const Funnels: CollectionConfig = {
  slug: "funnels",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "website", "createdAt"],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      label: "Funnel Name",
    },
    {
      name: "website",
      type: "relationship",
      relationTo: "websites",
      required: true,
      label: "Website",
    },
    {
      name: "steps",
      type: "array",
      required: true,
      minRows: 2,
      maxRows: 10,
      label: "Funnel Steps",
      fields: [
        {
          name: "name",
          type: "text",
          required: true,
          label: "Step Name",
          admin: { description: "e.g. Homepage, Pricing, Sign Up" },
        },
        {
          name: "matchType",
          type: "select",
          required: true,
          defaultValue: "url_path",
          options: [
            { label: "Page URL (path)", value: "url_path" },
            { label: "Custom Event", value: "event_name" },
          ],
        },
        {
          name: "matchOperator",
          type: "select",
          required: true,
          defaultValue: "equals",
          options: [
            { label: "Equals", value: "equals" },
            { label: "Contains", value: "contains" },
            { label: "Starts with", value: "starts_with" },
          ],
        },
        {
          name: "matchValue",
          type: "text",
          required: true,
          label: "Match Value",
          admin: { description: "e.g. /pricing or signup_click" },
        },
      ],
    },
    {
      name: "createdBy",
      type: "relationship",
      relationTo: "users",
      admin: { readOnly: true },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ req, operation, data }) => {
        if (operation === "create" && req.user && data) {
          data.createdBy = req.user.id;
        }
        return data;
      },
    ],
  },
  access: {
    create: ({ req }) => !!req.user,
    read: ({ req }) => {
      if (!req.user) return false;
      const roles = req.user?.roles;
      if (Array.isArray(roles) && roles.includes("admin")) return true;
      return { createdBy: { equals: req.user.id } };
    },
    update: ({ req }) => {
      if (!req.user) return false;
      const roles = req.user?.roles;
      if (Array.isArray(roles) && roles.includes("admin")) return true;
      return { createdBy: { equals: req.user.id } };
    },
    delete: ({ req }) => {
      if (!req.user) return false;
      const roles = req.user?.roles;
      if (Array.isArray(roles) && roles.includes("admin")) return true;
      return { createdBy: { equals: req.user.id } };
    },
  },
};
