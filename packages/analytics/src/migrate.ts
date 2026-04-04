import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../drizzle');

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

function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

export async function runMigrations(databaseUrl: string): Promise<void> {
  const sql = postgres(databaseUrl);
  try {
    await ensureMigrationsTable(sql);

    const applied = await getAppliedMigrations(sql);
    const files = getMigrationFiles();

    for (const file of files) {
      if (applied.has(file)) continue;

      const filePath = path.join(MIGRATIONS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      console.log(`[migrate] Applying ${file}...`);
      await sql.unsafe(content);
      await sql`INSERT INTO analytics._migrations (name) VALUES (${file})`;
      console.log(`[migrate] Applied ${file}`);
    }

    console.log('[migrate] All migrations applied.');
  } finally {
    await sql.end();
  }
}
