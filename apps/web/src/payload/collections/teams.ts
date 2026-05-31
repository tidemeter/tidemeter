import type { CollectionConfig } from "payload";

export const Teams: CollectionConfig = {
  slug: "teams",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "createdAt"],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      label: "Team Name",
    },
    {
      name: "logoUrl",
      type: "text",
      label: "Logo URL",
    },
    {
      name: "accessCode",
      type: "text",
      unique: true,
      label: "Join Access Code",
      admin: { description: "Shareable code for others to join this team" },
      access: {
        // The access code is a join secret — only admins may read it via the API.
        // Joins must go through a dedicated endpoint that validates the code
        // server-side, not via the REST list/get on teams.
        read: ({ req }) => {
          const roles = req.user?.roles;
          return Array.isArray(roles) && roles.includes("admin");
        },
        update: ({ req }) => {
          const roles = req.user?.roles;
          return Array.isArray(roles) && roles.includes("admin");
        },
      },
    },
  ],
  access: {
    create: ({ req }) => {
      const roles = req.user?.roles;
      return Array.isArray(roles) && roles.includes("admin");
    },
    read: ({ req }) => {
      const roles = req.user?.roles;
      if (Array.isArray(roles) && roles.includes("admin")) return true;
      return !!req.user;
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
