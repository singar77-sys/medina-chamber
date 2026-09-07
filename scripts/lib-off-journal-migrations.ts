/**
 * Pure planning logic for the off-journal migration runner.
 *
 * Split out of apply-off-journal-migrations.ts so the ordering rules can be
 * tested without a database — the defect this exists to prevent is an ordering
 * defect, and it shipped precisely because nothing could exercise a second run.
 *
 * The defect: the runner replayed the whole 0002–0011 list on every invocation
 * and called that idempotent. It isn't. 0002 unconditionally runs
 * `ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY`, and 0011
 * drops committee_members and committees. Replaying after a successful run
 * therefore hits ALTER TABLE on a relation that no longer exists, the script
 * exits 1, and every off-journal migration added after 0011 is unreachable —
 * a release gate for the dormant transaction backend, not a live outage.
 *
 * Two independent fixes, both here:
 *   1. a durable ledger, so an applied file is never replayed at all;
 *   2. 0002 guards the committee tables with to_regclass, so even a replay
 *      against a post-0011 database is a no-op rather than an error.
 *
 * A THIRD defect, found in review of the above: the "is this database already
 * provisioned?" probe used to be `public.organizations`, a table `drizzle-kit
 * migrate` creates in 0000 — the step that runs immediately before this script
 * in `db:migrate:all`. So on a brand-new database the probe always tripped, the
 * script always exited 1, and the FIRST remediation it printed was a bare
 * `--baseline`: record 0002–0011 as applied without running any of them. An
 * operator following that on fresh production would get no RLS, no
 * `sent_with_errors` enum value, no hot_deals / resources / session_epoch —
 * silently. Provisioning state is now derived from EVIDENCE of the off-journal
 * work itself (OFF_JOURNAL_EVIDENCE below), never from a table drizzle just
 * created, and a baseline that would skip a migration the live schema says is
 * missing is refused rather than suggested.
 */

import { createHash } from "node:crypto";

/** Keep in lockstep with the off-journal .sql files in src/lib/db/migrations. */
export const OFF_JOURNAL = [
  "0002_enable_rls.sql",
  "0003_campaign_sent_with_errors.sql",
  "0004_renewal_notice_tracking.sql",
  "0005_hot_deals.sql",
  "0006_sponsorship_inquiries.sql",
  "0007_resources.sql",
  "0008_integrity_hardening.sql",
  "0009_session_epoch.sql",
  "0010_magic_token_epoch.sql",
  "0011_drop_committees.sql",
] as const;

export const LEDGER_TABLE = "public.off_journal_migrations";

/** Created before anything else runs, including on a database that predates it.
 *  RLS matches the posture 0002 sets for every other public table. */
export const LEDGER_DDL = `
CREATE TABLE IF NOT EXISTS ${LEDGER_TABLE} (
  filename   text PRIMARY KEY,
  checksum   text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ${LEDGER_TABLE} ENABLE ROW LEVEL SECURITY;
`;

/**
 * The journaled schema. Its ABSENCE means `drizzle-kit migrate` has not run yet
 * and no off-journal file can succeed (they all ALTER tables 0000/0001 create).
 * Its PRESENCE proves nothing about off-journal state — 0000 creates it — which
 * is exactly why it is no longer the provisioned probe.
 */
export const BASE_SCHEMA_PROBE = "organizations";

/**
 * Per-file evidence: a SQL boolean expression that is TRUE when that
 * migration's effect is already present in the live schema.
 *
 * This is the provisioned probe. It answers the only question that matters —
 * "has THIS file already run here?" — from the artefact the file leaves behind,
 * rather than from an unrelated table drizzle-kit created moments earlier.
 *
 * Each expression is deliberately CONSERVATIVE: where a file makes several
 * changes the expression ANDs them, so a half-applied file reads as
 * not-applied and gets re-run. Every off-journal file is individually
 * idempotent (IF NOT EXISTS / to_regclass guards), so re-running one is a
 * no-op; wrongly declaring one applied is not.
 *
 * Only meaningful once BASE_SCHEMA_PROBE exists — 0011's evidence ("the
 * committee tables are gone") is trivially true on an empty database, because
 * 0001 is what creates them.
 */
export const OFF_JOURNAL_EVIDENCE: Readonly<Record<string, string>> = {
  // RLS enabled on a table 0002 names and nothing else touches.
  "0002_enable_rls.sql":
    "COALESCE((SELECT c.relrowsecurity FROM pg_class c WHERE c.oid = to_regclass('public.organizations')), false)",
  "0003_campaign_sent_with_errors.sql":
    "EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'campaign_status' AND e.enumlabel = 'sent_with_errors')",
  "0004_renewal_notice_tracking.sql":
    "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'renewal_notice_sent_days')",
  "0005_hot_deals.sql": "to_regclass('public.hot_deals') IS NOT NULL",
  "0006_sponsorship_inquiries.sql": "to_regclass('public.sponsorship_inquiries') IS NOT NULL",
  "0007_resources.sql": "to_regclass('public.resources') IS NOT NULL",
  // All three of 0008's statements, ANDed: a partially-applied 0008 re-runs.
  "0008_integrity_hardening.sql": [
    "EXISTS (SELECT 1 FROM pg_class WHERE relname = 'invoices_membership_period_uniq' AND relkind = 'i')",
    "EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_registrations_identity_chk')",
    "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'memberships' AND column_name = 'past_due_since')",
  ].join(" AND "),
  "0009_session_epoch.sql":
    "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'session_epoch')",
  "0010_magic_token_epoch.sql":
    "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'magic_token_epoch')",
  // 0011 DROPs; its evidence is the absence of what 0001 created.
  "0011_drop_committees.sql":
    "to_regclass('public.committees') IS NULL AND to_regclass('public.committee_members') IS NULL",
};

/** One round trip: `SELECT (<expr>) AS f0, (<expr>) AS f1, …`. */
export function evidenceQuery(all: readonly string[]): string {
  const cols = all.map((file, i) => {
    const expr = OFF_JOURNAL_EVIDENCE[file];
    if (!expr) {
      throw new Error(
        `${file} has no OFF_JOURNAL_EVIDENCE entry. Add one — without it the runner ` +
          `cannot tell a fresh database from one that already has this migration.`,
      );
    }
    return `(${expr}) AS f${i}`;
  });
  return `SELECT ${cols.join(", ")}`;
}

export function checksum(sql: string): string {
  // Normalise line endings: this repo has a mixed-EOL tree, and a CRLF/LF flip
  // is not a migration change.
  return createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex");
}

export interface LedgerRow {
  filename: string;
  checksum: string;
}

export interface Plan {
  /** Files to execute, in order. */
  pending: string[];
  /** Files to record as applied WITHOUT executing them (baseline reconcile). */
  baseline: string[];
  /** Applied files whose contents no longer match what was recorded. */
  drifted: string[];
  /** Ledger rows naming files this build does not know about. */
  unknown: string[];
}

/** What the live schema says about an off-journal file set. */
export interface Reconciliation {
  /** Evidence present — already applied here. */
  applied: string[];
  /** Evidence absent — not applied here, must be RUN, never baselined. */
  missing: string[];
}

/**
 * Turn per-file evidence into a reconciliation.
 *
 * `applied` empty ⇔ this database has never had an off-journal migration, i.e.
 * it is FRESH and everything simply runs. Anything else is a pre-existing
 * environment whose ledger is empty only because the ledger is new.
 */
export function reconcileFromEvidence(
  all: readonly string[],
  evidence: Readonly<Record<string, boolean>>,
): Reconciliation {
  const applied: string[] = [];
  const missing: string[] = [];
  for (const file of all) (evidence[file] ? applied : missing).push(file);
  return { applied, missing };
}

/** No off-journal artefact exists ⇒ nothing has ever been applied here. */
export function isFreshDatabase(state: Reconciliation): boolean {
  return state.applied.length === 0;
}

/**
 * Files a baseline request would record as applied WITHOUT running them, that
 * the live schema says were never applied. Non-empty means the baseline is a
 * silent migration skip: it must be refused, never suggested.
 */
export function unprovenBaseline(
  all: readonly string[],
  ledger: readonly LedgerRow[],
  evidence: Readonly<Record<string, boolean>>,
  baselineThrough: string | "all",
): string[] {
  const plan = planMigrations(all, ledger, {}, baselineThrough);
  return plan.baseline.filter((f) => !evidence[f]);
}

/**
 * Decide what to run.
 *
 * `baselineThrough` reconciles an already-provisioned environment: everything up
 * to and including that filename is recorded as applied without being executed,
 * because it demonstrably already ran there. `"all"` baselines the whole list.
 *
 * `baselineFiles` does the same for an explicit SET rather than a prefix. That
 * is what `--reconcile` passes, derived from OFF_JOURNAL_EVIDENCE, so the
 * baselined set is the set the live schema proves is already applied and every
 * other file still runs.
 */
export function planMigrations(
  all: readonly string[],
  ledger: readonly LedgerRow[],
  currentChecksums: Readonly<Record<string, string>>,
  baselineThrough?: string | "all",
  baselineFiles?: readonly string[],
): Plan {
  const applied = new Map(ledger.map((r) => [r.filename, r.checksum]));

  const drifted = all.filter(
    (f) => applied.has(f) && applied.get(f) !== currentChecksums[f],
  );
  const unknown = ledger.map((r) => r.filename).filter((f) => !all.includes(f));

  let baselineCount = 0;
  if (baselineThrough === "all") {
    baselineCount = all.length;
  } else if (baselineThrough) {
    const idx = all.indexOf(baselineThrough);
    if (idx === -1) {
      throw new Error(
        `--baseline=${baselineThrough} is not an off-journal migration. Known: ${all.join(", ")}`,
      );
    }
    baselineCount = idx + 1;
  }

  const explicit = new Set(baselineFiles ?? []);
  for (const file of explicit) {
    if (!all.includes(file)) {
      throw new Error(
        `${file} is not an off-journal migration and cannot be baselined. Known: ${all.join(", ")}`,
      );
    }
  }

  const baseline: string[] = [];
  const pending: string[] = [];
  all.forEach((file, i) => {
    if (applied.has(file)) return;
    if (i < baselineCount || explicit.has(file)) baseline.push(file);
    else pending.push(file);
  });

  return { pending, baseline, drifted, unknown };
}

export interface RunnerFlags {
  /** `--baseline` / `--baseline=<file>` — an operator ASSERTION, verified. */
  baselineThrough?: string | "all";
  /** `--reconcile` — derive the baseline set from the live schema instead. */
  reconcile: boolean;
  /** `--force-baseline` — last resort: baseline what the schema contradicts. */
  forceBaseline: boolean;
  /** `--allow-drift` — proceed although an applied file changed on disk. */
  allowDrift: boolean;
}

/**
 * Parse the runner's flags.
 *
 * `--baseline=` with an EMPTY value used to mean "baseline everything", so a
 * shell that expanded a variable to nothing silently skipped every migration.
 * It is an error now.
 */
export function parseFlags(argv: readonly string[]): RunnerFlags {
  const flags: RunnerFlags = {
    reconcile: argv.includes("--reconcile"),
    forceBaseline: argv.includes("--force-baseline"),
    allowDrift: argv.includes("--allow-drift"),
  };

  const arg = argv.find((a) => a === "--baseline" || a.startsWith("--baseline="));
  if (arg === "--baseline") {
    flags.baselineThrough = "all";
  } else if (arg) {
    const value = arg.slice("--baseline=".length).trim();
    if (value === "") {
      throw new Error(
        "--baseline= was given an empty value. Pass --baseline=<file> to record " +
          "through one file, or --baseline (no '=') to record ALL of them.",
      );
    }
    flags.baselineThrough = value === "all" ? "all" : value;
  }

  if (flags.baselineThrough && flags.reconcile) {
    throw new Error(
      "--reconcile and --baseline do the same job differently and cannot be combined: " +
        "--reconcile derives the already-applied set from the live schema, --baseline " +
        "asserts it. Pick one.",
    );
  }
  if (flags.forceBaseline && !flags.baselineThrough) {
    throw new Error("--force-baseline only means something alongside --baseline.");
  }

  return flags;
}

/**
 * Does the runner have to stop and ask for a reconciliation?
 *
 * ONLY when the ledger is empty AND the live schema shows off-journal work. A
 * fresh database (drizzle has run, no off-journal artefact) returns false and
 * provisions end to end with no flag at all — which is the whole fix: the old
 * probe answered "already provisioned" for every fresh database, because it
 * looked for a table `drizzle-kit migrate` had created seconds earlier.
 */
export function needsReconciliation(
  ledgerCount: number,
  state: Reconciliation,
  flags: Pick<RunnerFlags, "baselineThrough" | "reconcile">,
): boolean {
  if (flags.reconcile || flags.baselineThrough) return false;
  return ledgerCount === 0 && !isFreshDatabase(state);
}

/**
 * Drift — an already-applied migration edited on disk — is a HARD failure.
 *
 * It used to be a console.warn, so `db:migrate:all` stayed green and the line
 * scrolled past in CI unread. The file is still never re-run either way; the
 * difference is whether anybody finds out that the database and the repo
 * disagree. `--allow-drift` is the deliberate, recorded override.
 */
export function driftIsFatal(
  plan: Pick<Plan, "drifted">,
  flags: Pick<RunnerFlags, "allowDrift">,
): boolean {
  return plan.drifted.length > 0 && !flags.allowDrift;
}

/** Convenience wrapper for callers that only want the baseline argument. */
export function parseBaselineArg(argv: readonly string[]): string | "all" | undefined {
  return parseFlags(argv).baselineThrough;
}
