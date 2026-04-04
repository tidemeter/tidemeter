import type { AnalyticsRepository } from './types.js';

export type AnalyticsDbType = 'postgresql' | 'clickhouse' | 'sqlite';

export interface AnalyticsConfig {
  type: AnalyticsDbType;
  url?: string;
  // ClickHouse-specific
  clickhouseUrl?: string;
  clickhouseDatabase?: string;
  clickhouseUser?: string;
  clickhousePassword?: string;
  // SQLite-specific
  sqlitePath?: string;
}

export async function createAnalyticsRepository(config: AnalyticsConfig): Promise<AnalyticsRepository> {
  switch (config.type) {
    case 'postgresql': {
      const { PostgresAnalyticsRepository } = await import('./adapters/postgres.js');
      return new PostgresAnalyticsRepository(config.url!);
    }
    case 'clickhouse': {
      const { ClickHouseAnalyticsRepository } = await import('./adapters/clickhouse.js');
      return new ClickHouseAnalyticsRepository({
        url: config.clickhouseUrl!,
        database: config.clickhouseDatabase || 'tidemeter_analytics',
        username: config.clickhouseUser || 'default',
        password: config.clickhousePassword || '',
      });
    }
    case 'sqlite': {
      // SQLite adapter placeholder — can be implemented later
      throw new Error('SQLite analytics adapter not yet implemented');
    }
    default:
      throw new Error(`Unsupported analytics database type: ${config.type}`);
  }
}
