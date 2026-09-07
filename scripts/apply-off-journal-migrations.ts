/**
 * Apply the OFF-JOURNAL migrations that `drizzle-kit migrate` does NOT run.
 *
 * Migrations 0002+ (RLS, the campaign_status enum value, renewal-notice tracking,
 * the committee drop) are real SQL files in src/lib/db/migrations but are
 * deliberately NOT journal entries (meta/_journal.json only has 0000 + 0001),
 * because they do things drizzle-kit can't express (ALTER TYPE ADD VALUE,
 * ENABLE RLS) or that must run outside the journal. `drizzle-kit migrate`
 * therefore SKIPS them — a fresh environment provisioned with `db:migrate` alone
 * is missing them, and code that writes e.g. campaign_status='sent_with_errors'
 * will crash on an unknown enum.
 *
 * This script used to replay the whole list on every run and describe that as
 * idempotent. It was not: 0002 enables RLS on committee_members/committees and
 * 0011 drops both tables, so the second run failed on a missing relation and
 * took every later migration down with it. Files are now recorded in a durable
 * ledger (public.off_journal_migrations) and each one runs exactly once.
 *
 *   pnpm db:migrate:all      # drizzle-kit migrate, then this
 *   pnpm tsx scripts/apply-off-journal-migrations.ts   # standalone
 *
 * HOW A FRESH DATABASE PROVISIONS (the whole point of db:migrate:all):
 *
 *   1. `drizzle-kit migrate` creates the journaled schema (0000 + 0001).
 *   2. This script confirms that schema exists, then asks the LIVE SCHEMA which
 *      off-journal files have already left their mark (OFF_JOURNAL_EVIDENCE).
 *      On a genuinely fresh database the answer is "none of them", so all ten
 *      run, in order, and are recorded. No flag, no prompt, exit 0.
 *
 * The probe used to be "does public.organizations exist" — a table step 1 had
 * just created. It therefore tripped on EVERY fresh provision, hard-failed
 * db:migrate:all, and the first remediation it printed was a bare `--baseline`,
 * which records 0002–0011 as applied WITHOUT RUNNING THEM. Following that on a
 * fresh production database silently leaves it with no RLS, no
 * 'sent_with_errors' enum value and no hot_deals/resources/session_epoch.
 *
 * RECONCILING an environment provisioned BEFORE the ledger existed:
 *
 *   … --reconcile      ← the safe one, and the only one this script suggests
 *     Reads the live schema, records ONLY the files whose effects are already
 *     there, and RUNS the rest. Verified, not asserted.
 *
 *   … --baseline=0007_resources.sql
 *     Operator assertion: record through 0007, run 0008 onward. Refused if the
 *     live schema shows any of those files was never applied.
 *
 *   … --baseline      ← assumption-making, last resort, never suggested here
 *     Records EVERY file as applied WITHOUT RUNNING IT. Refused unless the live
 *     schema agrees every one of them is already applied; `--force-baseline`
 *     overrides that refusal and prints a loud warning about what it skipped.
 *
 * Other flags:
 *   --allow-drift   proceed although an already-applied file changed on disk
 *                   (without it, drift is a hard failure — see below).
 *
 * Uses DATABASE_URL_UNPOOLED (direct connection) if set, else DATABASE_URL.
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import {
  BASE_SCHEMA_PROBE,
  LEDGER_DDL,
  LEDGER_TABLE,
  OFF_JOURNAL,
  checksum,
  driftIsFatal,
  evidenceQuery,
  needsReconciliation,
  parseFlags,
  planMigrations,
  reconcileFromEvidence,
  unprovenBaseline,
  type LedgerRow,
} from "./lib-off-journal-migrations";

const list = (files: readonly string[]) =>
  files.length ? files.map((f) => `      • ${f}`).join("\n") : "      (none)";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL_UNPOOLED (or DATABASE_URL) is not set.");
    process.exit(1);
  }

  const flags = parseFlags(process.argv.slice(2));
  const dir = join(process.cwd(), "src", "lib", "db", "migrations");

  const sources: Record<string, string> = {};
  const checksums: Record<string, string> = {};
  for (const file of OFF_JOURNAL) {
    sources[file] = readFileSync(join(dir, file), "utf8");
    checksums[file] = checksum(sources[file]);
  }

  const sql = postgres(url, { ssl: "require", max: 1 });

  try {
    // The journaled schema has to exist first: every off-journal file ALTERs a
    // table 0000/0001 create. Missing it is an ordering mistake, not a state to
    // reconcile — say so instead of failing later on a missing relation.
    const [base] = (await sql.unsafe(
      `SELECT to_regclass('public.${BASE_SCHEMA_PROBE}') IS NOT NULL AS present`,
    )) as unknown as { present: boolean }[];

    if (!base?.present) {
      console.error(
        [
          `✗ public.${BASE_SCHEMA_PROBE} does not exist, so the journaled migrations`,
          "  (0000, 0001) have not run here yet and no off-journal file can succeed.",
          "",
          "    pnpm db:migrate:all     # drizzle-kit migrate, then this script",
        ].join("\n"),
      );
      process.exit(1);
    }

    await sql.unsafe(LEDGER_DDL);

    const ledger = (await sql.unsafe(
      `SELECT filename, checksum FROM ${LEDGER_TABLE}`,
    )) as unknown as LedgerRow[];

    // Ask the LIVE SCHEMA what has already been applied. This is the provisioned
    // probe: per-file evidence of the off-journal work itself, never a table
    // drizzle-kit created moments ago.
    const [row] = (await sql.unsafe(evidenceQuery(OFF_JOURNAL))) as unknown as Record<
      string,
      boolean
    >[];
    const evidence: Record<string, boolean> = {};
    OFF_JOURNAL.forEach((file, i) => {
      evidence[file] = row?.[`f${i}`] === true;
    });
    const state = reconcileFromEvidence(OFF_JOURNAL, evidence);

    let baselineFiles: string[] | undefined;

    if (flags.reconcile) {
      // Baseline exactly what the schema proves, run everything else.
      baselineFiles = state.applied;
      console.log(
        [
          "↺ --reconcile: derived from the live schema, not asserted.",
          `  already applied (recorded, not run):\n${list(state.applied)}`,
          `  not applied (will RUN):\n${list(state.missing)}`,
          "",
        ].join("\n"),
      );
    } else if (flags.baselineThrough) {
      const unproven = unprovenBaseline(
        OFF_JOURNAL,
        ledger,
        evidence,
        flags.baselineThrough,
      );
      if (unproven.length && !flags.forceBaseline) {
        console.error(
          [
            "✗ that baseline would mark migration(s) as applied that this database",
            "  demonstrably has NOT had applied — they would never run:",
            "",
            list(unproven),
            "",
            "  Use the verified path instead; it records only what is really there",
            "  and RUNS the rest:",
            "",
            "    …apply-off-journal-migrations.ts --reconcile",
            "",
            "  Or narrow the assertion to the last file that really did run:",
            "",
            `    …apply-off-journal-migrations.ts --baseline=${
              state.applied[state.applied.length - 1] ?? OFF_JOURNAL[0]
            }`,
          ].join("\n"),
        );
        process.exit(1);
      }
      if (unproven.length) {
        console.warn(
          [
            "",
            "⚠⚠⚠  --force-baseline: SKIPPING migration(s) this database does not have.",
            "     They will be recorded as applied and will NEVER run here:",
            "",
            list(unproven),
            "",
            "     If any of them was a security control (0002 is RLS on every public",
            "     table), this database does not have it and nothing will tell you so",
            "     again. --reconcile would have run them.",
            "",
          ].join("\n"),
        );
      }
    } else if (needsReconciliation(ledger.length, state, flags)) {
      // Empty ledger on a database that already carries off-journal work: the
      // LEDGER is new, not the database. Guessing either way is wrong — replaying
      // is what this rewrite exists to stop, and assuming "all applied" is how
      // a security migration gets skipped.
      console.error(
        [
          `✗ ${LEDGER_TABLE} is empty, but this database already has`,
          `  ${state.applied.length} of ${OFF_JOURNAL.length} off-journal migration(s) applied`,
          "  (detected in the live schema), so the recorded history is unknown.",
          "",
          `  already applied:\n${list(state.applied)}`,
          `  NOT applied:\n${list(state.missing)}`,
          "",
          "  Reconcile it once — this reads the schema rather than trusting anyone,",
          "  records only what is really there, and RUNS what is missing:",
          "",
          "    …apply-off-journal-migrations.ts --reconcile",
          "",
          "  After that this script runs unattended forever.",
        ].join("\n"),
      );
      process.exit(1);
    }

    const plan = planMigrations(
      OFF_JOURNAL,
      ledger,
      checksums,
      flags.baselineThrough,
      baselineFiles,
    );

    if (plan.unknown.length) {
      console.warn(
        `⚠ ledger names ${plan.unknown.length} migration(s) this build does not have: ${plan.unknown.join(", ")}`,
      );
    }

    // Drift is a hard failure. It used to be a console.warn, so an edited
    // already-applied migration left db:migrate:all green and nobody ever saw
    // the line scroll past in CI.
    if (driftIsFatal(plan, flags)) {
      console.error(
        [
          `✗ already-applied migration file(s) changed on disk since they ran:`,
          "",
          list(plan.drifted),
          "",
          "  They will NOT be re-run, so this database and the repo disagree.",
          "  Add a NEW migration expressing the change instead of editing one.",
          "  To proceed anyway (and accept the divergence): --allow-drift",
        ].join("\n"),
      );
      process.exit(1);
    }
    if (plan.drifted.length) {
      console.warn(
        `⚠ --allow-drift: proceeding although ${plan.drifted.join(", ")} changed on disk since they ran.`,
      );
    }

    if (ledger.length === 0 && !flags.baselineThrough && !flags.reconcile) {
      console.log(
        `✓ fresh database: no off-journal migration has ever run here. Applying all ${plan.pending.length}.\n`,
      );
    }

    for (const file of plan.baseline) {
      await sql.unsafe(
        `INSERT INTO ${LEDGER_TABLE} (filename, checksum) VALUES ($1, $2)
         ON CONFLICT (filename) DO NOTHING`,
        [file, checksums[file]],
      );
      console.log(`≡ ${file} … recorded as already applied (baseline, not run)`);
    }

    for (const file of plan.pending) {
      process.stdout.write(`→ ${file} … `);
      await sql.unsafe(sources[file]);
      await sql.unsafe(
        `INSERT INTO ${LEDGER_TABLE} (filename, checksum) VALUES ($1, $2)
         ON CONFLICT (filename) DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = now()`,
        [file, checksums[file]],
      );
      console.log("ok");
    }

    const skipped = OFF_JOURNAL.length - plan.pending.length - plan.baseline.length;
    console.log(
      `\n✓ ${plan.pending.length} applied, ${plan.baseline.length} baselined, ${skipped} already recorded.`,
    );
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("\n✗ off-journal migration failed:", err);
  process.exit(1);
});
