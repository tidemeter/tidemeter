import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migration } from "clickhouse-migrations";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ClickHouseMigrationConfig {
  url: string;
  database: string;
  username: string;
  password: string;
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

  console.log(
    `[ch-migrate] Running ClickHouse migrations from ${migrationsDir}`,
  );

  await migration(
    migrationsDir,
    config.url,
    config.username,
    config.password,
    config.database,
  );

  console.log("[ch-migrate] ClickHouse migrations complete.");
}
