# GrowthZone → Custom Platform Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This is a PROGRAM plan (multi-subsystem).** Phase 0 is fully bite-sized to TDD steps and is ready to execute now. Phases 1–9 are concrete, file-level task specs that each become their own bite-sized plan (re-run `superpowers:writing-plans` per phase at phase start). This decomposition is deliberate — see "Why this structure" — not a placeholder.

**Goal:** Replace GrowthZone as the Greater Medina Chamber's system of record — moving member identity, dues/payments, events, and communications onto the custom Next.js platform — so GrowthZone can be cancelled with zero loss of member experience or revenue.

**Architecture:** Today the custom site is a *mirror* of GrowthZone: a nightly scrape pulls GZ data into JSON + Postgres, and public pages render the JSON while GZ stays authoritative (members still log in at `growthzoneapp.com`). The migration *flips the source of truth* to Supabase Postgres (24-table Drizzle schema already built and migration-aware), wires Stripe for the money GZ currently collects, and turns the existing portal shell into real member self-service. We cut over function-by-function, verifying each against GZ before decommissioning it (parallel-run, no big-bang).

**Tech Stack:** Next.js 16.2 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase Postgres + Drizzle ORM 0.45 · Stripe (to add) · Resend (email) · Upstash (search/rate-limit) · Vercel Blob · Sentry · pnpm · drizzle-kit. Vitest + Playwright to be added (Phase 0).

---

## ⚠️ Read before writing any code

- **`AGENTS.md` warning is real:** this is Next.js 16.2 with breaking changes vs training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing route handlers, server actions, or caching code. Don't assume Next 13/14 conventions.
- **Money is integer cents, never floats.** The schema enforces this; keep it.
- **The `payments` table is an immutable ledger.** Never UPDATE a payment row. Refunds/credits/writeoffs are new negative-amount rows. `invoices.amount_paid_cents` is derived from `SUM(payments.amount_cents)`.
- **Stripe correlation IDs are `unique`** (`stripeChargeId`, `stripeRefundId`, `stripeSubscriptionId`, `stripeInvoiceId`). This is the idempotency mechanism for webhooks — lean on it, don't reinvent it.
- **Migration mapping columns exist:** `memberships.gzId`, `events.gzId` (both unique). Import keyed on these so re-running the importer is idempotent.

---

## Verified Current State (as of 2026-06-17)

Established by reading the live codebase, not memory. The April-2026 project note ("no database, links out to GZ") is **stale** — a full backend has been built since.

### Built & working
| Capability | State | Evidence |
|---|---|---|
| Member directory (public, search/filter, profile pages) | ✅ reads `src/data/members.json` | `src/app/membership/directory/**` |
| Events listing + detail | ✅ reads `src/data/events.json` | `src/app/events/**` |
| Job board | ✅ reads `src/data/jobs.json` | `src/app/jobs/**` |
| ChamberBot (Claude) | ✅ functional | `src/app/api/chat/route.ts`, `src/lib/chamberbot-prompts.ts` |
| Member portal **shell** | 🟡 login + read-only dashboard | `src/app/portal/**`, `src/lib/portal-session.ts` |
| Member auth (magic link) | ✅ HMAC + Resend | `src/app/api/portal/auth/**` |
| Admin CRM | 🟡 events/blog/content/media/notes/tasks/tags editable; members/billing read-only | `src/app/admin/**`, `src/lib/admin-session.ts` |
| Join form | 🟡 inquiry only — emails staff, no account/payment | `src/app/membership/join/ApplicationForm.tsx`, `/api/apply` |
| Transactional email | ✅ Resend | `src/lib/email.ts` |
| Renewal notices | 🟡 sends reminders, cannot collect | `src/lib/renewal-engine.ts`, `/api/cron/renewal` |
| Database | ✅ Supabase Postgres, 24 tables, migration-aware | `src/lib/db/schema/*.ts` (9 modules) |

### The seam (what still ties us to GrowthZone)
1. **System of record = GrowthZone.** GitHub Action scrapes GZ nightly → JSON; `/api/cron/gz-sync` loads orgs/categories into Postgres. **Contacts are explicitly NOT synced** (needs GZ authenticated API). Public pages read the JSON, not the DB.
2. **Member login still goes to GZ:** `src/lib/navigation.ts` → `memberLogin` = `https://greatermedinachamberofcommerce.growthzoneapp.com/a/MIC/Login`.
3. **No payments at all:** `stripe` is not in `package.json`. `invoices`/`payments`/`memberships`/`event_tickets` columns wait empty.
4. **Join/apply** still routes to staff (or GZ `applicationtojoin2`), not a real signup+payment.
5. **`business.medinachamber.com`** subdomain is GZ-hosted (directory/events/news/join live there externally).

### Decisions locked with the client (2026-06-17)
- **Payments:** Full Stripe at launch — dues, renewals, event tickets, paid join flow.
- **Data export:** Authoritative data comes from **GrowthZone admin CSV/Excel export** (members, contacts, tiers, renewal dates, balances, registrations, payment history).
- **Timeline:** ASAP, no hard deadline; decommission GZ piece-by-piece as each is proven.
- **v1 must-haves (all four):** login + profile self-edit · pay dues/renewals · event registration · newsletters/campaigns.

### 🔒 Security issue to remediate (Phase 0, blocking)
`medina-chamber-site/.env.local` contains **live production secrets in plaintext** (Supabase DB password, Resend API key, admin token, Vercel Blob token, portal HMAC secret, Sentry DSN, a Vercel OIDC token). Before this system holds money and PII, these must be **rotated** and confirmed **git-ignored**. Treat all current values as compromised.

---

## Why this structure (scope check)

The spec spans ≥8 independent subsystems (payments, data migration, member self-service, events, join flow, email, renewals, cutover). The writing-plans skill requires multi-subsystem specs to be split into per-subsystem plans that each ship working, testable software. So:

- **Phase 0** (foundations/safety) is bite-sized here and runs first.
- **Phases 1–9** are sequenced, dependency-ordered subsystem specs with concrete files, schema columns, endpoints, tests, and success criteria. **At the start of each phase, run `superpowers:writing-plans` to expand that phase into its own bite-sized TDD plan** (file: `docs/superpowers/plans/2026-06-XX-phaseN-<name>.md`). Phase specs here are detailed enough to do that without re-discovery.

### Dependency order
```
Phase 0  Foundations & safety        ─┐ (blocks everything)
Phase 1  Source-of-truth flip + import ─┤ needs 0
Phase 2  Stripe billing core         ─┤ needs 0; tiers from 1
Phase 3  Member self-service portal  ─┤ needs 1,2
Phase 4  Event registration+tickets  ─┤ needs 2
Phase 5  Join + pay flow             ─┤ needs 2,3
Phase 6  Email campaigns             ─┤ needs 1
Phase 7  Renewal/dues automation     ─┤ needs 2
Phase 8  Remaining modules           ─┤ needs 1 (post-cutover OK)
Phase 9  Cutover & decommission GZ   ─┘ needs 1–7 proven
```
Phases 2 and 6 can run in parallel with later parts of 1. Phase 8 is explicitly post-cutover-safe.

---

# Phase 0 — Foundations & Safety (bite-sized, do now)

**Goal:** A test harness exists, secrets are rotated, and there is a staging environment + DB so nothing in Phases 1–9 is tested against production member data or live money.

**Files:**
- Create: `vitest.config.ts`, `src/test/smoke.test.ts`, `.github/workflows/ci.yml`
- Modify: `package.json` (scripts + devDeps), `.gitignore`
- Ops (no file): Supabase staging branch, Vercel env vars

### Task 0.1: Add the test runner

- [ ] **Step 1: Install Vitest**

```bash
cd medina-chamber-site
pnpm add -D vitest @vitest/coverage-v8 dotenv
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: [],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
```

- [ ] **Step 3: Write a smoke test that asserts something real** — `src/test/smoke.test.ts`

```ts
import { describe, expect, it } from "vitest";
import * as schema from "@/lib/db/schema";

describe("db schema barrel", () => {
  it("exports the billing tables the migration depends on", () => {
    expect(schema.memberships).toBeDefined();
    expect(schema.invoices).toBeDefined();
    expect(schema.payments).toBeDefined();
    expect(schema.eventTickets).toBeDefined();
  });
});
```

- [ ] **Step 4: Add the `test` script** to `package.json` scripts

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Run and verify pass**

Run: `pnpm test`
Expected: PASS (1 file, 1 test). If `@/lib/db/schema` barrel doesn't re-export these names, fix the barrel — that's a real defect this test just caught.

- [ ] **Step 6: Commit**

```bash
git add package.json vitest.config.ts src/test/smoke.test.ts pnpm-lock.yaml
git commit -m "test: add vitest harness + schema smoke test"
```

### Task 0.2: Rotate exposed secrets & lock down env (blocking, ops)

- [ ] **Step 1: Confirm `.env.local` is git-ignored**

Run: `cd medina-chamber-site && git check-ignore .env.local`
Expected: prints `.env.local`. If it prints nothing, add `.env.local` to `.gitignore` and commit immediately.

- [ ] **Step 2: Confirm secrets were never committed**

Run (substitute the actual leaked value locally; never commit the real string): `git log --all --oneline -S "<LEAKED_DB_PASSWORD>" -- . ; git log --all --oneline -- "**/.env.local"`
Expected: no output. If anything prints, the secret is in history — rotate (next steps) AND plan history scrub (BFG/`git filter-repo`) before any public push.

- [ ] **Step 3: Rotate each credential at its source** (Supabase DB password, Resend API key, `CHAT_ADMIN_TOKEN`, `BLOB_READ_WRITE_TOKEN`, regenerate `PORTAL_AUTH_SECRET`, rotate Sentry DSN if feasible). Generate strong values, e.g. `openssl rand -hex 32` for `PORTAL_AUTH_SECRET` and `CRON_SECRET`.

- [ ] **Step 4: Store rotated secrets in Vercel project env** (Production + Preview), not in the repo. Verify locally with a fresh `.env.local` containing only the rotated values.

- [ ] **Step 5: Verify app still boots**

Run: `pnpm dev` → load `/` and `/api/health`
Expected: 200s, no auth/db errors. Commit nothing secret.

### Task 0.3: Stand up staging DB + environment

- [ ] **Step 1: Create a Supabase **staging branch** (or a second free project).** Capture its pooled + unpooled connection strings as `DATABASE_URL` / `DATABASE_URL_UNPOOLED` in a **Preview** Vercel env and a local `.env.staging`.

- [ ] **Step 2: Push the current schema to staging**

Run: `cd medina-chamber-site && DATABASE_URL="$STAGING_UNPOOLED" pnpm db:push`
Expected: drizzle-kit reports all 24 tables created, no diffs.

- [ ] **Step 3: Add a `db:status` sanity check** (script already exists at `scripts/db-status.ts`)

Run: `DATABASE_URL="$STAGING_UNPOOLED" pnpm tsx scripts/db-status.ts`
Expected: lists tables + row counts (all near zero on fresh staging).

- [ ] **Step 4: Commit** any `.env.example`/docs updates (never the staging secrets).

```bash
git add .env.example docs/superpowers/plans/2026-06-17-growthzone-migration.md
git commit -m "chore: document staging env + migration plan"
```

### Task 0.4: CI gate

- [ ] **Step 1: Create `.github/workflows/ci.yml`** running `pnpm install`, `pnpm lint`, `pnpm test`, `pnpm build` on PRs.

- [ ] **Step 2: Verify** by opening a draft PR (or `act`) — gate must pass on the current tree before Phase 1.

**Phase 0 success criteria:** `pnpm test` green; CI runs lint+test+build; all production secrets rotated and git-ignored; a staging DB exists with the full schema and is the only DB used for Phase 1–8 development.

---

# Phase 1 — Flip the Source of Truth (import from GrowthZone) ⭐ critical path

**Goal:** Supabase Postgres becomes authoritative for members, contacts, memberships, billing history, and events. Public pages read the DB. The GZ scrape is demoted from "authority" to "decommissioned."

**Removes GZ dependency:** member/contact/billing data ownership; nightly scrape.

**Gating input:** the GrowthZone admin CSV/Excel export. **First task of the per-phase plan is to obtain the real export and confirm column names** — the importer's CSV→DB field map is finalized against the actual file, not guessed. The *target* (DB) side is fully known from the schema and is specified below.

**Files:**
- Create: `src/lib/migrate/gz-import.ts` (pure mappers), `src/lib/migrate/run-import.ts` (orchestrator CLI), `src/lib/migrate/*.test.ts`, `scripts/import-gz-export.ts` (entry)
- Create: `src/lib/db/queries/directory.ts`, `src/lib/db/queries/events.ts` (DB-backed reads)
- Modify: `src/app/membership/directory/**`, `src/app/events/**`, `src/app/jobs/**` (read DB behind a flag)
- Modify/retire: `src/app/api/cron/gz-sync/route.ts`, `vercel.json` (remove gz-sync cron), `package.json` (deprecate `scrape*`)

**Task specs (each → bite-sized steps at phase start):**

- **1.1 Pure CSV→DB mappers (TDD).** Functions `mapOrganization(row)`, `mapContact(row)`, `mapMembership(row)`, `mapInvoice(row)`, `mapPayment(row)` returning typed insert objects for `organizations`, `contacts`, `memberships`, `invoices`, `payments`. Tests use 2–3 real sample rows from the export. Money parsed to integer cents. Dates → ISO. Keyed on `gzId`.
- **1.2 Idempotent upsert orchestrator.** `run-import.ts` upserts in FK order: categories → organizations → organization_categories → contacts → membership_tiers → memberships → invoices → payments. Re-running produces zero net changes (assert via row-count + checksum test against staging).
- **1.3 Tier reconciliation.** Load tiers from the **official brand strategy** ($345 / $575 / $1145 — confirm canonical names; schema scaffolds "Silver/Gold/Visibility Plus") via `scripts/seed-membership-tiers.ts`; cross-check with `scripts/check-pricing.ts`. Fix the wrong site pricing on `/membership/pricing`. Each tier gets correct `annualPriceCents`.
- **1.4 Billing history → immutable ledger.** Import historical payments as `payments` rows (type `charge`, method per export; `card`/`check`/`cash`). Recompute `invoices.amount_paid_cents = SUM(payments)`. Assert each member's computed balance matches the GZ export balance (reconciliation test — this is the "billing you can trust" guarantee).
- **1.5 Event + registration history (optional for cutover).** Import past/upcoming events to `events` (set `gzId`, `externalRegistrationUrl` for not-yet-migrated registration), registrations to `event_registrations`.
- **1.6 DB-backed directory.** New `directory.ts` query reads `organizations`+`contacts`+categories. Put public directory behind `DIRECTORY_SOURCE=db|json` flag. **Parity test:** DB directory count and a sample of slugs/fields match `members.json`.
- **1.7 DB-backed events + jobs** similarly, behind flags.
- **1.8 Retire the scrape-as-authority.** Remove `gz-sync` cron from `vercel.json`; mark `scrape*` scripts deprecated (keep as one-time archival only). **Verify the site is byte-stable with the cron disabled.**

**Phase 1 success criteria:** With `gz-sync` disabled and scrapers off, directory/events/jobs render correctly from Postgres; every member's imported balance reconciles to the GZ export to the cent; re-running the importer is a no-op.

---

# Phase 2 — Stripe Billing Core ⭐ critical path

**Goal:** The platform can create customers, issue invoices, take card/ACH payments, and record them in the immutable ledger via idempotent webhooks — in Stripe **test mode** end to end.

**Removes GZ dependency:** payment processing (the core revenue function).

**Files:**
- Create: `src/lib/stripe/client.ts`, `src/lib/stripe/sync.ts` (Stripe↔DB), `src/app/api/stripe/webhook/route.ts`, `src/lib/billing/ledger.ts`, tests under `src/lib/stripe/*.test.ts`, `src/lib/billing/*.test.ts`
- Create: `scripts/stripe-seed-products.ts` (create Stripe products/prices for the 3 tiers; write `stripe_price_id_annual` back to `membership_tiers`)
- Modify: `package.json` (`pnpm add stripe`), `.env`/Vercel (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)

**Task specs:**
- **2.1** Install `stripe`; init server client (pinned API version). Test: client constructs with a fake key without throwing.
- **2.2** `stripe-seed-products.ts`: create one Product per tier + annual Price; persist `stripePriceIdAnnual` on `membership_tiers`. Idempotent (look up by metadata `tierSlug`).
- **2.3** Customer sync: `ensureStripeCustomer(orgId)` creates/links a Stripe customer; store id on org (add column if absent — flag a migration). Test with Stripe test API.
- **2.4** Ledger writer `recordPayment()` (TDD): inserts a `payments` row and recomputes `invoices.amount_paid_cents`; sets invoice `status` (`paid` when fully covered). Refund = negative row. **Idempotent on `stripeChargeId`/`stripeRefundId`** (unique constraint → catch + no-op).
- **2.5** Webhook `/api/stripe/webhook`: verify signature with `STRIPE_WEBHOOK_SECRET`; handle `payment_intent.succeeded`, `charge.refunded`, `invoice.paid`, `invoice.payment_failed` → call ledger. Test signature failure → 400; replayed event → single ledger row.
- **2.6** Fix the stale `payments.recordedByStaffId` "Clerk" comment → reflect the actual HMAC admin identity (or store the admin session subject). Cosmetic but prevents future confusion.

**Phase 2 success criteria:** In test mode, seeding products populates tier price IDs; a test PaymentIntent → webhook → exactly one `payments` row → invoice flips to `paid`; replaying the webhook adds nothing.

---

# Phase 3 — Member Self-Service Portal ⭐ critical path

**Goal:** Members log in on *our* site (not GZ), edit their listing/contact, see membership status + invoices, and pay dues/renewals online.

**Removes GZ dependency:** member login + profile management + dues payment.

**Files:**
- Modify: `src/lib/navigation.ts` (`memberLogin` → `/portal`)
- Create: `src/app/portal/profile/page.tsx` + edit form, `/api/portal/profile/route.ts` (PATCH org+contact, authz to own org)
- Create: `src/app/portal/billing/page.tsx` (invoices list), `/api/portal/pay/route.ts` (create Checkout/PaymentElement session for an invoice)
- Modify: `src/app/portal/dashboard/page.tsx` (real status/renewal/invoices from DB)

**Task specs:** authz guard (a member edits only their own org — TDD the guard); profile PATCH validates + writes `organizations`/`contacts`; billing page lists invoices from DB; "Pay now" → Stripe Checkout → webhook (Phase 2) marks paid → dashboard reflects it. Repoint nav and add a redirect from any lingering GZ login link.

**Success criteria:** A seeded member completes: magic-link login → edit business listing (persists) → view an open invoice → pay in test mode → dashboard shows paid + new renewal date. No GZ involved.

---

# Phase 4 — Event Registration & Ticketing

**Goal:** Members/public register and pay for events on-site; staff manage tickets and see registrations + check-in.

**Removes GZ dependency:** event registration/ticketing.

**Files:** admin ticket CRUD (`src/app/admin/(dashboard)/events/**` + `/api/admin/events/tickets`), public/member registration UI (`src/app/events/[slug]/register/**`), `/api/events/register/route.ts`, confirmation email template, check-in list view.

**Task specs:** when an event has `stripeProductId`/tickets → own registration; else keep `externalRegistrationUrl` (transition). Capacity + waitlist via `maxCapacity`/`registrationCount`/`waitlistCount`. Paid tickets → Stripe Checkout → `event_registrations.status` `confirmed` on webhook; free RSVP path; confirmation email; guest (non-member) path via `guestName/guestEmail`.

**Success criteria:** member registers + pays a test ticket → confirmed registration + email; capacity decrements; staff see the roster and can check in.

---

# Phase 5 — Join + Pay Flow

**Goal:** A prospect joins online: pick tier → create org/contact → pay first dues → become active member with a portal account.

**Removes GZ dependency:** `applicationtojoin2`.

**Files:** rebuild `src/app/membership/join/**` into a tier-select → details → Stripe Checkout flow; `/api/join/route.ts` (create org/contact/membership `pending` + invoice); on `invoice.paid` webhook → membership `active`, provision portal access, trigger welcome sequence. Keep honeypot/timing anti-spam already present.

**Success criteria:** end-to-end test-mode join produces an active member, a paid first invoice in the ledger, and a working portal login.

---

# Phase 6 — Email Campaigns / Newsletters

**Goal:** Staff compose and send segmented campaigns from the admin, replacing GZ email. (Schema `email_campaigns`/`email_sends` exists.)

**Removes GZ dependency:** member email/newsletters.

**Files:** `src/app/admin/(dashboard)/campaigns/**` (composer + audience builder), `/api/admin/campaigns/route.ts` (create/send), Resend batch send writing per-recipient `email_sends`, unsubscribe handling, open/click → `engagement_events`.

**Success criteria:** staff send a campaign to a saved segment; each recipient has an `email_sends` row; unsubscribe works; opens recorded.

---

# Phase 7 — Renewal / Dues Automation

**Goal:** Wire the existing renewal engine to Stripe — auto-generate renewal invoices ahead of `renewalDate`, dunning on failure, status transitions (`active`→`past_due`→`lapsed`), grace period.

**Removes GZ dependency:** the recurring-dues lifecycle (the last revenue piece).

**Files:** extend `src/lib/renewal-engine.ts` + `/api/cron/renewal/route.ts`: N-days-before → create invoice + pay link (or auto-charge saved card); on overdue → dunning emails + `past_due`; on grace expiry → `lapsed`. Reuse Phase 2 ledger + webhooks.

**Success criteria:** a membership near its renewal date auto-gets a payable invoice; paying it advances `renewalDate` a year; unpaid past grace flips to `lapsed`.

---

# Phase 8 — Remaining Modules (post-cutover safe)

**Goal:** Reach full "ultimate experience" parity beyond core: committees public + signup (`committees`/`committee_members` exist), savings/deals/coupons, resource library, sponsorship intake, reporting dashboards (`engagement_events`, renewal forecast, event ROI).

**Removes GZ dependency:** committees, member deals, reporting (lower-stakes; can trail cutover).

**Task specs:** one sub-plan per module; each reads/writes its existing tables and follows established admin+portal patterns. Prioritize by member demand after Phase 9.

---

# Phase 9 — Cutover & Decommission GrowthZone

**Goal:** Make the custom platform the live system of record and cancel GrowthZone.

**Pre-cutover gate (all must be true):**
- [ ] Phases 1–7 success criteria met in staging with Stripe test mode.
- [ ] Final fresh GZ export imported; **balances reconcile to the cent**; member + contact counts match.
- [ ] Stripe switched to **live mode**; a real low-value test charge + refund verified in the ledger.
- [ ] Secrets rotated (Phase 0) and only in Vercel env.
- [ ] Rollback plan written (DNS revert + GZ left read-only until N days post-cutover).

**Cutover checklist:**
- [ ] Freeze writes in GZ (staff stop editing there); take the final export.
- [ ] Re-run importer against production DB; run reconciliation report.
- [ ] Repoint `business.medinachamber.com` + apex DNS to Vercel; add 301s from old GZ URLs (`/list`, `/member-events`, `/news`, `/applicationtojoin2`, `/a/MIC/Login`) to internal routes.
- [ ] `memberLogin` already internal (Phase 3); remove the `growthZone` external-URL block from `navigation.ts`.
- [ ] Member comms: "your new member portal" announcement with magic-link instructions (send via Phase 6).
- [ ] Monitor Sentry + Stripe + portal logins for N days; keep GZ subscription read-only as fallback.
- [ ] After stable window: **cancel GrowthZone.**

**Success criteria:** revenue flows through Stripe; members self-serve on our domain; no GZ links or scrape in the codebase; GZ subscription cancelled with no member-facing regression.

---

## Risk Register / "We can't fail" guardrails

| Risk | Mitigation |
|---|---|
| Money handled wrong | Integer cents everywhere; immutable ledger; idempotent webhooks on unique Stripe IDs; reconcile every balance to the GZ export before go-live; Stripe **test mode** until Phase 9 gate. |
| Bad/incomplete GZ export | Phase 1 gates on inspecting the real export; reconciliation tests fail loudly on mismatch; contacts (not scrape-able) come only from the export. |
| Bleeding-edge Next 16.2 surprises | `AGENTS.md` rule: read bundled Next docs before route/server code; CI `next build` gate. |
| Testing against prod data/live money | Phase 0 staging DB + Stripe test mode; prod touched only at the Phase 9 gate. |
| Secret exposure | Phase 0 rotation + git-ignore + history check, before any money/PII flows. |
| Big-bang failure | Parallel-run; per-function cutover; GZ kept read-only as rollback. |
| Member confusion at login switch | Comms campaign + 301 redirects from GZ login URL to `/portal`. |

## Cross-cutting
- **Tests:** Vitest (unit: mappers, ledger, authz, webhook idempotency) + Playwright (e2e: login→pay, join→pay, event register) added in Phase 0/early Phase 3.
- **Observability:** Sentry already wired; add Stripe + webhook alerting.
- **Each phase ships independently** and is verifiable on its own — that is the unit of progress.

---

## Self-Review (run against the locked decisions)

- **Full Stripe at launch** → Phases 2, 4, 5, 7 cover dues, events, join, renewals. ✅
- **GZ admin CSV export** → Phase 1 gating input + mappers + reconciliation. ✅
- **ASAP / piece-by-piece** → dependency-ordered phases, parallel-run, per-function decommission. ✅
- **v1 = all four member capabilities** → login+profile (3), dues/renewals (2,3,7), event registration (4), newsletters (6). ✅
- **Placeholder scan:** Phase 0 fully bite-sized with real code/commands; Phases 1–9 are concrete file/endpoint/criteria specs explicitly slated for per-phase expansion (declared structure, not hidden TODOs). ✅
- **Type consistency:** schema columns referenced (`amount_paid_cents`, `gzId`, `stripeChargeId`, `stripePriceIdAnnual`, `externalRegistrationUrl`, `registrationCount`) match `src/lib/db/schema/{memberships,payments,events}.ts`. ✅
- **Known gaps surfaced:** stale "Clerk" comment (no Clerk dep) → Phase 2.6; wrong site pricing vs brand tiers → Phase 1.3; exposed secrets → Phase 0.2. ✅
