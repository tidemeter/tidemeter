import postgres from "postgres";

export interface SeedAnalyticsInput {
  websiteId: string;
  events: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  identityLinks: Record<string, unknown>[];
}

/**
 * Check if analytics data already exists for a website.
 */
export async function hasAnalyticsData(
  databaseUrl: string,
  websiteId: string,
): Promise<boolean> {
  const sql = postgres(databaseUrl, { onnotice: () => {} });
  try {
    const rows = await sql`
      SELECT count(*)::int as cnt FROM analytics.page_events
      WHERE website_id = ${websiteId}
    `;
    return rows[0].cnt > 0;
  } finally {
    await sql.end();
  }
}

/**
 * Bulk-insert demo/seed analytics data (events, sessions, identity links).
 */
export async function seedAnalyticsData(
  databaseUrl: string,
  input: SeedAnalyticsInput,
): Promise<{ events: number; sessions: number; identityLinks: number }> {
  const sql = postgres(databaseUrl, { onnotice: () => {} });
  try {
    const BATCH = 100;
    for (let i = 0; i < input.events.length; i += BATCH) {
      await sql`INSERT INTO analytics.page_events ${sql(input.events.slice(i, i + BATCH))}`;
    }
    for (let i = 0; i < input.sessions.length; i += BATCH) {
      await sql`INSERT INTO analytics.sessions ${sql(input.sessions.slice(i, i + BATCH))}`;
    }
    if (input.identityLinks.length > 0) {
      await sql`INSERT INTO analytics.visitor_identities ${sql(input.identityLinks)}`;
    }
    return {
      events: input.events.length,
      sessions: input.sessions.length,
      identityLinks: input.identityLinks.length,
    };
  } finally {
    await sql.end();
  }
}
