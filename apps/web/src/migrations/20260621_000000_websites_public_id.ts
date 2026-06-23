import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  -- pgcrypto provides gen_random_bytes() for generating the public id.
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "public_id" varchar;
  -- Backfill existing rows with the same format new rows use: 12 random bytes
  -- encoded as 16 URL-safe base64 characters (~96 bits, non-sequential).
  UPDATE "websites"
    SET "public_id" = translate(encode(gen_random_bytes(12), 'base64'), '+/', '-_')
    WHERE "public_id" IS NULL;
  ALTER TABLE "websites" ALTER COLUMN "public_id" SET NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS "websites_public_id_idx" ON "websites" USING btree ("public_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "websites_public_id_idx";
  ALTER TABLE "websites" DROP COLUMN IF EXISTS "public_id";
  `);
}
