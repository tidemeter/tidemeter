import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

// Payload 3.90+ uses this nullable field to throttle password-reset requests.
// Some installations already received it through development schema push.
// Existing password hashes and salts must stay intact: Payload upgrades legacy
// hashes after successful authentication, when the plaintext password is known.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "reset_password_requested_at" timestamp(3) with time zone;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" DROP COLUMN IF EXISTS "reset_password_requested_at";
  `);
}
