/**
 * Google Places Ratings Scraper — Phase 2
 * ----------------------------------------
 * Looks up each member on Google Places and captures:
 *   - Star rating (1.0–5.0)
 *   - Review count
 *   - Business hours
 *   - Business status (open / temporarily closed / permanently closed)
 *   - Google Place ID (for future use)
 *
 * Requires:
 *   GOOGLE_PLACES_API_KEY in .env.local
 *
 * Usage:
 *   node scripts/scrape-ratings.mjs              # full run
 *   node scripts/scrape-ratings.mjs --limit=10   # test first N
 *   node scripts/scrape-ratings.mjs --slug=armstrong  # single member
 *
 * Output: src/data/member-ratings.json
 *
 * Notes:
 *   - Google Places Text Search: ~$0.017/request → 466 members ≈ $8 total
 *   - First $200/month of GCP usage is free, so this costs nothing
 *   - Results are cached — re-running skips already-fetched members
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const OUT_DIR = join(ROOT, 'src', 'data');
const OUT_FILE = join(OUT_DIR, 'member-ratings.json');
const MEMBERS_FILE = join(OUT_DIR, 'members.json');

const DELAY_MS = 250; // Places API can handle faster requests
const args = process.argv.slice(2);
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0');
const SLUG_ONLY = args.find(a => a.startsWith('--slug='))?.split('=')[1];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Load API key ──────────────────────────────────────────────────
function getApiKey() {
  // Try env first
  if (process.env.GOOGLE_PLACES_API_KEY) return process.env.GOOGLE_PLACES_API_KEY;
  // Try .env.local
  try {
    const envFile = readFileSync(join(ROOT, '.env.local'), 'utf-8');
    const match = envFile.match(/GOOGLE_PLACES_API_KEY\s*=\s*(.+)/);
    if (match) return match[1].trim();
  } catch {}
  return null;
}

// ── Places API: Text Search ───────────────────────────────────────
// Returns the best-matching place or null
async function findPlace(name, address, apiKey) {
  // Build a targeted query: name + city + state
  const city = address.split(',')[1]?.trim() || 'Medina';
  const state = address.split(',')[2]?.trim() || 'OH';
  const query = `${name} ${city} ${state}`;

  const params = new URLSearchParams({
    query,
    fields: 'name,rating,user_ratings_total,opening_hours,business_status,place_id,formatted_address',
    key: apiKey,
    region: 'us',
    language: 'en',
  });

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();

    if (data.status === 'REQUEST_DENIED') {
      console.error('\n❌ API key error:', data.error_message);
      process.exit(1);
    }

    if (!data.results?.length) return null;

    // Verify the top result looks like our member
    // (Fuzzy check: at least one word from the member name must appear in the result name)
    const resultName = data.results[0].name?.toLowerCase() || '';
    const memberWords = name.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    const isMatch = memberWords.some(w => resultName.includes(w));

    if (!isMatch) return null;

    const place = data.results[0];
    return {
      placeId: place.place_id,
      googleName: place.name,
      rating: place.rating ?? null,
      reviewCount: place.user_ratings_total ?? null,
      businessStatus: place.business_status ?? null, // OPERATIONAL, TEMPORARILY_CLOSED, PERMANENTLY_CLOSED
      hours: place.opening_hours?.weekday_text ?? null,
      googleAddress: place.formatted_address ?? null,
    };
  } catch {
    return null;
  }
}

// ── MAIN ──────────────────────────────────────────────────────────
async function main() {
  console.log('⭐  Medina Chamber — Google Ratings Scraper');
  console.log('='.repeat(52));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(`
❌  No GOOGLE_PLACES_API_KEY found.

  1. Go to console.cloud.google.com
  2. Create a project → Enable "Places API"
  3. Create an API key (restrict to Places API for security)
  4. Add to .env.local:
     GOOGLE_PLACES_API_KEY=AIza...
  5. Re-run this script
`);
    process.exit(1);
  }

  const membersData = JSON.parse(readFileSync(MEMBERS_FILE, 'utf-8'));
  let members = membersData.members;

  if (SLUG_ONLY) {
    members = members.filter(m => m.chamberSlug === SLUG_ONLY);
    if (!members.length) { console.error('❌ Slug not found:', SLUG_ONLY); process.exit(1); }
  }

  if (LIMIT) members = members.slice(0, LIMIT);

  // Load existing results for resume support
  let existing = {};
  if (existsSync(OUT_FILE)) {
    try {
      const prev = JSON.parse(readFileSync(OUT_FILE, 'utf-8'));
      prev.members.forEach(m => { existing[m.chamberSlug] = m; });
      console.log(`ℹ  Resuming — ${Object.keys(existing).length} already fetched\n`);
    } catch {}
  }

  mkdirSync(OUT_DIR, { recursive: true });

  // Age-based refresh: without this, a member's rating freezes at its first
  // fetch forever. Re-fetch the oldest entries past REFRESH_DAYS, capped per
  // run to keep Places API spend bounded (~60 × $0.017 ≈ $1/run).
  const REFRESH_DAYS = 90;
  const REFRESH_CAP = 60;
  const refreshCutoff = Date.now() - REFRESH_DAYS * 86400000;
  const refreshSlugs = new Set(
    Object.values(existing)
      .filter((m) => !m.fetchedAt || Date.parse(m.fetchedAt) < refreshCutoff)
      .sort((a, b) => (a.fetchedAt ? Date.parse(a.fetchedAt) : 0) - (b.fetchedAt ? Date.parse(b.fetchedAt) : 0))
      .slice(0, REFRESH_CAP)
      .map((m) => m.chamberSlug),
  );
  if (refreshSlugs.size) {
    console.log(`ℹ  Re-fetching ${refreshSlugs.size} rating(s) older than ${REFRESH_DAYS} days\n`);
  }

  const results = { ...existing };
  let done = 0, found = 0, notFound = 0, skip = 0;

  for (const member of members) {
    done++;
    const pct = ((done / members.length) * 100).toFixed(0);

    if (existing[member.chamberSlug] && !refreshSlugs.has(member.chamberSlug)) {
      skip++;
      continue;
    }

    process.stdout.write(`  [${pct}%] ${member.name.substring(0, 42).padEnd(42)} `);

    const place = await findPlace(member.name, member.address, apiKey);

    if (place) {
      results[member.chamberSlug] = {
        chamberSlug: member.chamberSlug,
        fetchedAt: new Date().toISOString(),
        found: true,
        ...place,
      };
      found++;
      const stars = place.rating ? `★ ${place.rating} (${place.reviewCount} reviews)` : 'no rating';
      const status = place.businessStatus !== 'OPERATIONAL' ? ` [${place.businessStatus}]` : '';
      console.log(`✓  ${stars}${status}`);
    } else {
      results[member.chamberSlug] = {
        chamberSlug: member.chamberSlug,
        fetchedAt: new Date().toISOString(),
        found: false,
      };
      notFound++;
      console.log('—  not found on Google');
    }

    // Save every 25
    if (done % 25 === 0) {
      save(results, found, notFound);
      process.stdout.write(`  💾 Saved (${done}/${members.length})\n`);
    }

    await sleep(DELAY_MS);
  }

  save(results, found + skip, notFound);

  console.log('\n' + '='.repeat(52));
  console.log(`✅  Done! ★ ${found} with ratings  — ${notFound} not found on Google`);

  // Quick stats on ratings
  const rated = Object.values(results).filter(r => r.rating);
  const above4 = rated.filter(r => r.rating >= 4.0);
  const avg = rated.length ? (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(2) : 'N/A';
  console.log(`\n  Average rating: ${avg}  |  ${above4.length}/${rated.length} at 4.0+`);
}

function save(results, found, notFound) {
  writeFileSync(OUT_FILE, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalFetched: Object.keys(results).length,
    foundCount: found,
    notFoundCount: notFound,
    members: Object.values(results),
  }, null, 2), 'utf-8');
}

main().catch(e => {
  console.error('\n❌ Fatal:', e.message);
  process.exit(1);
});
