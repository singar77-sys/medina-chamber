# e2e — browser regression gate

Run it: `pnpm test:e2e` (builds the app and starts it on :3210 automatically).
Last HTML report: `pnpm test:e2e:report`.

## What this is for

`pnpm test` proves the units behave. `pnpm build` proves the source compiles.
Neither proves a visitor can search the directory, open an event, or get a
reply out of ChamberBot. That was the largest quality gap in the repo, and
this suite — deliberately small — closes it.

## The rule this suite is built around

**Reliability beats coverage.** A browser suite that fails one run in ten gets
ignored within two weeks, and then a real regression rides through a red run
nobody reads. Every test here asserts something a visitor would notice
breaking, and every test is deterministic. Journeys that could not be made
deterministic were left out on purpose — see "Deliberately not tested" below.

## Determinism rules for anything added here

1. **Never assert on first paint of a client-filtered view.** `DirectoryClient`
   renders member cards only after client state settles. Wait on
   `aria-pressed="true"` or a card count, never on a bare `goto`.
2. **Never wait for a navigation in the directory.** `DirectoryClient.tsx`
   writes filter state with `window.history.replaceState`, not the router, so
   `waitForURL` / `waitForNavigation` never fire. Poll `page.url()` instead.
3. **Never hardcode an event slug or a member slug.** `src/data/events.json`
   and `src/data/members.json` are rewritten by the nightly/weekly scrapers.
   Derive both from the page at runtime.
4. **Never match the directory search placeholder.** It rotates
   (`RotatingPlaceholder`). Match `aria-label="Search chamber members"`.
5. **Prefer role/label selectors.** The app has almost no `data-*` test hooks,
   which is fine: its ARIA is good, and an ARIA selector that breaks is
   usually reporting a real accessibility regression.

## Deliberately not tested

- **Semantic member search results.** `/api/search` hits Upstash Vector. The
  ranked slug list is a model output over a roster the scraper rewrites — the
  *content* of the results is not a fixed target, and in the secret-free test
  environment the route degrades to the keyword fallback anyway. What IS
  tested is the part that has actually regressed before: that typing keeps
  every character (see `directory.spec.ts`) and that the query becomes a
  removable filter pill.
- **A real admin login.** No credential goes in this repo, and the suite runs
  with `CHAT_ADMIN_TOKEN` blanked. Only the render and the refusal path are
  covered — which is the security-relevant half.
- **Stripe / member portal / event registration.** The portal is dormant
  (`/portal` 404s by design) and checkout is behind a kill switch. Testing
  them would test the kill switch.
- **Theme toggle, weather ambience, command palette, marquee animation.**
  Time- and preference-dependent surfaces with no failure a visitor would
  call a bug.
- **Visual/screenshot comparison.** Font loading, the WebGL shader band and
  the CountUp stats make pixel diffing a flake generator on this site.

## Accessibility baseline

`a11y.spec.ts` gates on **serious + critical** axe violations only, at counts
recorded from the live pages (see the constant at the top of that file). It
does not pretend the site is clean — moderate/minor findings are reported to
the test log on every run so the debt stays visible without painting CI red.
Lower a baseline number when you fix something; raising one needs a reason in
the commit message.
