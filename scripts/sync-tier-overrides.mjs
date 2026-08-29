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
// Fetched 2026-08-29 from the GrowthZone admin API (518 active memberships).
const CI_NAMES = [
  "First Financial Bank",
  "Trillium Creek Dermatology",
  "The Foundry Social / High Voltage Karting / MAD Brewing",
  "Summa Health System",
  "SFS Group USA, Inc",
  "SeibertKeck Insurance Partners",
  "Sandridge Food Corp.",
  "RICO Manufacturing",
  "Rea",
  "Medina County District Library",
  "Medina County Career Center",
  "Medina Auto Mall",
  "Life Care Center of Medina",
  "Huntington National Bank",
  "Great Lakes Construction Co.",
  "Gene's Refrigeration, Heating & AC, Inc. AND Gene Tolliver, Inc. dba All American Heating & Cooling,",
  "Fire-Dex",
  "Fechko Excavating, Inc.",
  "Discount Drug Mart",
  "Critchfield, Critchfield & Johnston, Ltd.",
  "Cleveland Clinic Medina Hospital",
  "CareCore at Willowood",
  "Bil-Jac Foods, Inc.",
  "Armstrong",
  "American Metal Chemical Corp.",
  "A. I. Root Company (d/b/a Root Candles)",
  "Westfield Insurance",
  "The Commercial & Savings Bank",
  "Clip It Good Grooming LLC",
  "Catholic Charities Diocese of Cleveland",
  "BLEACHTECH LLC",
  "LifeStone Ministries",
  "Bucky Cares ",
  "Medwick Construction",
  "Marketing Directions",
];

const VP_NAMES = [
  "Western Reserve Masonic Community",
  "Waite Funeral Homes",
  "VCS Salon & Spa",
  "Transfer Title Agency, Inc",
  "Tramonte Distributing Company",
  "Tire Source Medina",
  "The Medina County Women's Journal",
  "The Medina County Gazette",
  "Terri Lika with the KAZ Company",
  "Tempur Sealy",
  "Strickland, Nuske, Friend & Berry, Inc.",
  "Standard Welding & Steel Products, Inc.",
  "St. Francis Xavier Catholic Parish",
  "Servpro of Medina County",
  "Santosuosso's Pizza-Pasta-Vino",
  "Rose Company",
  "Rolling & Hocevar, Inc.",
  "Richards Industrials, Inc.",
  "Redwood Living Inc.",
  "Ravago Americas, LLC",
  "Rad Air Complete Auto & Tire Service",
  "Premium Transportation Group, Inc.",
  "PNC Bank",
  "Palitto Consulting Services, Inc.",
  "OneDigital",
  "OhioGuidestone",
  "Mellion Orthodontics - Fairlawn & Medina",
  "MelCap Partners, LLC",
  "Medina Meadows",
  "Medina Excavating, Inc.",
  "Meaden & Moore, Ltd.",
  "Master Pizza",
  "Mark's Cleaning Service, Inc.",
  "MAGNET",
  "Liberty Ford of Brunswick",
  "INSYTE Consulting Group, LLC",
  "Homestead Insurance Agency",
  "High Standard Hauling & Junk Removal L.L.C.",
  "HHL Group, Inc.",
  "Golden Alliance, Inc.",
  "Foundations Worldwide, Inc.",
  "Fiesta Jalapenos",
  "Falcon Industries",
  "Everything Outdoor Camping, Inc.",
  "DSC - Dermatology, Surgery & Cosmetics of Northeast Ohio",
  "Ataraxis",
  "Die Guys Inc.",
  "Culver's of Medina - Montville Twp",
  "Corrpro Companies, Inc.",
  "Corrigan Krause",
  "Consumers National Bank",
  "City of Medina",
  "Circon Environmental",
  "Burns Inc., J. H. dba BMS/Burns",
  "Bunker Hill Golf Course, Inc.",
  "Buehler's Fresh Foods",
  "Blue Heron Brewery & Event Center",
  "Bickle Insurance Services",
  "Avenue at Medina",
  "ANTS Trucking",
  "Ameri-Cal Corporation",
  "Alloy Fabricators, Inc.",
  "Alchem Corporation",
  "Albrecht Trucking Company",
  "3M Company",
  "Zion Industries",
  "WQMX Radio",
  "Woodbine Products Company",
  "Windfall Industries",
  "Williams on the Lake",
  "Wichert Insurance",
  "Weymouth Country Club",
  "Aladdin's Eatery",
  "iCOR Solutions",
  "Champion Creek Health & Rehabilitation",
  "Infinite Moments Travel",
  "HearingLife",
  "thomastech",
  "Shears & Beards Men’s Hair Co.",
  "Medina Lighting LLC",
  "DTC Auto Center",
  "Buffalo Wild Wings",
  "Knot Yourself Medical Massage Studio",
  "Small Wonders Childcare",
  "Sincerity Baked Goods llc",
  "Autism Society of Greater Akron",
  "SYNERGY HomeCare of Medina",
  "Medwick Pest Control",
  "Rios Guitar Co. & Music Store",
  "Medina Center for Rehabilitation & Nursing",
  "Sinceri Senior Living",
  "Reichwein Pest Specialists LLC",
  "Samartian Care Center & Villa",
  "Agrati, Inc",
  "The Villas at Hidden Lakes ",
  "First National Bank",
  "Directions Credit Union",
  "One Hour Heating & Air Conditioning",
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
