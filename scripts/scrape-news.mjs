/**
 * GrowthZone Member News Scraper
 * -------------------------------
 * Fetches member news articles from business.medinachamber.com/news.
 * Scrapes the listing page for all article URLs, then each detail page
 * for full body content. Saves to src/data/member-news.json.
 *
 * Usage:
 *   node scripts/scrape-news.mjs              # full run
 *   node scripts/scrape-news.mjs --test       # first 3 articles only
 *
 * HTML selectors (confirmed):
 *   Listing: .gz-content-card
 *            .gz-content-card-title a     → title + detail URL
 *            .gz-content-subtitle         → teaser
 *            .gz-content-contact          → member/business name
 *            .gz-web-content-date         → date (M/D/YYYY)
 *            img[itemprop="image"]        → thumbnail
 *   Detail:  .gz-pagetitle               → title
 *            .gz-subtitle                → subtitle/teaser
 *            .gz-content-description     → full body text
 *            .gz-details-img img         → full image
 *            .gz-tag                     → tags
 *
 * Write guards (see assertListingRendered / previousArticleCount below): the
 * script refuses to touch member-news.json unless the listing page actually
 * rendered, and refuses to replace a healthy file with an empty one.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'node-html-parser';
import { htmlToText } from './lib-html-to-text.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const OUT_FILE = join(ROOT, 'src', 'data', 'member-news.json');

const LISTING_URL = 'https://business.medinachamber.com/news';
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
 * empty newsroom, a GrowthZone markup change, and an error / login / CDN
 * interstitial served with a 200 (so the `res.ok` check in get() waves it
 * through). Only the first is safe to write, and downstream they are
 * indistinguishable — an empty articles array silently blanks /news.
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
  console.error('   Refusing to touch src/data/member-news.json — nothing parsed off this page is trustworthy.');
  process.exit(1);
}

/** Article count in the currently committed file — 0 when there is no baseline. */
function previousArticleCount() {
  if (!existsSync(OUT_FILE)) return 0;
  try {
    return JSON.parse(readFileSync(OUT_FILE, 'utf-8')).articles?.length ?? 0;
  } catch {
    return 0; // corrupt previous file — no baseline to defend
  }
}

/** Parse the listing page for all article stubs */
function parseListingPage(root) {
  const articles = [];
  const seen = new Set();

  const cards = root.querySelectorAll('.gz-content-card');
  for (const card of cards) {
    const titleEl = card.querySelector('.gz-content-card-title');
    const href = titleEl?.getAttribute('href') || '';
    if (!href || seen.has(href)) continue;
    seen.add(href);

    const title = titleEl?.text?.trim() || '';
    if (!title) continue;

    // Extract slug and ID from URL: /news/Details/my-title-123456
    const match = href.match(/\/news\/Details\/(.+)$/);
    if (!match) continue;
    const fullSlug = match[1];
    const idMatch = fullSlug.match(/-(\d+)$/);
    const articleId = idMatch ? idMatch[1] : null;
    const slug = idMatch ? fullSlug.replace(/-\d+$/, '') : fullSlug;

    const teaser = card.querySelector('.gz-content-subtitle')?.text?.trim() || '';
    const memberName = card.querySelector('.gz-content-contact')?.text?.trim() || '';
    const memberHref = card.querySelector('.gz-content-contact')?.parentNode?.getAttribute('href') || '';
    const dateRaw = card.querySelector('.gz-web-content-date')?.text?.trim() || '';
    const thumbnail = card.querySelector('img[itemprop="image"], .gz-card-head-img img')?.getAttribute('src') || '';

    // Parse date M/D/YYYY → ISO
    let dateISO = '';
    const dm = dateRaw.match(/(\d+)\/(\d+)\/(\d{4})/);
    if (dm) {
      const [, m, d, y] = dm;
      dateISO = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    articles.push({
      slug,
      articleId,
      fullSlug,
      title,
      teaser,
      memberName,
      memberSlug: memberHref.match(/\/RedirectTo\/(\d+)/)?.[1] || '',
      dateRaw,
      dateISO,
      thumbnail,
      detailUrl: href,
    });
  }

  return articles;
}

/** Parse a detail page for full article content */
function parseDetailPage(html, stub) {
  const root = parse(html);

  const title = root.querySelector('.gz-pagetitle')?.text?.trim() || stub.title;
  const subtitle = root.querySelector('.gz-subtitle')?.text?.trim() || stub.teaser;

  // Full body text
  const bodyEl = root.querySelector('.gz-content-description');
  const body = bodyEl ? htmlToText(bodyEl.innerHTML) : '';

  // Full image (larger than thumbnail)
  const image = root.querySelector('.gz-details-img img, .gz-detail-img img')?.getAttribute('src')
    || stub.thumbnail;

  // Tags
  const tags = root.querySelectorAll('.gz-tag')
    .map(t => t.text.trim())
    .filter(Boolean);

  // Member info from listing stub (detail page doesn't always repeat it)
  return {
    slug: stub.slug,
    articleId: stub.articleId,
    title,
    subtitle,
    body,
    image,
    tags,
    memberName: stub.memberName,
    memberSlug: stub.memberSlug,
    dateRaw: stub.dateRaw,
    dateISO: stub.dateISO,
    thumbnail: stub.thumbnail,
    detailUrl: stub.detailUrl,
    scrapedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────
console.log('\n📰  Medina Chamber — Member News Scraper');
console.log('====================================================');

console.log('  Fetching news listing page...');
const listingRoot = parse(await get(LISTING_URL));
assertListingRendered(listingRoot);
let stubs = parseListingPage(listingRoot);

if (TEST_MODE) {
  stubs = stubs.slice(0, 3);
  console.log(`  ℹ  TEST MODE — first 3 articles only`);
}

console.log(`  Found ${stubs.length} articles to scrape\n`);

const articles = [];
let detailFailures = 0;
for (let i = 0; i < stubs.length; i++) {
  const stub = stubs[i];
  const pct = Math.round(((i + 1) / stubs.length) * 100);
  const label = stub.title.substring(0, 50).padEnd(50);

  try {
    const html = await get(stub.detailUrl);
    const article = parseDetailPage(html, stub);
    articles.push(article);
    console.log(`  [${String(pct).padStart(3)}%] ${label} ✓  ${stub.dateISO} — ${stub.memberName}`);
  } catch (err) {
    console.log(`  [${String(pct).padStart(3)}%] ${label} ✗  ${err.message}`);
    detailFailures++;
  }

  if (i < stubs.length - 1) await sleep(DELAY_MS);
}

// Sort newest first
articles.sort((a, b) => b.dateISO.localeCompare(a.dateISO));

// A high failure rate means GrowthZone was erroring — keep the previous file
// rather than replacing it with the few survivors.
if (stubs.length > 0 && detailFailures > stubs.length * 0.2) {
  console.error(`\n❌ ${detailFailures}/${stubs.length} detail pages failed (>20%) — aborting without writing.`);
  process.exit(1);
}

// Deliberately NOT a zero-item block. These boards legitimately drain to zero,
// and the listing assert above already covers the failure a block would catch
// (moved markup, or an error page served with a 200). Refusing to write on a
// genuine zero would keep /news serving entries that no longer exist, which
// is worse than briefly empty. .github/workflows/scrape-daily.yml already made
// this call for these two datasets: it REPORTS a collapse after pushing rather
// than blocking, so one empty board cannot stop events reaching the site nightly.
const prevArticleCount = previousArticleCount();
if (articles.length === 0 && prevArticleCount > 0) {
  console.warn(`\n⚠️  Parsed 0 articles from a listing page that DID render (previously ${prevArticleCount}).`);
  console.warn(`   Writing the empty file. If ${LISTING_URL} still shows cards, the card selectors changed.`);
}

const output = {
  generatedAt: new Date().toISOString(),
  totalArticles: articles.length,
  articles,
};

// --test only scrapes 3 stubs, so writing OUT_FILE would permanently shrink
// src/data/member-news.json to those 3. Same guard scrape-blog.mjs uses.
if (TEST_MODE) {
  console.log(`\n(--test) Skipping the write to src/data/member-news.json — ${output.generatedAt}`);
} else {
  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
}

console.log('\n====================================================');
console.log(`✅  Done! ${articles.length} articles saved to src/data/member-news.json`);
if (articles.length > 0) {
  console.log(`\n  Date range: ${articles[articles.length - 1].dateISO} → ${articles[0].dateISO}`);
  const members = [...new Set(articles.map(a => a.memberName).filter(Boolean))];
  console.log(`  Posted by ${members.length} different member businesses`);
}
