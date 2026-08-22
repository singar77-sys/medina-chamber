/**
 * Squarespace Business Blog Scraper
 * -----------------------------------
 * Fetches all posts from medinachamber.com/businessblog via the
 * Squarespace JSON API (?format=json&offset=N).
 * Saves to src/data/blog.json.
 *
 * Usage:
 *   node scripts/scrape-blog.mjs           # full run
 *   node scripts/scrape-blog.mjs --test    # first page only (20 posts)
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const OUT_FILE = join(ROOT, 'src', 'data', 'blog.json');

const BASE_URL = 'https://medinachamber.com/businessblog';
const PAGE_SIZE = 20;
const DELAY_MS = 500;

const args = process.argv.slice(2);
const TEST_MODE = args.includes('--test');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchPage(offset) {
  const url = offset
    ? `${BASE_URL}?format=json&offset=${offset}`
    : `${BASE_URL}?format=json`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} → ${url}`);
  return res.json();
}

function htmlToText(html = '') {
  return html
    // Drop <style>/<script> block CONTENTS first — the generic tag strip below
    // only removes the tags, which would leak the raw Squarespace block CSS
    // (e.g. "#block-… { … }") into the body as visible text.
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&rsquo;/g, '\u2019').replace(/&lsquo;/g, '\u2018').replace(/&rdquo;/g, '\u201D').replace(/&ldquo;/g, '\u201C')
    .replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013').replace(/&hellip;/g, '\u2026')
    .replace(/&reg;/g, '\u00AE').replace(/&copy;/g, '\u00A9').replace(/&trade;/g, '\u2122')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // strip zero-width chars (ZWSP/ZWNJ/ZWJ/BOM)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parsePost(item) {
  // publishOn is Unix ms timestamp
  const date = item.publishOn ? new Date(item.publishOn) : null;
  const dateISO = date ? date.toISOString().split('T')[0] : '';

  const slug = item.urlId || '';

  const body = item.body ? htmlToText(item.body) : '';
  const excerpt = item.excerpt ? htmlToText(item.excerpt) : body.substring(0, 200);

  return {
    slug,
    // Run the title through htmlToText too — otherwise raw entities like
    // "&amp;" / "&nbsp;" render literally in the <h1>.
    title: item.title ? htmlToText(item.title) : '',
    excerpt,
    body,
    author: item.author?.displayName || 'Stephanie Mueller',
    dateISO,
    dateRaw: date ? date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : '',
    image: item.assetUrl || '',
    sourceUrl: `https://medinachamber.com/businessblog/${slug}`,
    scrapedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────
console.log('\n📝  Medina Chamber — Business Blog Scraper');
console.log('====================================================');

// Get first page to find total count
console.log('  Fetching first page...');
const firstPage = await fetchPage();
const totalItems = firstPage.collection?.itemCount || firstPage.items?.length || 0;
const firstItems = firstPage.items || [];

console.log(`  Total posts: ${totalItems}`);

let allItems = [...firstItems];

// Squarespace paginates this collection with an opaque cursor (a publish-date
// timestamp), not a numeric index — each response's pagination.nextPageOffset
// must be passed back verbatim as the next request's offset. Walk forward
// following that cursor until pagination.nextPage is no longer true.
let pagination = firstPage.pagination;

if (!TEST_MODE && pagination?.nextPage) {
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  console.log(`  Fetching up to ${totalPages - 1} additional pages...\n`);

  let page = 1;
  while (pagination?.nextPage) {
    const offset = pagination.nextPageOffset;
    try {
      await sleep(DELAY_MS);
      const data = await fetchPage(offset);
      const items = data.items || [];
      allItems = allItems.concat(items);
      const pct = Math.round(((page + 1) / totalPages) * 100);
      console.log(`  [${String(pct).padStart(3)}%] Page ${page + 1}/${totalPages} — ${items.length} posts`);
      pagination = data.pagination;
      page++;
    } catch (err) {
      console.log(`  [ERR] Page ${page + 1} failed: ${err.message}`);
      break; // pagination is cursor-based — without this page's response we have no cursor to continue from
    }
  }
} else if (TEST_MODE) {
  console.log(`  ℹ  TEST MODE — first page only (${firstItems.length} posts)`);
}

console.log(`\n  Parsing ${allItems.length} posts...`);

const posts = allItems
  .map(parsePost)
  .filter(p => p.slug && p.title)
  .sort((a, b) => b.dateISO.localeCompare(a.dateISO));

const output = {
  generatedAt: new Date().toISOString(),
  totalPosts: posts.length,
  posts,
};

writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

console.log('\n====================================================');
console.log(`✅  Done! ${posts.length} posts saved to src/data/blog.json`);
if (posts.length > 0) {
  console.log(`\n  Date range: ${posts[posts.length - 1].dateISO} → ${posts[0].dateISO}`);
  const authors = [...new Set(posts.map(p => p.author).filter(Boolean))];
  console.log(`  Authors: ${authors.join(', ')}`);
}
