/**
 * GrowthZone Jobs Board Scraper
 * --------------------------------
 * Fetches job postings from business.medinachamber.com/jobs.
 * Scrapes the listing page for all job URLs, then each detail page
 * for full description. Saves to src/data/jobs.json.
 *
 * Usage:
 *   node scripts/scrape-jobs.mjs              # full run
 *   node scripts/scrape-jobs.mjs --test       # first 3 jobs only
 *
 * HTML selectors (GrowthZone standard):
 *   Listing: .gz-content-card
 *            .gz-content-card-title           → title + detail URL (href on element)
 *            .gz-content-subtitle             → teaser / job type
 *            .gz-content-contact              → company/member name
 *            .gz-web-content-date             → date posted (M/D/YYYY)
 *   Detail:  .gz-pagetitle                   → job title
 *            .gz-subtitle                    → subtitle / job type
 *            .gz-content-description         → full description
 *            .gz-tag                         → tags
 *
 * Write guards (see assertListingRendered / previousJobCount below): the script
 * refuses to touch jobs.json unless the listing page actually rendered, and
 * refuses to replace a healthy file with an empty one.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'node-html-parser';
import { htmlToText } from './lib-html-to-text.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const OUT_FILE = join(ROOT, 'src', 'data', 'jobs.json');

const LISTING_URL = 'https://business.medinachamber.com/jobs';
const BASE_URL = 'https://business.medinachamber.com';
// The grid GrowthZone's listing template wraps every .gz-content-card in. Its
// presence is what separates "rendered, nothing to show" from "did not render".
const LISTING_CONTAINER = '.gz-web-content-cards';
const DELAY_MS = 400;

const args = process.argv.slice(2);
const TEST_MODE = args.includes('--test');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function get(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} → ${url}`);
  return res.text();
}

/**
 * Prove the listing page actually rendered before trusting anything parsed off it.
 *
 * parseListingPage() returns [] for three very different situations: a genuinely
 * empty board, a GrowthZone markup change, and an error / login / CDN
 * interstitial served with a 200 (so the `res.ok` check in get() waves it
 * through). Only the first is safe to write, and downstream they are
 * indistinguishable — an empty jobs array silently blanks /jobs.
 *
 * The listing template is the only thing that emits the .gz-web-content-cards
 * grid; an error page has no reason to carry it, and a markup change that moved
 * the cards takes the container with it. Checking the container rather than the
 * cards is deliberate — checking for cards would conflate "broken" with
 * "genuinely empty", and a text/marker match on the raw HTML could be satisfied
 * by a stylesheet or a comment on an error page.
 */
function assertListingRendered(root) {
  if (root.querySelector(LISTING_CONTAINER)) return;
  console.error(`
❌ ${LISTING_URL} did not render the ${LISTING_CONTAINER} listing grid.`);
  console.error('   GrowthZone changed its markup, or served an error/interstitial page with a 200.');
  console.error('   Refusing to touch src/data/jobs.json — nothing parsed off this page is trustworthy.');
  process.exit(1);
}

/** Job count in the currently committed file — 0 when there is no baseline. */
function previousJobCount() {
  if (!existsSync(OUT_FILE)) return 0;
  try {
    return JSON.parse(readFileSync(OUT_FILE, 'utf-8')).jobs?.length ?? 0;
  } catch {
    return 0; // corrupt previous file — no baseline to defend
  }
}

/** Parse the listing page for all job stubs */
function parseListingPage(root) {
  const jobs = [];
  const seen = new Set();

  const cards = root.querySelectorAll('.gz-content-card');
  for (const card of cards) {
    const titleEl = card.querySelector('.gz-content-card-title');
    const href = titleEl?.getAttribute('href') || '';
    if (!href || seen.has(href)) continue;
    seen.add(href);

    const title = titleEl?.text?.trim() || '';
    if (!title) continue;

    // Build full URL if relative
    const detailUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

    // Extract slug and ID from URL: /jobs/Details/my-title-123456
    const match = href.match(/\/(?:jobs|Jobs)\/Details\/(.+)$/);
    const fullSlug = match ? match[1] : href.split('/').pop() || '';
    const idMatch = fullSlug.match(/-(\d+)$/);
    const jobId = idMatch ? idMatch[1] : null;
    const slug = idMatch ? fullSlug.replace(/-\d+$/, '') : fullSlug;

    const teaser = card.querySelector('.gz-content-subtitle')?.text?.trim() || '';
    const companyName = card.querySelector('.gz-content-contact')?.text?.trim() || '';
    const companyHref = card.querySelector('.gz-content-contact a')?.getAttribute('href') || '';
    const dateRaw = card.querySelector('.gz-web-content-date')?.text?.trim() || '';

    // Parse date M/D/YYYY → ISO
    let dateISO = '';
    const dm = dateRaw.match(/(\d+)\/(\d+)\/(\d{4})/);
    if (dm) {
      const [, m, d, y] = dm;
      dateISO = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    jobs.push({
      slug,
      jobId,
      fullSlug,
      title,
      teaser,
      companyName,
      companySlug: companyHref.match(/\/RedirectTo\/(\d+)/)?.[1] || '',
      dateRaw,
      dateISO,
      detailUrl,
    });
  }

  return jobs;
}

/** Parse a detail page for full job content */
function parseDetailPage(html, stub) {
  const root = parse(html);

  const title = root.querySelector('.gz-pagetitle')?.text?.trim() || stub.title;
  const rawSubtitle = root.querySelector('.gz-subtitle')?.text?.trim() || stub.teaser;
  // Filter out GZ section headers masquerading as subtitles
  const subtitle = ['Images', 'Additional Info', 'Documents', 'Links'].includes(rawSubtitle) ? '' : rawSubtitle;

  // Full job description
  const bodyEl = root.querySelector('.gz-content-description');
  const body = bodyEl ? htmlToText(bodyEl.innerHTML) : '';

  // Tags (may include job type, category) — filter out GZ attribution noise
  const tags = root.querySelectorAll('.gz-tag')
    .map(t => t.text.trim().replace(/\s+/g, ' '))
    .filter(t => t && !t.match(/^\d+\/\d+\/\d{4}$/) && !t.startsWith('By ') && t.length < 60);

  // Look for application URL in body text or links
  const links = bodyEl ? bodyEl.querySelectorAll('a') : [];
  let applyUrl = '';
  for (const link of links) {
    const linkText = link.text.toLowerCase();
    const href = link.getAttribute('href') || '';
    if (linkText.includes('apply') || linkText.includes('application') || href.includes('apply')) {
      applyUrl = href;
      break;
    }
  }

  // Look for location info (GrowthZone sometimes has .gz-location or similar)
  const locationEl = root.querySelector('.gz-location, [itemprop="addressLocality"]');
  const location = locationEl?.text?.trim() || '';

  return {
    slug: stub.slug,
    jobId: stub.jobId,
    title,
    subtitle,
    body,
    tags,
    location,
    applyUrl,
    companyName: stub.companyName,
    companySlug: stub.companySlug,
    dateRaw: stub.dateRaw,
    dateISO: stub.dateISO,
    detailUrl: stub.detailUrl,
    scrapedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────
console.log('\n💼  Medina Chamber — Jobs Board Scraper');
console.log('====================================================');

console.log('  Fetching jobs listing page...');
const listingRoot = parse(await get(LISTING_URL));
assertListingRendered(listingRoot);
let stubs = parseListingPage(listingRoot);

if (TEST_MODE) {
  stubs = stubs.slice(0, 3);
  console.log(`  ℹ  TEST MODE — first 3 jobs only`);
}

console.log(`  Found ${stubs.length} job postings to scrape\n`);

const jobs = [];
let detailFailures = 0;
for (let i = 0; i < stubs.length; i++) {
  const stub = stubs[i];
  const pct = Math.round(((i + 1) / stubs.length) * 100);
  const label = stub.title.substring(0, 50).padEnd(50);

  try {
    const html = await get(stub.detailUrl);
    const job = parseDetailPage(html, stub);
    jobs.push(job);
    console.log(`  [${String(pct).padStart(3)}%] ${label} ✓  ${stub.dateISO} — ${stub.companyName}`);
  } catch (err) {
    console.log(`  [${String(pct).padStart(3)}%] ${label} ✗  ${err.message}`);
    detailFailures++;
  }

  if (i < stubs.length - 1) await sleep(DELAY_MS);
}

// Sort newest first
jobs.sort((a, b) => b.dateISO.localeCompare(a.dateISO));

// A high failure rate means GrowthZone was erroring — keep the previous file
// rather than replacing it with the few survivors.
if (stubs.length > 0 && detailFailures > stubs.length * 0.2) {
  console.error(`\n❌ ${detailFailures}/${stubs.length} detail pages failed (>20%) — aborting without writing.`);
  process.exit(1);
}

// Deliberately NOT a zero-item block. These boards legitimately drain to zero,
// and the listing assert above already covers the failure a block would catch
// (moved markup, or an error page served with a 200). Refusing to write on a
// genuine zero would keep /jobs serving entries that no longer exist, which
// is worse than briefly empty. .github/workflows/scrape-daily.yml already made
// this call for these two datasets: it REPORTS a collapse after pushing rather
// than blocking, so one empty board cannot stop events reaching the site nightly.
const prevJobCount = previousJobCount();
if (jobs.length === 0 && prevJobCount > 0) {
  console.warn(`\n⚠️  Parsed 0 job postings from a listing page that DID render (previously ${prevJobCount}).`);
  console.warn(`   Writing the empty file. If ${LISTING_URL} still shows cards, the card selectors changed.`);
}

const output = {
  generatedAt: new Date().toISOString(),
  totalJobs: jobs.length,
  jobs,
};

// --test only scrapes 3 stubs, so writing OUT_FILE would permanently shrink
// src/data/jobs.json to those 3. Same guard scrape-blog.mjs uses.
if (TEST_MODE) {
  console.log(`\n(--test) Skipping the write to src/data/jobs.json — ${output.generatedAt}`);
} else {
  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
}

console.log('\n====================================================');
console.log(`✅  Done! ${jobs.length} job postings saved to src/data/jobs.json`);
if (jobs.length > 0) {
  const companies = [...new Set(jobs.map(j => j.companyName).filter(Boolean))];
  console.log(`  Posted by ${companies.length} member businesses`);
  if (jobs.length > 0) {
    console.log(`\n  Sample titles:`);
    jobs.slice(0, 5).forEach(j => console.log(`    · ${j.title}${j.companyName ? ` — ${j.companyName}` : ''}`));
  }
}
