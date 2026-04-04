import { fileURLToPath } from "url";
import path from "path";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { Users } from "./payload/collections/users";
import { Websites } from "./payload/collections/websites";
import { Teams } from "./payload/collections/teams";
import { TeamMembers } from "./payload/collections/team-members";
import { ApiKeys } from "./payload/collections/api-keys";
import { Funnels } from "./payload/collections/funnels";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(__dirname),
    },
    meta: {
      titleSuffix: "— TideMeter",
    },
  },

  collections: [Users, Websites, Teams, TeamMembers, ApiKeys, Funnels],

  editor: lexicalEditor(),

  secret: process.env.PAYLOAD_SECRET || "CHANGE_ME_IN_PRODUCTION",

  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || "",
    },
  }),

  typescript: {
    outputFile: path.resolve(__dirname, "payload-types.ts"),
  },
});
