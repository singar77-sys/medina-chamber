/**
 * One-shot runner for the GrowthZone → Supabase sync.
 * Uses .env.local for DB credentials. Safe to delete after testing.
 *
 *   pnpm tsx --env-file=.env.local scripts/run-gz-sync.ts
 */

import { runGzSync } from "@/lib/gz-sync";

void (async () => {
  console.log("🔄  Starting GrowthZone → Supabase sync...\n");

  const result = await runGzSync();

  console.log("✅  Done!\n");
  console.log(`  Synced:   ${result.added} organizations`);
  console.log(`  Errors:   ${result.errors}`);
  console.log(`  Duration: ${result.durationMs}ms`);

  if (result.errorDetails.length > 0) {
    console.log("\n⚠  Error details:");
    for (const e of result.errorDetails) {
      console.log(`  [${e.id}] ${e.error}`);
    }
  }

  process.exit(result.errors > 0 ? 1 : 0);
})();
