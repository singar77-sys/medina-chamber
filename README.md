# Greater Medina Chamber of Commerce — medinachamber.com

Public marketing and SEO site for the Greater Medina Chamber of Commerce
(Medina, Ohio), plus a dormant custom membership backend that will replace
GrowthZone at a future ops cutover. Built and maintained by Hunter Systems.

**Stack:** Next.js (App Router) · React · TypeScript · Tailwind v4 · Drizzle +
Supabase Postgres · Upstash Redis/Vector · Stripe (dormant) · Resend · Sentry ·
Vercel.

## Development

```bash
pnpm install
pnpm dev          # dev server (launch config pins port 3009)
pnpm build        # production build — also TYPE-CHECKS scripts/ (a broken
                  # one-off script fails the deploy; delete dead scripts)
pnpm test         # vitest suite
pnpm lint         # eslint (core-web-vitals + typescript + full jsx-a11y)
```

Copy `.env.example` to `.env.local` for local secrets. `.env*` is gitignored.

## How data flows

The site is static-first with scraped data committed to `src/data/`:

- **GitHub Actions do the scraping** (`.github/workflows/`):
  `scrape-daily.yml` (events/news/jobs, 05:00 UTC) and `scrape-weekly.yml`
  (members → websites → Upstash vectors → ratings → blog, Sun 11:00 UTC).
  Both smoke-check counts before pushing and email on failure.
- **Photos sync on their own workflow**: `sync-sharepoint-photos.yml` ("Sync
  SharePoint Photos") pulls the chamber's SharePoint photo folders into
  `public/images/photos/`, then commits and pushes whatever changed. The folder
  list lives in `scripts/sharepoint-sync.config.json` (edit that, not the YAML).
  It is **manual-only** (`workflow_dispatch`): the nightly cron stays commented
  out until the `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET`
  repo secrets exist, because every scheduled run without them failed on the
  first step. The file's header documents the one-time Entra app registration.
- **The weekly member scrape OVERWRITES `src/data/members.json`.** Durable
  hand-edits belong in `src/data/member-overrides.json` (re-applied on every
  scrape). Community Investor / Visibility Plus truth lives in
  `src/data/tier-overrides.ts` (refresh via `scripts/sync-tier-overrides.mjs`).
- **A Vercel cron** (`/api/cron/gz-sync`, 06:00 UTC, `vercel.json`) upserts the
  scraped members into Supabase.
- **Redis-backed CMS overrides** (`src/lib/cms-store.ts`, admin UI at `/admin`)
  layer on top of static data; reads degrade to the static fallbacks if Redis
  is down.

Adding a Community Investor touches FOUR systems: members.json (via overrides),
`COMMUNITY_INVESTOR_SLUGS`, gz-sync (DB), and the Upstash vector sync. Miss the
vector sync and the member is unsearchable.

## Where things live

| Path | What |
|---|---|
| `src/app` | Routes: public pages, `/admin` (Redis CMS), `/portal` (dormant), `/api` |
| `src/components` | Shared components; design system rules in `docs/design-continuity.md` |
| `src/data` | Scraped JSON + curated overrides (see above) |
| `src/lib` | Auth, db schema, gz-sync, cms/media stores, sanitize, rate limits |
| `scripts/` | Scrapers + operational tooling (`.ts` files are build-type-checked) |
| `docs/` | Design continuity (READ FIRST for visual work), security runbooks, GZ cutover plan |

## Deploying

Pushing `main` deploys to Vercel. Commit author email must be
`singar77@gmail.com` or the deploy lands BLOCKED with empty build logs.
GrowthZone remains the live system of record for member transactions until the
cutover in `docs/superpowers/plans/2026-06-17-growthzone-migration.md`; keep
`RENEWALS_ENABLED` / `INTERNAL_TRANSACTIONS_ENABLED` unset in production.
