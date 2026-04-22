/**
 * Sync src/data/tier-overrides.ts from the authenticated GrowthZone
 * admin API.
 *
 * GrowthZone's public directory (what scripts/scrape-members.mjs reads)
 * doesn't reliably distinguish Community Investor ($1,145/yr) from
 * Visibility Plus ($575/yr) — the public display treats them similarly
 * and the scraper's tier=2 flag mis-maps. For the ChamberBot to prioritize
 * Community Investor members correctly, we need authoritative tier data.
 *
 * This script is MANUAL (not wired into the daily cron) because it
 * requires an authenticated session. Run it when:
 *   - A new Community Investor signs up or an existing member upgrades
 *   - A Community Investor downgrades or leaves the tier
 *   - You see tier=null members in Sentry logs (rare)
 *
 * ── RUN FROM AN AUTHENTICATED CHROME SESSION ──
 *
 * The admin API requires session cookies from the GrowthZone dashboard.
 * Quickest path: open the dashboard in Chrome, open DevTools → Console,
 * and paste:
 *
 *   (async () => {
 *     const res = await fetch('/api/memberships/all/?$skip=0&$top=1000', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({}),
 *       credentials: 'include',
 *     });
 *     const data = await res.json();
 *     const active = data.Results.filter(m => m.Status === 'Active');
 *     const ci = active.filter(m => m.Type === 'Community Investor').map(m => m.Name);
 *     const vp = active.filter(m => m.Type === 'Visibility Plus').map(m => m.Name);
 *     console.log('CI:', JSON.stringify(ci));
 *     console.log('VP:', JSON.stringify(vp));
 *   })();
 *
 * Paste the two arrays below into CI_NAMES and VP_NAMES, then run:
 *
 *   node scripts/sync-tier-overrides.mjs
 *
 * Confirm the matched counts look sensible, check git diff, commit.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const membersPath = join(__dirname, "..", "src", "data", "members.json");
const outPath = join(__dirname, "..", "src", "data", "tier-overrides.ts");

// ── PASTE FROM ADMIN CONSOLE ──────────────────────────────────────
const CI_NAMES = [
  // Replace this array with the CI list from the admin console.
];

const VP_NAMES = [
  // Replace this array with the VP list from the admin console.
];
// ──────────────────────────────────────────────────────────────────

if (CI_NAMES.length === 0) {
  console.error(
    "CI_NAMES is empty. Paste the list from the admin console (see script header).",
  );
  process.exit(1);
}

const raw = JSON.parse(readFileSync(membersPath, "utf8"));
const members = raw.members;

function norm(s) {
  return s
    .toLowerCase()
    .replace(/[.,&/\\()'"'’\-]+/g, " ")
    .replace(/\s+d\/?b\/?a\s+/g, " ")
    .replace(/\b(inc|llc|ltd|co|corp|company)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatch(name) {
  const target = norm(name);
  let best = null;
  let bestScore = 0;
  for (const m of members) {
    const candidate = norm(m.name);
    if (candidate === target) return { slug: m.chamberSlug, score: Infinity, name: m.name };
    if (candidate.includes(target) || target.includes(candidate)) {
      const score =
        Math.min(candidate.length, target.length) /
        Math.max(candidate.length, target.length);
      if (score > bestScore) {
        best = m;
        bestScore = score;
      }
    }
  }
  return best && bestScore > 0.5
    ? { slug: best.chamberSlug, score: bestScore, name: best.name }
    : null;
}

const ciMatched = [],
  ciUnmatched = [];
for (const n of CI_NAMES) {
  const m = findMatch(n);
  if (m) ciMatched.push({ gz: n, ...m });
  else ciUnmatched.push(n);
}

const vpMatched = [],
  vpUnmatched = [];
for (const n of VP_NAMES) {
  const m = findMatch(n);
  if (m) vpMatched.push({ gz: n, ...m });
  else vpUnmatched.push(n);
}

console.log(`CI matched: ${ciMatched.length}/${CI_NAMES.length}`);
console.log(`VP matched: ${vpMatched.length}/${VP_NAMES.length}`);
if (ciUnmatched.length) {
  console.log(`\nCI unmatched (these members aren't in our scraped directory yet — probably joined since last scrape):`);
  ciUnmatched.forEach((n) => console.log(`  ${n}`));
}
if (vpUnmatched.length) {
  console.log(`\nVP unmatched:`);
  vpUnmatched.forEach((n) => console.log(`  ${n}`));
}

const today = new Date().toISOString().slice(0, 10);

const ts = `/**
 * Tier overrides derived from authoritative GrowthZone admin data.
 *
 * The public GrowthZone directory (which our scraper reads) doesn't
 * distinguish Community Investor from Visibility Plus cleanly — the
 * scraper lands most CI members as tier=2 but misses the 99 real VP
 * members entirely, and sometimes tags non-premium members as tier=2.
 *
 * These sets are the source of truth, pulled from the authenticated
 * admin membership list (/api/memberships/all/). Regenerate with:
 *
 *   node scripts/sync-tier-overrides.mjs
 *
 * See that script's header for how to pull fresh lists from the admin
 * console.
 *
 * Last sync: ${today}
 * Counts: CI ${ciMatched.length}, VP ${vpMatched.length}
 */

export const COMMUNITY_INVESTOR_SLUGS: ReadonlySet<string> = new Set([
${ciMatched.map((m) => `  "${m.slug}",`).join("\n")}
]);

export const VISIBILITY_PLUS_SLUGS: ReadonlySet<string> = new Set([
${vpMatched.map((m) => `  "${m.slug}",`).join("\n")}
]);
`;

writeFileSync(outPath, ts);
console.log(`\nWrote ${outPath} (${ciMatched.length} CI + ${vpMatched.length} VP)`);
