# Database migrations — READ THIS before provisioning an environment

This project has **two kinds of migrations**, and `pnpm db:migrate` only runs one of them.

## 1. Journaled migrations (drizzle-kit)

`0000_*` and `0001_*` are tracked in `meta/_journal.json`. `pnpm db:migrate`
(`drizzle-kit migrate`) applies these and records them in `__drizzle_migrations`.

## 2. Off-journal migrations (hand-applied) — ⚠ `db:migrate` SKIPS these

`0002` through `0011` are real `.sql` files here but are **deliberately not**
journal entries, because they do things drizzle-kit can't express:

| File | What | Why off-journal |
|---|---|---|
| `0002_enable_rls.sql` | `ENABLE ROW LEVEL SECURITY` on all tables | drizzle doesn't manage RLS |
| `0003_campaign_sent_with_errors.sql` | `ALTER TYPE … ADD VALUE 'sent_with_errors'` | enum value adds aren't generated |
| `0004_renewal_notice_tracking.sql` | `invoices.renewal_notice_sent_days` column | kept with the off-journal set |
| `0005_hot_deals.sql` | `hot_deals` table (member deals/coupons) | kept with the off-journal set |
| `0006_sponsorship_inquiries.sql` | `sponsorship_inquiries` table (sponsorship intake) | kept with the off-journal set |
| `0007_resources.sql` | `resources` table (resource library) | kept with the off-journal set |
| `0008_integrity_hardening.sql` | invoice/registration/membership integrity constraints | audit follow-up, kept off-journal |
| `0009_session_epoch.sql` | `contacts.session_epoch` (session revocation) | kept with the off-journal set |
| `0010_magic_token_epoch.sql` | `contacts.magic_token_epoch` (single-use magic links) | kept with the off-journal set |
| `0011_drop_committees.sql` | drops `committee_members` + `committees` | drizzle would want a schema round-trip |

`drizzle-kit migrate` does **not** run these. A fresh environment set up with
`db:migrate` alone is missing them — and app code that writes
`campaign_status = 'sent_with_errors'` (the campaign reset route) will crash with
`invalid input value for enum`.

### The ledger (added 2026-09-07)

Off-journal files are **no longer replayed**. `scripts/apply-off-journal-migrations.ts`
records each applied file in `public.off_journal_migrations` (filename, sha256,
applied_at) and runs only what is missing.

That table exists because "every off-journal file is idempotent" stopped being
true the moment `0011_drop_committees.sql` landed: `0002_enable_rls.sql` enables
RLS on `committee_members` and `committees`, and 0011 drops both, so a second run
died on `ALTER TABLE` against a missing relation — which would have blocked every
migration added after 0011. 0002 now guards those two statements with
`to_regclass`, so it is a no-op rather than an error even if it is run by hand
out of order, but the ledger is what stops the replay in the first place.

### A brand-new database needs no flags

`pnpm db:migrate:all` provisions it end to end:

1. `drizzle-kit migrate` creates the journaled schema (0000 + 0001).
2. `apply-off-journal-migrations.ts` confirms that schema exists, then asks the
   **live schema** which off-journal files have already left their mark
   (`OFF_JOURNAL_EVIDENCE` in `scripts/lib-off-journal-migrations.ts`: the
   `sent_with_errors` enum value, `public.hot_deals`, `contacts.session_epoch`,
   the committee tables being gone, …). On a fresh database the answer is "none
   of them", so all ten run in order and are recorded. Exit 0, no prompt.

The provisioned probe used to be "does `public.organizations` exist" — a table
step 1 creates. It therefore tripped on **every** fresh provision, hard-failed
`db:migrate:all`, and the first remediation it printed was a bare `--baseline`,
which records 0002–0011 as applied *without running them*. Following that on a
fresh production database leaves it with no RLS, no `sent_with_errors` enum
value, and no hot_deals / resources / session_epoch — silently. Hence the rule:
**provisioning state is derived from evidence of the off-journal work itself,
never from anything drizzle-kit creates.**

### Reconciling an environment that predates the ledger

(Production is one — 0002–0010 were applied by hand, 0011 through the Supabase
SQL editor.) The script refuses to guess when the ledger is empty but the schema
shows off-journal work. Reconcile it once:

```bash
# THE SAFE ONE, and the only one the script suggests.
# Reads the live schema, records ONLY the files whose effects are already there,
# and RUNS the rest. Verified, not asserted. Handles a non-contiguous history
# (0005 applied by hand but 0003 never was) that a prefix baseline cannot.
pnpm tsx scripts/apply-off-journal-migrations.ts --reconcile

# Operator assertion: record through 0007, RUN 0008 onward.
# REFUSED if the live schema shows any of 0002–0007 was never applied.
pnpm tsx scripts/apply-off-journal-migrations.ts --baseline=0007_resources.sql
```

`--baseline` on its own records **every** file as applied without running it. It
is the assumption-making option, it is never suggested, and it is refused unless
the live schema agrees that every one of those files is already applied.
`--force-baseline` overrides that refusal and prints a loud warning naming the
migrations it is skipping forever. `--baseline=` with an empty value is an error
rather than a silent "baseline everything" (an unset shell variable used to skip
the entire list).

**Never edit an applied migration.** The ledger stores a checksum, and a recorded
file that changed on disk is a **hard failure** — the script exits 1 rather than
letting a green CI run hide the divergence. It still never re-runs the file. Add
a new migration expressing the change; `--allow-drift` exists only to unblock a
deliberate, understood divergence.

## Provisioning / deploying — always run BOTH

```bash
pnpm db:migrate:all
# = drizzle-kit migrate  +  tsx scripts/apply-off-journal-migrations.ts
```

`scripts/apply-off-journal-migrations.ts` applies the off-journal `.sql` files in
order against `DATABASE_URL_UNPOOLED` (or `DATABASE_URL`). To apply one by hand:

```bash
psql "$DATABASE_URL_UNPOOLED" -f src/lib/db/migrations/0004_renewal_notice_tracking.sql
```

**When you add a new off-journal migration:**

1. add the filename to the `OFF_JOURNAL` array in
   `scripts/lib-off-journal-migrations.ts`,
2. add an `OFF_JOURNAL_EVIDENCE` entry for it — a SQL boolean that is TRUE once
   the file has run (AND the checks together where the file does several things,
   so a half-applied file re-runs),
3. add it to the table above,
4. keep it idempotent (`IF NOT EXISTS`, `to_regclass` guards).

`scripts/off-journal-migrations.test.ts` fails if the file is missing from disk,
if it has no evidence probe, if a probe keys off a table the journaled
migrations create, or if it `ALTER`s a table that another off-journal migration
drops without a `to_regclass` guard.
