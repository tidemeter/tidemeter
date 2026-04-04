import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.ANALYTICS_DATABASE_URL || 'postgresql://tidemeter:tidemeter@localhost:5432/tidemeter',
  },
});
