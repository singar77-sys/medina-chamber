# Accepted security risks

Findings that `pnpm audit` reports but that are deliberately accepted, with the
reasoning. Review this list whenever a flagged package gains a real fix or its
usage changes.

## `xlsx@0.18.5` — 2 HIGH (Prototype Pollution, ReDoS) — ACCEPTED (dev-only)

- **Advisories:** Prototype Pollution (`<0.19.3`), ReDoS (`<0.20.2`).
- **No npm fix exists.** SheetJS stopped publishing to npm at `0.18.5`; the
  patched `0.20.2+` releases are only distributed from the SheetJS CDN, not npm,
  so there is no npm version to upgrade to.
- **Why accepted, not exploitable here:**
  - `xlsx` is a **devDependency** — it is never installed in production
    (`pnpm audit --prod` reports zero high findings).
  - Its only importers are offline migration tooling: the `scripts/gz-*.mjs`
    one-off scripts and `src/lib/migrate/load.ts`. Nothing under `src/app/**`
    (no route, page, or API) imports `src/lib/migrate/`, so it is never bundled
    into the app and never on a request path.
  - Every input it parses is a **trusted GrowthZone export file** supplied by an
    admin/developer during a manual migration run — there is no untrusted
    file-upload path reaching it. Both CVEs require attacker-controlled
    spreadsheet input, which does not occur.
- **Revisit if:** xlsx parsing is ever added to a runtime/user-upload path (e.g.
  an admin bulk-import that accepts uploaded spreadsheets), or SheetJS resumes
  npm publishing. In the former case, replace `xlsx` with a maintained parser or
  isolate parsing behind strict trusted-file validation before shipping it.
