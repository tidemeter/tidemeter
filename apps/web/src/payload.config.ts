import { fileURLToPath } from "url";
import path from "path";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { runMigrations, runClickHouseMigrations } from "@tidemeter/analytics";
import { buildEmailAdapter } from "./lib/email";
import { seedDemoData } from "./lib/seed-demo";
import { Users } from "./payload/collections/users";
import { Websites } from "./payload/collections/websites";
import { Teams } from "./payload/collections/teams";
import { TeamMembers } from "./payload/collections/team-members";
import { ApiKeys } from "./payload/collections/api-keys";
import { Funnels } from "./payload/collections/funnels";
import { migrations } from "./migrations";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Use Drizzle "push" (auto-diff DDL on boot) only outside production.
 * In production we apply versioned migrations from `prodMigrations` so
 * schema changes are explicit, reviewable, and safe across replicas.
 *
 * Override with `PAYLOAD_DB_PUSH=true|false` if you need the other mode
 * (e.g. set to `true` once when upgrading an old deployment that was
 * originally created in push mode and has no payload_migrations rows).
 */
function shouldUsePush(): boolean {
  if (process.env.PAYLOAD_DB_PUSH === "true") return true;
  if (process.env.PAYLOAD_DB_PUSH === "false") return false;
  return process.env.NODE_ENV !== "production";
}

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

  secret: process.env.PAYLOAD_SECRET || "dev-only-insecure-secret-change-me",

  email: buildEmailAdapter(),

  onInit: async (payload) => {
    if (process.env.NODE_ENV === "production" && !process.env.PAYLOAD_SECRET) {
      throw new Error("PAYLOAD_SECRET must be set in production");
    }

    // In production, Drizzle "push" is disabled (see db config below) and
    // schema changes are applied via the prodMigrations array. Pass the
    // imported migrations directly so the adapter doesn't try to read
    // .ts source files at runtime (Next.js standalone bundles ship JS
    // only, so a filesystem scan would fail).
    if (!shouldUsePush()) {
      try {
        // Pass the imported migrations directly so the adapter doesn't
        // try to read .ts source files at runtime. The Migration type on
        // payload.db.migrate uses `args: unknown` while prodMigrations
        // uses MigrateUpArgs/MigrateDownArgs — these are structurally
        // compatible at runtime, so a single cast is safe.
        await payload.db.migrate({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          migrations: migrations as any,
        });
      } catch (err) {
        console.error("[payload:onInit] Payload migration failed:", err);
        throw err;
      }
    }

    const analyticsDbType = process.env.ANALYTICS_DB_TYPE || "postgresql";

    if (analyticsDbType === "clickhouse") {
      try {
        await runClickHouseMigrations({
          url: process.env.CLICKHOUSE_URL || "http://localhost:8123",
          database: process.env.CLICKHOUSE_DATABASE || "tidemeter_analytics",
          username: process.env.CLICKHOUSE_USER || "default",
          password: process.env.CLICKHOUSE_PASSWORD || "",
          // Use the Payload Postgres DB to coordinate concurrent runners
          // across replicas via a session-scoped advisory lock.
          coordinatorDatabaseUrl: process.env.DATABASE_URL || undefined,
        });
      } catch (err) {
        console.error("[payload:onInit] ClickHouse migration failed:", err);
        throw err;
      }
    } else {
      const analyticsDbUrl =
        process.env.ANALYTICS_DATABASE_URL || process.env.DATABASE_URL || "";
      if (analyticsDbUrl) {
        try {
          await runMigrations(analyticsDbUrl);
        } catch (err) {
          console.error("[payload:onInit] Analytics migration failed:", err);
          throw err;
        }
      }
    }

    if (process.env.DEMO_MODE === "true") {
      try {
        await seedDemoData(payload);
      } catch (err) {
        console.error("[payload:onInit] Demo seed failed:", err);
        throw err;
      }
    }
  },

  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || "",
    },
    push: shouldUsePush(),
    prodMigrations: migrations,
  }),

  typescript: {
    outputFile: path.resolve(__dirname, "payload-types.ts"),
  },
});
