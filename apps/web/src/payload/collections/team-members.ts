import type { CollectionConfig } from "payload";

export const TeamMembers: CollectionConfig = {
  slug: "team-members",
  admin: {
    defaultColumns: ["team", "user", "role", "createdAt"],
  },
  fields: [
    {
      name: "team",
      type: "relationship",
      relationTo: "teams",
      required: true,
    },
    {
      name: "user",
      type: "relationship",
      relationTo: "users",
      required: true,
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "viewer",
      options: [
        { label: "Owner", value: "owner" },
        { label: "Admin", value: "admin" },
        { label: "Viewer", value: "viewer" },
      ],
    },
  ],
  indexes: [
    {
      fields: ["team", "user"],
      unique: true,
    },
  ],
  access: {
    create: ({ req }) => !!req.user,
    read: ({ req }) => {
      const roles = req.user?.roles;
      if (Array.isArray(roles) && roles.includes("admin")) return true;
      if (req.user) return { user: { equals: req.user.id } };
      return false;
    },
    update: ({ req }) => {
      const roles = req.user?.roles;
      return Array.isArray(roles) && roles.includes("admin");
    },
    delete: ({ req }) => {
      const roles = req.user?.roles;
      return Array.isArray(roles) && roles.includes("admin");
    },
  },
};
