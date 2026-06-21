import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "public_id" varchar;
  -- Backfill existing rows with a non-sequential public id. The row id is only
  -- mixed into the hash input (to guarantee uniqueness) and is never exposed.
  UPDATE "websites"
    SET "public_id" = substr(md5(random()::text || clock_timestamp()::text || "id"::text), 1, 16)
    WHERE "public_id" IS NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS "websites_public_id_idx" ON "websites" USING btree ("public_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "websites_public_id_idx";
  ALTER TABLE "websites" DROP COLUMN IF EXISTS "public_id";
  `)
}
