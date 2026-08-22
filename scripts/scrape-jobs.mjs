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
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'node-html-parser';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const OUT_FILE = join(ROOT, 'src', 'data', 'jobs.json');

const LISTING_URL = 'https://business.medinachamber.com/jobs';
const BASE_URL = 'https://business.medinachamber.com';
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

function htmlToText(html = '') {
  return html
    // Drop <style>/<script> block CONTENTS before the generic tag strip — that
    // strip only removes the tags, leaking raw block CSS into the body as text.
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // strip zero-width chars
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Parse the listing page for all job stubs */
function parseListingPage(html) {
  const root = parse(html);
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
const listingHtml = await get(LISTING_URL);
let stubs = parseListingPage(listingHtml);

if (TEST_MODE) {
  stubs = stubs.slice(0, 3);
  console.log(`  ℹ  TEST MODE — first 3 jobs only`);
}

console.log(`  Found ${stubs.length} job postings to scrape\n`);

const jobs = [];
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
  }

  if (i < stubs.length - 1) await sleep(DELAY_MS);
}

// Sort newest first
jobs.sort((a, b) => b.dateISO.localeCompare(a.dateISO));

const output = {
  generatedAt: new Date().toISOString(),
  totalJobs: jobs.length,
  jobs,
};

writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

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
