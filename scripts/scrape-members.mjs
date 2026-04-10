/**
 * GrowthZone Member Scraper
 * -------------------------
 * Fetches all 525+ Medina Chamber members from GrowthZone's public endpoints.
 *
 * Usage:
 *   node scripts/scrape-members.mjs              # full run → src/data/members.json
 *   node scripts/scrape-members.mjs --no-details  # skip description fetch (faster)
 *   node scripts/scrape-members.mjs --letter=A    # single letter test
 *   node scripts/scrape-members.mjs --debug       # dump raw HTML for letter A
 *
 * HTML structure (confirmed from live GrowthZone page):
 *   .gz-directory-card               → card container
 *   .card-header img[itemprop=logo]  → logo (already on listing page!)
 *   h5.gz-card-title a               → business name + GZ slug in href
 *   .gz-card-address spans           → street, city, state, zip (itemprop)
 *   span[itemprop=telephone]         → phone
 *   .gz-card-website a               → website URL
 *   .gz-card-cat .gz-cat             → categories (multiple spans)
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'node-html-parser';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const OUT_DIR = join(ROOT, 'src', 'data');
const OUT_FILE = join(OUT_DIR, 'members.json');
const DEBUG_FILE = join(ROOT, 'scripts', '_debug-raw.html');

const BASE = 'https://business.medinachamber.com';
const LETTERS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const DELAY_MS = 350; // polite pause between requests

const args = process.argv.slice(2);
const DEBUG = args.includes('--debug');
const NO_DETAILS = args.includes('--no-details');
const LETTER_ONLY = args.find(a => a.startsWith('--letter='))?.split('=')[1]?.toUpperCase();

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function get(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ─────────────────────────────────────────
// Parse a /list/FindStartsWith?term=X page
// Uses confirmed CSS selectors from live HTML
// ─────────────────────────────────────────
function parseListingPage(html) {
  const root = parse(html);
  const members = [];

  const cards = root.querySelectorAll('.gz-directory-card');

  for (const card of cards) {
    // ── Membership tier (Rank class on the card itself) ──
    const cardClasses = (card.getAttribute('class') || '').split(/\s+/);
    const rankClass = cardClasses.find(c => c.startsWith('Rank'));
    const membershipTier = rankClass ? parseInt(rankClass.replace('Rank', ''), 10) : 20;

    // ── Name + GZ slug ──
    const titleLink = card.querySelector('h5.gz-card-title a, .gz-card-title a');
    if (!titleLink) continue;

    const name = titleLink.textContent.trim();
    const rawHref = titleLink.getAttribute('href') || '';
    // href is like: //business.medinachamber.com/list/Details/armstrong-3359771
    const slug = rawHref.replace(/^.*\/list\/Details\//, '').trim();
    if (!slug || !name) continue;

    // ── Logo (on listing page!) ──
    const logoImg = card.querySelector('.card-header img[itemprop="logo"], .card-header img');
    const logoUrl = logoImg ? (logoImg.getAttribute('src') || '') : '';

    // ── Address (schema.org itemprop) ──
    const street  = card.querySelector('span[itemprop="streetAddress"]')?.textContent.trim()  || '';
    const city    = card.querySelector('span[itemprop="addressLocality"]')?.textContent.trim() || '';
    const state   = card.querySelector('span[itemprop="addressRegion"]')?.textContent.trim()  || '';
    const zip     = card.querySelector('span[itemprop="postalCode"]')?.textContent.trim()     || '';
    const address = [street, city, state, zip].filter(Boolean).join(', ').replace(/,\s*,/g, ',').trim();

    // ── Phone ──
    const phone = card.querySelector('span[itemprop="telephone"]')?.textContent.trim() || '';

    // ── Website ──
    const webLi = card.querySelector('.gz-card-website a');
    const website = webLi ? (webLi.getAttribute('href') || '').trim() : '';

    // ── Categories ──
    const catSpans = card.querySelectorAll('.gz-card-cat .gz-cat');
    const categories = catSpans.map(s => s.textContent.trim()).filter(Boolean);

    members.push({ name, slug, logoUrl, address, phone, website, categories, membershipTier });
  }

  return members;
}

// ─────────────────────────────────────────
// Parse a /list/Details/{slug} page
// Returns { description, logoUrl, social }
// ─────────────────────────────────────────
function parseDetailPage(html) {
  const root = parse(html);

  // ── Logo (detail page has full-res version) ──
  const logoImg = root.querySelector('img.gz-detail-img');
  const logoUrl = logoImg ? (logoImg.getAttribute('src') || '') : '';

  // ── Description: inside .gz-details-about [itemprop="description"] ──
  const aboutSection = root.querySelector('[itemprop="description"]');
  let description = '';
  if (aboutSection) {
    // Get all <p> text, strip nested duplicate <p><p>...</p></p> pattern
    const paras = aboutSection.querySelectorAll('p');
    const texts = paras
      .map(p => p.textContent.replace(/\s+/g, ' ').trim())
      .filter(t => t.length > 0);
    // Deduplicate (GZ wraps in double <p> sometimes)
    description = [...new Set(texts)].join(' ').trim();
  }

  // ── Social links ──
  const social = {};
  const socialMap = {
    facebook:  '.gz-social-facebook',
    linkedin:  '.gz-social-linkedin',
    instagram: '.gz-social-instagram',
    twitter:   '.gz-social-twitter:not(.gz-twitter-img-placeholder)',
    youtube:   '.gz-social-youtube',
    pinterest: '.gz-social-pinterest',
  };
  for (const [platform, selector] of Object.entries(socialMap)) {
    const el = root.querySelector(selector);
    if (el) {
      const href = el.getAttribute('href') || '';
      if (href && href !== '#' && !href.includes('javascript')) {
        social[platform] = href;
      }
    }
  }

  return { description, logoUrl, social };
}

// Clean a business name into a URL slug (for the chamber site, without GZ numeric ID)
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────
async function main() {
  console.log('🏛  Medina Chamber — GrowthZone Member Scraper');
  console.log('='.repeat(52));
  if (NO_DETAILS) console.log('ℹ  --no-details: skipping description fetch\n');

  mkdirSync(OUT_DIR, { recursive: true });

  const letters = LETTER_ONLY ? [LETTER_ONLY] : LETTERS;

  // ── Step 1: Collect all members from letter pages ──
  const allMembers = new Map(); // slug → member object
  let totalListing = 0;

  for (const letter of letters) {
    const url = `${BASE}/list/FindStartsWith?term=${letter}`;
    process.stdout.write(`  ${letter}  `);

    let html;
    try {
      html = await get(url);
    } catch (e) {
      process.stdout.write(`ERR(${e.message})\n`);
      await sleep(DELAY_MS);
      continue;
    }

    if (DEBUG && letter === (LETTER_ONLY || 'A')) {
      writeFileSync(DEBUG_FILE, html, 'utf-8');
      console.log(`\n✅ Debug HTML → scripts/_debug-raw.html`);
      process.exit(0);
    }

    const members = parseListingPage(html);
    process.stdout.write(`${members.length} members\n`);
    totalListing += members.length;

    for (const m of members) {
      if (!allMembers.has(m.slug)) {
        allMembers.set(m.slug, m);
      }
    }

    await sleep(DELAY_MS);
  }

  const members = Array.from(allMembers.values());
  console.log(`\n📋 Unique members: ${members.length}  (${totalListing - members.length} duplicates removed across letters)\n`);

  // ── Step 2: Fetch detail pages for description ──
  if (!NO_DETAILS) {
    console.log('🔍 Fetching detail pages for descriptions...\n');
    let done = 0;
    let withDesc = 0;
    let errors = 0;

    for (const member of members) {
      done++;
      const pct = ((done / members.length) * 100).toFixed(0);
      process.stdout.write(`  [${pct}%] ${member.name.substring(0, 42).padEnd(42)} `);

      try {
        const detailHtml = await get(`${BASE}/list/Details/${member.slug}`);
        const detail = parseDetailPage(detailHtml);
        member.description = detail.description;
        member.social = detail.social;
        // Detail page logo is full-res; prefer it over listing page thumbnail
        if (detail.logoUrl) member.logoUrl = detail.logoUrl;
        if (detail.description) {
          withDesc++;
          console.log('✓' + (detail.logoUrl ? ' +logo' : '') + (Object.keys(detail.social).length ? ' +social' : ''));
        } else {
          console.log('(no description)' + (detail.logoUrl ? ' +logo' : ''));
        }
      } catch (e) {
        console.log(`✗ ${e.message}`);
        member.description = '';
        member.social = {};
        errors++;
      }

      await sleep(DELAY_MS);
    }

    console.log(`\n  ${withDesc}/${members.length} members have descriptions`);
    if (errors) console.log(`  ⚠  ${errors} detail pages failed`);
  }

  // ── Step 3: Write JSON ──
  const output = {
    generatedAt: new Date().toISOString(),
    totalCount: members.length,
    members: members.map(m => ({
      name: m.name,
      chamberSlug: toSlug(m.name),
      gzSlug: m.slug,
      gzUrl: `${BASE}/list/Details/${m.slug}`,
      address: m.address,
      phone: m.phone,
      website: m.website,
      logoUrl: m.logoUrl,
      description: m.description || '',
      categories: m.categories,
      social: m.social || {},
      membershipTier: m.membershipTier ?? 20,
    })),
  };

  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

  console.log('\n' + '='.repeat(52));
  console.log(`✅ Done! ${members.length} members → src/data/members.json`);
  console.log(`\n  To refresh data later, just re-run this script.`);
}

main().catch(e => {
  console.error('\n❌ Fatal:', e.message);
  process.exit(1);
});
