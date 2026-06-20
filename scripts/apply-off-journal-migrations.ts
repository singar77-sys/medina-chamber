/**
 * Apply the OFF-JOURNAL migrations that `drizzle-kit migrate` does NOT run.
 *
 * Migrations 0002+ (RLS, the campaign_status enum value, renewal-notice tracking)
 * are real SQL files in src/lib/db/migrations but are deliberately NOT journal
 * entries (meta/_journal.json only has 0000 + 0001), because they do things
 * drizzle-kit can't express (ALTER TYPE ADD VALUE, ENABLE RLS) or that must run
 * outside the journal. `drizzle-kit migrate` therefore SKIPS them — a fresh
 * environment provisioned with `db:migrate` alone is missing them, and code that
 * writes e.g. campaign_status='sent_with_errors' will crash on an unknown enum.
 *
 * Every off-journal file is idempotent (IF NOT EXISTS / ENABLE RLS is a no-op
 * when already enabled), so this script is safe to run repeatedly and on any
 * environment — new or existing.
 *
 *   pnpm db:migrate:all      # drizzle-kit migrate, then this
 *   pnpm tsx scripts/apply-off-journal-migrations.ts   # standalone
 *
 * Uses DATABASE_URL_UNPOOLED (direct connection) if set, else DATABASE_URL.
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

// Keep in lockstep with the off-journal .sql files in src/lib/db/migrations.
const OFF_JOURNAL = [
  "0002_enable_rls.sql",
  "0003_campaign_sent_with_errors.sql",
  "0004_renewal_notice_tracking.sql",
  "0005_hot_deals.sql",
  "0006_sponsorship_inquiries.sql",
];

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL_UNPOOLED (or DATABASE_URL) is not set.");
    process.exit(1);
  }

  const dir = join(process.cwd(), "src", "lib", "db", "migrations");
  const sql = postgres(url, { ssl: "require", max: 1 });

  try {
    for (const file of OFF_JOURNAL) {
      const ddl = readFileSync(join(dir, file), "utf8");
      process.stdout.write(`→ ${file} … `);
      await sql.unsafe(ddl);
      console.log("ok");
    }
    console.log(`\n✓ ${OFF_JOURNAL.length} off-journal migration(s) applied (idempotent).`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("\n✗ off-journal migration failed:", err);
  process.exit(1);
});
