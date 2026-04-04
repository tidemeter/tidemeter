import { createAnalyticsRepository, type AnalyticsRepository, type AnalyticsConfig } from '@tidemeter/analytics';

let repository: AnalyticsRepository | null = null;

function getConfig(): AnalyticsConfig {
  const type = (process.env.ANALYTICS_DB_TYPE || 'postgresql') as AnalyticsConfig['type'];

  switch (type) {
    case 'clickhouse':
      return {
        type: 'clickhouse',
        clickhouseUrl: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
        clickhouseDatabase: process.env.CLICKHOUSE_DATABASE || 'tidemeter_analytics',
        clickhouseUser: process.env.CLICKHOUSE_USER || 'default',
        clickhousePassword: process.env.CLICKHOUSE_PASSWORD || '',
      };
    case 'sqlite':
      return {
        type: 'sqlite',
        sqlitePath: process.env.ANALYTICS_SQLITE_PATH || './data/analytics.db',
      };
    default:
      return {
        type: 'postgresql',
        url: process.env.ANALYTICS_DATABASE_URL || process.env.DATABASE_URL || '',
      };
  }
}

export async function getAnalyticsRepository(): Promise<AnalyticsRepository> {
  if (!repository) {
    repository = await createAnalyticsRepository(getConfig());
    await repository.initialize();
  }
  return repository;
}
