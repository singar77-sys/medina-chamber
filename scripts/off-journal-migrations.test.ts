import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OFF_JOURNAL,
  OFF_JOURNAL_EVIDENCE,
  checksum,
  driftIsFatal,
  evidenceQuery,
  isFreshDatabase,
  needsReconciliation,
  parseBaselineArg,
  parseFlags,
  planMigrations,
  reconcileFromEvidence,
  unprovenBaseline,
  type LedgerRow,
} from "./lib-off-journal-migrations";

const DIR = join(process.cwd(), "src", "lib", "db", "migrations");
const read = (file: string) => readFileSync(join(DIR, file), "utf8");

function checksumsOf(files: readonly string[]): Record<string, string> {
  return Object.fromEntries(files.map((f) => [f, checksum(read(f))]));
}

const CURRENT = checksumsOf(OFF_JOURNAL);
const ledger = (...files: string[]): LedgerRow[] =>
  files.map((f) => ({ filename: f, checksum: CURRENT[f] }));

/** Live-schema answers: the named files show evidence, the rest do not. */
const evidenceFor = (...applied: string[]): Record<string, boolean> =>
  Object.fromEntries(OFF_JOURNAL.map((f) => [f, applied.includes(f)]));

describe("planMigrations", () => {
  it("runs everything, in order, against an empty ledger", () => {
    const plan = planMigrations(OFF_JOURNAL, [], CURRENT);
    expect(plan.pending).toEqual([...OFF_JOURNAL]);
    expect(plan.baseline).toEqual([]);
  });

  it("runs NOTHING on a second pass — the defect that motivated the ledger", () => {
    // Run one: everything applies. Run two: 0002 must not replay, because 0011
    // has by then dropped the tables 0002 enables RLS on.
    const afterFirstRun = ledger(...OFF_JOURNAL);
    const plan = planMigrations(OFF_JOURNAL, afterFirstRun, CURRENT);
    expect(plan.pending).toEqual([]);
    expect(plan.baseline).toEqual([]);
  });

  it("applies only the new file when the list grows", () => {
    const grown = [...OFF_JOURNAL, "0012_future.sql"];
    const checksumsWithFuture = { ...CURRENT, "0012_future.sql": "abc" };
    const plan = planMigrations(grown, ledger(...OFF_JOURNAL), checksumsWithFuture);
    expect(plan.pending).toEqual(["0012_future.sql"]);
  });

  it("resumes a part-way environment without replaying what already ran", () => {
    const partial = ledger("0002_enable_rls.sql", "0003_campaign_sent_with_errors.sql");
    const plan = planMigrations(OFF_JOURNAL, partial, CURRENT);
    expect(plan.pending).toEqual(OFF_JOURNAL.slice(2));
  });
});

/**
 * The four states the runner has to tell apart, from the live schema alone.
 *
 * The regression these guard: the provisioned probe used to be
 * `public.organizations`, which `drizzle-kit migrate` creates in 0000 — the step
 * that runs immediately before this script in `db:migrate:all`. Every fresh
 * database therefore looked "already provisioned", `db:migrate:all` hard-failed,
 * and the remediation it printed first was a bare `--baseline` that records
 * 0002–0011 as applied WITHOUT running them.
 */
describe("classifying a database from off-journal evidence", () => {
  it("FRESH: drizzle has run, no off-journal artefact exists → run everything", () => {
    // Exactly the state db:migrate:all produces on a brand-new database:
    // 0000/0001 applied (so public.organizations EXISTS), nothing off-journal.
    const state = reconcileFromEvidence(OFF_JOURNAL, evidenceFor());
    expect(isFreshDatabase(state)).toBe(true);
    expect(state.missing).toEqual([...OFF_JOURNAL]);

    const plan = planMigrations(OFF_JOURNAL, [], CURRENT);
    expect(plan.pending).toEqual([...OFF_JOURNAL]);
    expect(plan.baseline).toEqual([]);
  });

  it("PRE-EXISTING, empty ledger: everything applied → not fresh, baseline is honest", () => {
    const state = reconcileFromEvidence(OFF_JOURNAL, evidenceFor(...OFF_JOURNAL));
    expect(isFreshDatabase(state)).toBe(false);
    expect(state.missing).toEqual([]);
    // Nothing unproven, so a full baseline is allowed here.
    expect(
      unprovenBaseline(OFF_JOURNAL, [], evidenceFor(...OFF_JOURNAL), "all"),
    ).toEqual([]);
  });

  it("PARTIALLY applied, empty ledger: --reconcile baselines the real ones and RUNS the rest", () => {
    const applied = OFF_JOURNAL.slice(0, 6);
    const state = reconcileFromEvidence(OFF_JOURNAL, evidenceFor(...applied));
    expect(isFreshDatabase(state)).toBe(false);

    const plan = planMigrations(OFF_JOURNAL, [], CURRENT, undefined, state.applied);
    expect(plan.baseline).toEqual([...applied]);
    expect(plan.pending).toEqual(OFF_JOURNAL.slice(6));
  });

  it("--reconcile handles a NON-CONTIGUOUS history a prefix baseline cannot express", () => {
    // 0005 was applied by hand, 0003/0004 never were. A --baseline=0005 would
    // silently skip both; the evidence-derived set runs them.
    const state = reconcileFromEvidence(
      OFF_JOURNAL,
      evidenceFor("0002_enable_rls.sql", "0005_hot_deals.sql"),
    );
    const plan = planMigrations(OFF_JOURNAL, [], CURRENT, undefined, state.applied);
    expect(plan.baseline).toEqual(["0002_enable_rls.sql", "0005_hot_deals.sql"]);
    expect(plan.pending).toContain("0003_campaign_sent_with_errors.sql");
    expect(plan.pending).toContain("0004_renewal_notice_tracking.sql");
    expect(plan.pending).not.toContain("0005_hot_deals.sql");
  });

  it("DRIFTED ledger: the edited file is reported and never re-run", () => {
    const stale: LedgerRow[] = [{ filename: "0002_enable_rls.sql", checksum: "stale" }];
    const plan = planMigrations(OFF_JOURNAL, stale, CURRENT);
    expect(plan.drifted).toEqual(["0002_enable_rls.sql"]);
    expect(plan.pending).not.toContain("0002_enable_rls.sql");
  });
});

/**
 * The dangerous flag. A bare `--baseline` records every file as applied without
 * running it; on a database that never had them, that is a silent loss of RLS,
 * the sent_with_errors enum value, hot_deals, resources and the two auth epochs.
 */
describe("--baseline can never silently skip a migration", () => {
  it("refuses a full baseline when the schema says a file was never applied", () => {
    const unproven = unprovenBaseline(
      OFF_JOURNAL,
      [],
      evidenceFor("0002_enable_rls.sql"),
      "all",
    );
    expect(unproven).toEqual(OFF_JOURNAL.slice(1));
  });

  it("refuses a prefix baseline that reaches past what was really applied", () => {
    const unproven = unprovenBaseline(
      OFF_JOURNAL,
      [],
      evidenceFor(...OFF_JOURNAL.slice(0, 3)),
      "0007_resources.sql",
    );
    expect(unproven).toEqual([
      "0005_hot_deals.sql",
      "0006_sponsorship_inquiries.sql",
      "0007_resources.sql",
    ]);
  });

  it("allows a baseline the schema fully agrees with", () => {
    // 0002–0006 applied. Reaching to 0007 is one file too far; stopping at 0006
    // is exactly what happened here, so it is allowed.
    const applied = evidenceFor(...OFF_JOURNAL.slice(0, 5));
    expect(
      unprovenBaseline(OFF_JOURNAL, [], applied, "0007_resources.sql"),
    ).toEqual(["0007_resources.sql"]);
    expect(
      unprovenBaseline(OFF_JOURNAL, [], applied, "0006_sponsorship_inquiries.sql"),
    ).toEqual([]);
  });

  it("never questions a file the ledger already records", () => {
    // Already recorded ⇒ not part of the baseline set at all.
    expect(
      unprovenBaseline(OFF_JOURNAL, ledger(...OFF_JOURNAL), evidenceFor(), "all"),
    ).toEqual([]);
  });
});

describe("baselining an environment provisioned before the ledger existed", () => {
  it("--baseline records every file as applied and runs none of them", () => {
    const plan = planMigrations(OFF_JOURNAL, [], CURRENT, "all");
    expect(plan.baseline).toEqual([...OFF_JOURNAL]);
    expect(plan.pending).toEqual([]);
  });

  it("--baseline=<file> records through that file and RUNS the rest", () => {
    const plan = planMigrations(OFF_JOURNAL, [], CURRENT, "0007_resources.sql");
    expect(plan.baseline).toEqual([
      "0002_enable_rls.sql",
      "0003_campaign_sent_with_errors.sql",
      "0004_renewal_notice_tracking.sql",
      "0005_hot_deals.sql",
      "0006_sponsorship_inquiries.sql",
      "0007_resources.sql",
    ]);
    expect(plan.pending).toEqual([
      "0008_integrity_hardening.sql",
      "0009_session_epoch.sql",
      "0010_magic_token_epoch.sql",
      "0011_drop_committees.sql",
    ]);
  });

  it("refuses a baseline naming a file that is not an off-journal migration", () => {
    expect(() => planMigrations(OFF_JOURNAL, [], CURRENT, "0099_nope.sql")).toThrow(
      /not an off-journal migration/,
    );
  });

  it("refuses an explicit baseline set naming an unknown file", () => {
    expect(() =>
      planMigrations(OFF_JOURNAL, [], CURRENT, undefined, ["0099_nope.sql"]),
    ).toThrow(/cannot be baselined/);
  });

  it("never re-baselines a file the ledger already has", () => {
    const plan = planMigrations(OFF_JOURNAL, ledger("0002_enable_rls.sql"), CURRENT, "all");
    expect(plan.baseline).not.toContain("0002_enable_rls.sql");
  });
});

describe("ledger integrity signals", () => {
  it("reports a file edited after it was applied, and still refuses to re-run it", () => {
    const stale: LedgerRow[] = [{ filename: "0002_enable_rls.sql", checksum: "stale" }];
    const plan = planMigrations(OFF_JOURNAL, stale, CURRENT);
    expect(plan.drifted).toEqual(["0002_enable_rls.sql"]);
    expect(plan.pending).not.toContain("0002_enable_rls.sql");
  });

  it("reports ledger rows this build does not know about", () => {
    const plan = planMigrations(
      OFF_JOURNAL,
      [{ filename: "0099_from_a_newer_branch.sql", checksum: "x" }],
      CURRENT,
    );
    expect(plan.unknown).toEqual(["0099_from_a_newer_branch.sql"]);
  });

  it("ignores a CRLF/LF flip — this repo has a mixed-EOL tree", () => {
    const lf = "ALTER TABLE public.x ENABLE ROW LEVEL SECURITY;\nSELECT 1;\n";
    expect(checksum(lf)).toBe(checksum(lf.replace(/\n/g, "\r\n")));
  });
});

describe("the fresh-vs-provisioned decision the runner actually makes", () => {
  const noFlags = { reconcile: false } as const;

  it("a FRESH database provisions with no flag and no prompt", () => {
    const state = reconcileFromEvidence(OFF_JOURNAL, evidenceFor());
    expect(needsReconciliation(0, state, noFlags)).toBe(false);
  });

  it("an empty ledger on a database that HAS off-journal work stops and asks", () => {
    const state = reconcileFromEvidence(OFF_JOURNAL, evidenceFor("0002_enable_rls.sql"));
    expect(needsReconciliation(0, state, noFlags)).toBe(true);
  });

  it("a populated ledger never asks again", () => {
    const state = reconcileFromEvidence(OFF_JOURNAL, evidenceFor(...OFF_JOURNAL));
    expect(needsReconciliation(OFF_JOURNAL.length, state, noFlags)).toBe(false);
  });

  it("--reconcile and --baseline answer the question themselves", () => {
    const state = reconcileFromEvidence(OFF_JOURNAL, evidenceFor("0002_enable_rls.sql"));
    expect(needsReconciliation(0, state, { reconcile: true })).toBe(false);
    expect(
      needsReconciliation(0, state, { reconcile: false, baselineThrough: "all" }),
    ).toBe(false);
  });
});

describe("checksum drift stops the run", () => {
  it("is fatal by default — a warning left db:migrate:all green in CI", () => {
    expect(driftIsFatal({ drifted: ["0002_enable_rls.sql"] }, { allowDrift: false })).toBe(
      true,
    );
  });

  it("is not fatal with the deliberate override", () => {
    expect(driftIsFatal({ drifted: ["0002_enable_rls.sql"] }, { allowDrift: true })).toBe(
      false,
    );
  });

  it("is not raised when nothing drifted", () => {
    expect(driftIsFatal({ drifted: [] }, { allowDrift: false })).toBe(false);
  });
});

describe("parseFlags", () => {
  it("reads the bare flag as 'everything'", () => {
    expect(parseFlags(["--baseline"]).baselineThrough).toBe("all");
    expect(parseBaselineArg(["--baseline"])).toBe("all");
  });
  it("reads an explicit filename", () => {
    expect(parseFlags(["--baseline=0007_resources.sql"]).baselineThrough).toBe(
      "0007_resources.sql",
    );
  });
  it("is absent when the flag is not passed", () => {
    expect(parseFlags(["--other"]).baselineThrough).toBeUndefined();
  });
  it("rejects an EMPTY --baseline= rather than reading it as 'everything'", () => {
    // `--baseline=$LAST_APPLIED` with an unset variable used to baseline the
    // whole list, skipping every migration, from a typo.
    expect(() => parseFlags(["--baseline="])).toThrow(/empty value/);
  });
  it("rejects --reconcile combined with --baseline", () => {
    expect(() => parseFlags(["--reconcile", "--baseline"])).toThrow(/cannot be combined/);
  });
  it("rejects --force-baseline on its own", () => {
    expect(() => parseFlags(["--force-baseline"])).toThrow(/only means something/);
  });
  it("reads --reconcile and --allow-drift", () => {
    const flags = parseFlags(["--reconcile", "--allow-drift"]);
    expect(flags.reconcile).toBe(true);
    expect(flags.allowDrift).toBe(true);
  });
});

describe("the .sql files themselves", () => {
  it("every listed file exists on disk", () => {
    for (const file of OFF_JOURNAL) {
      expect(() => read(file)).not.toThrow();
    }
  });

  /**
   * Every off-journal file must be detectable in a live schema, or the runner
   * cannot tell a fresh database from a provisioned one — the exact confusion
   * that made `--baseline` the first thing a fresh provision was told to do.
   */
  it("every off-journal file has an evidence probe", () => {
    for (const file of OFF_JOURNAL) {
      expect(OFF_JOURNAL_EVIDENCE[file], `${file} needs an OFF_JOURNAL_EVIDENCE entry`)
        .toBeTruthy();
    }
    expect(() => evidenceQuery(OFF_JOURNAL)).not.toThrow();
    expect(() => evidenceQuery(["0099_no_probe.sql"])).toThrow(/OFF_JOURNAL_EVIDENCE/);
  });

  it("builds one aliased SELECT, one column per migration", () => {
    const query = evidenceQuery(OFF_JOURNAL);
    expect(query.startsWith("SELECT ")).toBe(true);
    OFF_JOURNAL.forEach((_, i) => expect(query).toContain(`AS f${i}`));
  });

  /**
   * The probe must not be something drizzle-kit itself creates. `organizations`
   * is created by 0000, one command earlier in db:migrate:all — using it made
   * every fresh provision look already-provisioned.
   */
  it("no evidence probe keys off a table the journaled migrations create", () => {
    const journaled = read("0001_equal_legion.sql") + read("0000_breezy_forgotten_one.sql");
    const created = new Set(
      [...journaled.matchAll(/CREATE TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+"?(\w+)"?/gi)].map((m) =>
        m[1].toLowerCase(),
      ),
    );
    expect(created).toContain("organizations");

    for (const [file, expr] of Object.entries(OFF_JOURNAL_EVIDENCE)) {
      for (const m of expr.matchAll(/to_regclass\('public\.(\w+)'\)\s*IS NOT NULL/gi)) {
        expect(
          created.has(m[1].toLowerCase()),
          `${file} proves itself with the mere existence of ${m[1]}, which the ` +
            `journaled migrations create — that is the bug this rule exists for`,
        ).toBe(false);
      }
    }
  });

  /**
   * The root cause, stated as an invariant rather than a story: no off-journal
   * file may run an UNGUARDED `ALTER TABLE public.x` for a table that any
   * off-journal file drops. 0002 broke this for committee_members/committees.
   * Guarded statements (inside a DO block testing to_regclass) are fine.
   */
  it("never ALTERs a table that another off-journal migration drops, unguarded", () => {
    const dropped = new Set<string>();
    for (const file of OFF_JOURNAL) {
      for (const m of read(file).matchAll(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?"?(\w+)"?/gi)) {
        dropped.add(m[1].toLowerCase());
      }
    }
    expect(dropped).toContain("committees");

    const offences: string[] = [];
    for (const file of OFF_JOURNAL) {
      // Strip DO $$ … END $$; blocks: statements in there are conditional.
      const unguarded = read(file).replace(/DO\s+\$\$[\s\S]*?END\s*\$\$\s*;/gi, "");
      for (const m of unguarded.matchAll(/ALTER\s+TABLE\s+(?:public\.)?"?(\w+)"?/gi)) {
        if (dropped.has(m[1].toLowerCase())) offences.push(`${file}: ${m[1]}`);
      }
    }
    expect(offences).toEqual([]);
  });

  it("guards the dropped committee tables with to_regclass in 0002", () => {
    const sql = read("0002_enable_rls.sql");
    expect(sql).toMatch(/to_regclass\('public\.committee_members'\)/);
    expect(sql).toMatch(/to_regclass\('public\.committees'\)/);
  });
});
