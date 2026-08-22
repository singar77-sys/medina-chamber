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
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'node-html-parser';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const OUT_FILE = join(ROOT, 'src', 'data', 'member-news.json');

const LISTING_URL = 'https://business.medinachamber.com/news';
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

/** Parse the listing page for all article stubs */
function parseListingPage(html) {
  const root = parse(html);
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
const listingHtml = await get(LISTING_URL);
let stubs = parseListingPage(listingHtml);

if (TEST_MODE) {
  stubs = stubs.slice(0, 3);
  console.log(`  ℹ  TEST MODE — first 3 articles only`);
}

console.log(`  Found ${stubs.length} articles to scrape\n`);

const articles = [];
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
  }

  if (i < stubs.length - 1) await sleep(DELAY_MS);
}

// Sort newest first
articles.sort((a, b) => b.dateISO.localeCompare(a.dateISO));

const output = {
  generatedAt: new Date().toISOString(),
  totalArticles: articles.length,
  articles,
};

writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

console.log('\n====================================================');
console.log(`✅  Done! ${articles.length} articles saved to src/data/member-news.json`);
if (articles.length > 0) {
  console.log(`\n  Date range: ${articles[articles.length - 1].dateISO} → ${articles[0].dateISO}`);
  const members = [...new Set(articles.map(a => a.memberName).filter(Boolean))];
  console.log(`  Posted by ${members.length} different member businesses`);
}
