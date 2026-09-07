# Accepted security risks

Findings that `pnpm audit` reports but that are deliberately accepted, with the
reasoning, the exact dependency path, reachability, an owner and a review date.
Review this list whenever a flagged package gains a real fix or its usage
changes.

**Reproduce the counts below with:**

```
pnpm install --frozen-lockfile
pnpm audit          # all dependencies
pnpm audit --prod   # production dependencies only
```

**Current state (2026-09-07, after the F14 dependency pass):**

| Scope | critical | high | moderate | low | total |
| --- | --- | --- | --- | --- | --- |
| `pnpm audit` (all) | 0 | 2 | 1 | 0 | 3 |
| `pnpm audit --prod` | 0 | 0 | 0 | 0 | 0 |

Previous state (2026-09-05 audit): 24 high / 15 moderate / 5 low all-deps, and
13 high / 12 moderate / 5 low production-only. Everything that closed did so by
updating the owning dependency, not by adding a `pnpm.overrides` entry. The
three entries below are the complete remaining set, and both remaining scanner
"high" rows are the single accepted `xlsx` package.

Note on reading scanner output: "production dependency" does not by itself
establish an attacker-reachable runtime path. Each entry below states its actual
reachability rather than inheriting the scanner's severity.

**Owner for every entry on this page:** Mark Hunter (singar77@gmail.com),
Hunter Systems.
**Next scheduled review of this page: 2026-12-07** (quarterly). Each entry also
carries its own expiry.

---

## `xlsx@0.18.5`, 2 HIGH (Prototype Pollution, ReDoS), ACCEPTED (dev-only)

- **Advisories:**
  - Prototype Pollution, vulnerable `<0.19.3`,
    <https://github.com/advisories/GHSA-4r6h-8v6p-xvw6>
  - ReDoS, vulnerable `<0.20.2`,
    <https://github.com/advisories/GHSA-5pgg-2g8v-p4x9>
- **Dependency path:** `.>xlsx` (direct devDependency, no transitive parent).
- **No npm fix exists.** SheetJS stopped publishing to npm at `0.18.5`; the
  patched `0.20.2+` releases are only distributed from the SheetJS CDN, not npm,
  so there is no npm version to upgrade to. `pnpm audit` reports the patched
  range as `<0.0.0`, which is its way of saying "no fix available".

### DO NOT DELETE THIS PACKAGE. It is imported.

Separate audits have now claimed more than once, most recently in the
2026-09-05 full-site audit, that `xlsx` is unreferenced and should simply be
removed. **Every one of those claims was wrong.** Removing it breaks
`npx tsc --noEmit` and therefore every CI run and every Vercel build, because
`next build` type-checks `scripts/` as well as `src/`.

The importers, verified again on 2026-09-07:

| File | Import |
| --- | --- |
| `src/lib/migrate/load.ts:21` | `import XLSX from "xlsx";` |
| `scripts/gz-colstats.mjs:4` | `import XLSX from "xlsx";` |
| `scripts/gz-join-check.mjs:3` | `import XLSX from "xlsx";` |
| `scripts/inspect-gz-export.mjs:4` | `import XLSX from "xlsx";` |

Verify with a search across both `src/` and `scripts/` (a search limited to
`src/` alone is what produced the false finding) before ever proposing removal
again.

- **Why accepted, and why not exploitable here:**
  - `xlsx` is a **devDependency**, so it is never installed in production
    (`pnpm audit --prod` reports zero findings of any severity).
  - Its importers are offline GrowthZone migration and inspection tooling. No
    file under `src/app/**` (no route, page, or API handler) imports
    `src/lib/migrate/`, so `xlsx` is never bundled into the app and never sits
    on a request path.
  - Every input it parses is a **trusted GrowthZone export file** supplied by an
    admin or developer during a manual, offline migration run. There is no
    untrusted file-upload path that reaches it. Both CVEs require
    attacker-controlled spreadsheet input, which does not occur.
- **Reachability:** not attacker-reachable. Offline, developer-invoked,
  trusted-input only.
- **Expiry / revisit if:** 2026-12-07, or sooner if either of these happens:
  xlsx parsing is added to a runtime or user-upload path (for example an admin
  bulk-import that accepts uploaded spreadsheets), or SheetJS resumes publishing
  to npm. In the former case, replace `xlsx` with a maintained parser or isolate
  parsing behind strict trusted-file validation before shipping it.

---

## `esbuild@0.18.20` via `drizzle-kit`, 1 MODERATE, ACCEPTED (dev-only, no compatible release)

- **Advisory:** esbuild's development server allows any website to send requests
  to it and read the response. Vulnerable `<=0.24.2`, patched `>=0.25.0`.
  <https://github.com/advisories/GHSA-67mh-4wv8-2f99>
- **Dependency path:**
  `.>drizzle-kit>@esbuild-kit/esm-loader>@esbuild-kit/core-utils>esbuild`
- **Why it could not be patched by updating the owner:** `drizzle-kit` is
  already on `0.31.10`, which is the latest published release, and it declares
  `"@esbuild-kit/esm-loader": "^2.5.5"`. `@esbuild-kit/esm-loader@2.6.5` is the
  final release of that package (it is deprecated and superseded by `tsx`), and
  its `@esbuild-kit/core-utils@3.3.2` pins `esbuild ~0.18.x`. There is no
  compatible parent release that carries a patched esbuild, so no owner-side
  update can close this.
- **Why a `pnpm.overrides` entry was deliberately NOT added:** forcing
  `esbuild >= 0.25` into `@esbuild-kit/core-utils` is a seven-minor jump into a
  deprecated package written against the 0.18 API, and the blast radius is the
  database migration tooling (`db:generate`, `db:push`, `db:migrate`,
  `db:migrate:all`). Breaking migration tooling to close a dev-only, unreachable
  advisory is a bad trade. Note that `drizzle-kit` also depends on
  `esbuild ^0.25.4` directly, and that copy resolves to a patched version; only
  the legacy `@esbuild-kit` loader path is affected.
- **Reachability:** not reachable. The advisory only affects esbuild's `serve`
  development server. Nothing in this repo runs `esbuild serve`, and
  `drizzle-kit` uses the loader only to transpile `drizzle.config.ts` locally.
  It is a devDependency, so it is absent from production entirely.
- **Expiry / revisit if:** 2026-12-07, or sooner if `drizzle-kit` publishes a
  release that drops `@esbuild-kit/esm-loader` in favour of `tsx`. At that point
  the fix is a plain `pnpm update drizzle-kit`, with no override needed.

---

## Not a risk, a recurring false positive: `posthog-js`

The 2026-09-05 audit (finding F14) claimed `posthog-js` is installed but has no
application source import, and suggested removing it to shed the DOMPurify and
fflate advisories. **That claim is false.** `posthog-js` is imported and used:

| File | Reference |
| --- | --- |
| `src/components/PostHogProvider.tsx:17` | `import posthog from "posthog-js";` |
| `src/components/PostHogProvider.tsx:18` | `import { PostHogProvider as PHProvider } from "posthog-js/react";` |
| `src/components/holographic/ChamberBotPortal.tsx:28` | `import { usePostHog } from "posthog-js/react";` |
| `src/components/holographic/ChamberBotPortal.tsx` | `posthog?.capture(...)` at lines 463, 594, 600 and 693 |
| `src/app/chamberbot/ChamberBotRoute.tsx:5,44,51` | mounts `<PostHogProvider>` around the portal |
| `src/app/privacy/page.tsx:83-85` | the published privacy policy discloses PostHog to visitors |

The likely source of the confusion is that an earlier fix moved
`PostHogProvider` out of the root layout and into `ChamberBotRoute.tsx`, so the
provider no longer appears in `src/app/layout.tsx`. It is mounted one level
down instead. A grep limited to the root layout finds nothing and looks like
proof of an unused dependency.

The DOMPurify and fflate advisories that motivated the removal suggestion were
closed properly instead, by updating `posthog-js` from `1.372.5` to `1.428.1`,
which ships `dompurify@3.4.15` and `fflate@0.4.9`. Removal was never necessary.

**Before proposing removal of ANY dependency in this repo,** search for static
imports, dynamic `import()`, `require()`, string references, Next.js
instrumentation hooks (`instrumentation.ts`, `instrumentation-client.ts`), the
Sentry config files, script tags, env-var-gated initialisation, and everything
under `scripts/` and `src/app/`. This repo has now produced several such false
"unreferenced dependency" findings, covering both `xlsx` and `posthog-js`.

---

## Standing version pins, do not "helpfully" bump or downgrade

- **`next` is pinned at `16.3.4` and `sharp` at `0.35.4`, deliberately.**
  Next.js 16.3.4 **requires `sharp >= 0.35.4`**; on anything older, AVIF inputs
  are decoded against an unpatched `libheif`. Downgrading `sharp` to satisfy
  some other constraint silently reintroduces that. `sharp` is additionally
  held by a `pnpm.overrides` entry (`"sharp": "^0.35.4"`) so no transitive
  dependency can pull an older copy. As of 2026-09-07 both `16.3.4` and
  `0.35.4` are the latest published releases, so a routine `pnpm update` leaves
  them alone; the pin exists to stop a future downgrade, not a future upgrade.
- **`eslint-config-next` is held at an exact `16.3.4`** to track the `next`
  version rather than float.
- **`stripe` is held at `^22.2.1`.** It carries no advisory. Bumping it to
  `22.6.1` changes the pinned Stripe `apiVersion` literal in its types
  (`2026-05-27.dahlia` becomes `2026-08-26.dahlia`), which fails
  `npx tsc --noEmit` at `src/lib/stripe/client.ts:22` and
  `scripts/stripe-seed-products.ts:23`. Changing that string is a live Stripe
  API contract change (webhook payload shapes and field availability), so it
  needs its own deliberate, tested pass. It is not something to sweep into a
  security update.

---

## What the 2026-09-07 pass changed, and why

All six changes are version-floor raises on direct dependencies in
`package.json`. No source file was touched, and no override was added.

| Package | Old | New | Advisories closed |
| --- | --- | --- | --- |
| `@sentry/nextjs` | `^10.49.0` | `^10.73.0` | `@opentelemetry/core` to `2.11.0` (GHSA-8988-4f7v-96qf, patched at `>=2.8.0`, on the Sentry runtime path), plus the build-tooling chains it owns: `fast-uri` `3.1.7`, `browserslist` `4.28.9`, `brace-expansion` `1.1.18`/`5.0.9`, `@babel/core` `7.29.7` |
| `posthog-js` | `^1.370.1` | `^1.428.1` | `dompurify` to `3.4.15` (6 advisories), `fflate` to `0.4.9`, and its own `@opentelemetry/core` path |
| `resend` | `^6.10.0` | `^6.26.0` | `uuid` (GHSA via `resend > svix > uuid`). Resolved rather than merely patched: `resend@6.26.0` replaced `svix` with `standardwebhooks`, so the whole subtree is gone. The `/api/email/resend-webhook` route reads the `svix-id`, `svix-timestamp` and `svix-signature` headers by name, which is Resend's on-the-wire header format and is unaffected by the SDK's internal dependency change. |
| `tailwindcss` | `^4` | `^4.3.3` | `postcss` to `8.5.23`, `nanoid` to `3.3.18` |
| `@tailwindcss/postcss` | `^4` | `^4.3.3` | same chain as above |
| `eslint` | `^9` | `^9.39.5` | `js-yaml` to `4.3.2` via `@eslint/eslintrc` |

The floors were raised (rather than relying on the lockfile alone) so that a
fresh resolve on another machine or in CI cannot land back on a vulnerable
version.

### Known follow-up from this pass: a new Sentry build warning

`@sentry/nextjs@10.73.0` added a deprecation warning that `10.51.0` did not
emit (the `config/deprecatedWithSentryConfig.js` module does not exist in
`10.51.0`). Every `pnpm build` now prints, twice:

```
[@sentry/nextjs] Importing `withSentryConfig` from `@sentry/nextjs` is
deprecated and will stop working in v11. Import it from
`@sentry/nextjs/config` instead.
```

It is a warning only. The build succeeds, Sentry instrumentation is still
emitted, and `withSentryConfig` keeps working for the whole v10 line. The fix is
a one-line import change in `next.config.ts`, deliberately left out of this pass
so a security update did not also carry a source edit. **Do it before moving to
`@sentry/nextjs` v11**, where the root export is removed.

---

## Existing `pnpm.overrides`, and why each one is there

| Override | Reason |
| --- | --- |
| `undici: ^6.28.1` | floors a transitively pulled `undici` past known advisories |
| `protobufjs: ^7.6.6` | floors a transitively pulled `protobufjs` past a prototype-pollution advisory |
| `sharp: ^0.35.4` | see the standing pin note above, Next 16.3.4 requires it |

No override was added by the 2026-09-07 pass. Every advisory closed that day was
closed by raising the floor on the owning direct dependency and letting pnpm
re-resolve the chain.
