# Database migrations — READ THIS before provisioning an environment

This project has **two kinds of migrations**, and `pnpm db:migrate` only runs one of them.

## 1. Journaled migrations (drizzle-kit)

`0000_*` and `0001_*` are tracked in `meta/_journal.json`. `pnpm db:migrate`
(`drizzle-kit migrate`) applies these and records them in `__drizzle_migrations`.

## 2. Off-journal migrations (hand-applied) — ⚠ `db:migrate` SKIPS these

`0002`, `0003`, `0004` are real `.sql` files here but are **deliberately not**
journal entries, because they do things drizzle-kit can't express:

| File | What | Why off-journal |
|---|---|---|
| `0002_enable_rls.sql` | `ENABLE ROW LEVEL SECURITY` on all tables | drizzle doesn't manage RLS |
| `0003_campaign_sent_with_errors.sql` | `ALTER TYPE … ADD VALUE 'sent_with_errors'` | enum value adds aren't generated |
| `0004_renewal_notice_tracking.sql` | `invoices.renewal_notice_sent_days` column | kept with the off-journal set |
| `0005_hot_deals.sql` | `hot_deals` table (member deals/coupons) | kept with the off-journal set |
| `0006_sponsorship_inquiries.sql` | `sponsorship_inquiries` table (sponsorship intake) | kept with the off-journal set |

`drizzle-kit migrate` does **not** run these. A fresh environment set up with
`db:migrate` alone is missing them — and app code that writes
`campaign_status = 'sent_with_errors'` (the campaign reset route) will crash with
`invalid input value for enum`.

Every off-journal file is **idempotent** (`IF NOT EXISTS` / re-`ENABLE RLS` is a
no-op), so applying them repeatedly is safe.

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

**When you add a new off-journal migration:** add the filename to the
`OFF_JOURNAL` array in `scripts/apply-off-journal-migrations.ts` and to the table
above.
