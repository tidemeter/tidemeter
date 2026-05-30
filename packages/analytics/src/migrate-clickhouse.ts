import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migration } from "clickhouse-migrations";
import { withAdvisoryLock } from "./advisory-lock.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Distinct lock key from the Postgres analytics migrator so the two
// domains can run concurrently when both are configured (the Payload DB
// is always Postgres, so we use it as the coordinator).
const CLICKHOUSE_MIGRATIONS_LOCK_KEY = "7426384125678901235";

export interface ClickHouseMigrationConfig {
  url: string;
  database: string;
  username: string;
  password: string;
  /**
   * Postgres URL used to coordinate concurrent migration runners across
   * replicas via a session-scoped advisory lock. Optional — when omitted
   * the migrator runs without a lock (single-replica deploys).
   */
  coordinatorDatabaseUrl?: string;
}

/**
 * Find the ClickHouse SQL migration directory.
 *
 * Tries multiple paths so the same code works in:
 *  - Development (relative to source file)
 *  - Docker standalone (files copied to /app/packages/analytics/clickhouse)
 *  - Custom deployments (CH_ANALYTICS_MIGRATIONS_DIR env override)
 */
function findClickHouseMigrationsDir(): string {
  const candidates = [
    process.env.CH_ANALYTICS_MIGRATIONS_DIR,
    path.resolve(__dirname, "../clickhouse"),
    path.resolve(process.cwd(), "packages/analytics/clickhouse"),
  ].filter(Boolean) as string[];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidates[0];
}

export async function runClickHouseMigrations(
  config: ClickHouseMigrationConfig,
): Promise<void> {
  const migrationsDir = findClickHouseMigrationsDir();

  if (!fs.existsSync(migrationsDir)) {
    console.warn(
      `[ch-migrate] No migration directory found (searched: ${migrationsDir})`,
    );
    return;
  }

  const run = async () => {
    console.log(
      `[ch-migrate] Running ClickHouse migrations from ${migrationsDir}`,
    );

    // The clickhouse-migrations library tracks applied migrations in a
    // `_migrations` table inside the target ClickHouse database and
    // skips already-applied files, so this call is idempotent.
    await migration(
      migrationsDir,
      config.url,
      config.username,
      config.password,
      config.database,
    );

    console.log("[ch-migrate] ClickHouse migrations complete.");
  };

  if (config.coordinatorDatabaseUrl) {
    await withAdvisoryLock(
      config.coordinatorDatabaseUrl,
      CLICKHOUSE_MIGRATIONS_LOCK_KEY,
      run,
    );
  } else {
    await run();
  }
}
