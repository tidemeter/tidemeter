import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "displayName", "roles"],
  },
  fields: [
    {
      name: "displayName",
      type: "text",
      label: "Display Name",
    },
    {
      name: "roles",
      type: "select",
      hasMany: true,
      required: true,
      defaultValue: ["user"],
      options: [
        { label: "Admin", value: "admin" },
        { label: "User", value: "user" },
      ],
      saveToJWT: true,
      access: {
        // Only admins can change roles
        update: ({ req }) => {
          const roles = req.user?.roles;
          return Array.isArray(roles) && roles.includes("admin");
        },
      },
    },
    {
      name: "avatarUrl",
      type: "text",
      label: "Avatar URL",
      admin: { description: "URL to user avatar image" },
    },
  ],
  access: {
    // Only admins can create users (PayloadCMS handles first-user setup automatically)
    create: ({ req }) => {
      if (!req.user) return false;
      const roles = req.user?.roles;
      return Array.isArray(roles) && roles.includes("admin");
    },
    // Users can read their own profile; admins can read all
    read: ({ req }) => {
      const roles = req.user?.roles;
      if (Array.isArray(roles) && roles.includes("admin")) return true;
      if (req.user) return { id: { equals: req.user.id } };
      return false;
    },
    // Users can update their own profile; admins can update all
    update: ({ req }) => {
      const roles = req.user?.roles;
      const isAdmin = Array.isArray(roles) && roles.includes("admin");

      if (isAdmin) return true;

      const isReadOnlyDemoUser =
        process.env.DEMO_MODE === "true" && req.user?.email === "demo@demo.com";

      if (isReadOnlyDemoUser) return false;

      if (req.user) return { id: { equals: req.user.id } };
      return false;
    },
    // Only admins can delete users
    delete: ({ req }) => {
      const roles = req.user?.roles;
      return Array.isArray(roles) && roles.includes("admin");
    },
  },
};
