import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withAdvisoryLock } from "./advisory-lock.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Stable advisory-lock key for analytics Postgres migrations. Every
// replica uses the same constant so they serialize on the same lock.
const ANALYTICS_MIGRATIONS_LOCK_KEY = "7426384125678901234";

/**
 * Find the analytics SQL migration directory.
 *
 * Tries multiple paths so the same code works in:
 *  - Development (relative to source file)
 *  - Docker standalone (files copied to /app/packages/analytics/drizzle)
 *  - Custom deployments (ANALYTICS_MIGRATIONS_DIR env override)
 */
function findMigrationsDir(): string {
  const candidates = [
    process.env.ANALYTICS_MIGRATIONS_DIR,
    path.resolve(__dirname, "../drizzle"),
    path.resolve(process.cwd(), "packages/analytics/drizzle"),
  ].filter(Boolean) as string[];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidates[0];
}

async function ensureMigrationsTable(sql: postgres.Sql): Promise<void> {
  await sql`CREATE SCHEMA IF NOT EXISTS analytics`;
  await sql`
    CREATE TABLE IF NOT EXISTS analytics._migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function getAppliedMigrations(sql: postgres.Sql): Promise<Set<string>> {
  const rows = await sql<{ name: string }[]>`
    SELECT name FROM analytics._migrations ORDER BY id
  `;
  return new Set(rows.map((r) => r.name));
}

function getMigrationFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

export async function runMigrations(databaseUrl: string): Promise<void> {
  const migrationsDir = findMigrationsDir();

  await withAdvisoryLock(
    databaseUrl,
    ANALYTICS_MIGRATIONS_LOCK_KEY,
    async () => {
      const sql = postgres(databaseUrl);
      try {
        await ensureMigrationsTable(sql);

        const applied = await getAppliedMigrations(sql);
        const files = getMigrationFiles(migrationsDir);

        if (files.length === 0) {
          console.warn(
            `[migrate] No .sql files found (searched: ${migrationsDir})`,
          );
        }

        for (const file of files) {
          if (applied.has(file)) continue;

          const filePath = path.join(migrationsDir, file);
          const content = fs.readFileSync(filePath, "utf-8");

          console.log(`[migrate] Applying ${file}...`);
          // Wrap each migration + its tracking insert in a single
          // transaction so a partial failure rolls back cleanly.
          await sql.begin(async (tx) => {
            await tx.unsafe(content);
            await tx`INSERT INTO analytics._migrations (name) VALUES (${file})`;
          });
          console.log(`[migrate] Applied ${file}`);
        }

        console.log("[migrate] All migrations applied.");
      } finally {
        await sql.end();
      }
    },
  );
}
