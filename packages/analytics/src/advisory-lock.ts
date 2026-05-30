import postgres from "postgres";

/**
 * Run `fn` while holding a Postgres session-scoped advisory lock.
 *
 * Used to serialize migration runners across multiple replicas during a
 * rolling deploy. The lock auto-releases when the connection ends, so a
 * crashed runner cannot leave it stuck.
 *
 * Different migration domains use different keys:
 *   - analytics Postgres migrations
 *   - ClickHouse migrations (Postgres is the coordinator)
 */
export async function withAdvisoryLock<T>(
  databaseUrl: string,
  lockKey: string,
  fn: () => Promise<T>,
): Promise<T> {
  const sql = postgres(databaseUrl, { max: 1 });
  let acquired = false;
  try {
    await sql.unsafe(`SELECT pg_advisory_lock(${lockKey}::bigint)`);
    acquired = true;
    return await fn();
  } finally {
    if (acquired) {
      try {
        await sql.unsafe(`SELECT pg_advisory_unlock(${lockKey}::bigint)`);
      } catch {
        // Session-scoped lock auto-releases on disconnect; ignore.
      }
    }
    await sql.end();
  }
}
