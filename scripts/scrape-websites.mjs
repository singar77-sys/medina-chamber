/**
 * Member Website Scraper — Phase 1
 * ---------------------------------
 * Visits each member's own website and extracts:
 *   - Meta description / tagline
 *   - H1 + H2 headings (what they do)
 *   - Services / products list
 *   - About text
 *   - Team member names (if visible)
 *
 * Usage:
 *   node scripts/scrape-websites.mjs              # full run
 *   node scripts/scrape-websites.mjs --limit=10   # first N members (test)
 *   node scripts/scrape-websites.mjs --slug=armstrong  # single member
 *
 * Output: src/data/member-websites.json
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'node-html-parser';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const OUT_DIR = join(ROOT, 'src', 'data');
const OUT_FILE = join(OUT_DIR, 'member-websites.json');
const MEMBERS_FILE = join(OUT_DIR, 'members.json');

const DELAY_MS = 600;
const TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 500_000; // skip parsing huge pages

const args = process.argv.slice(2);
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0');
const SLUG_ONLY = args.find(a => a.startsWith('--slug='))?.split('=')[1];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Fetch with timeout + size guard ──────────────────────────────
async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('html')) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_HTML_BYTES) {
      // Still parse — just truncate
      return new TextDecoder().decode(buf.slice(0, MAX_HTML_BYTES));
    }
    return new TextDecoder().decode(buf);
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ── Strip noise elements, return clean root ───────────────────────
function cleanRoot(root) {
  const remove = ['script', 'style', 'noscript', 'svg', 'nav', 'header',
    'footer', 'aside', 'form', 'iframe', '[aria-hidden="true"]',
    '.cookie', '.popup', '.modal', '.banner', '.ad', '.sidebar'];
  for (const sel of remove) {
    try { root.querySelectorAll(sel).forEach(el => el.remove()); } catch {}
  }
  return root;
}

// ── Extract data from a parsed HTML root ─────────────────────────
function extractPage(html, url) {
  const root = parse(html);

  const metaDesc = root.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
  const ogDesc = root.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() || '';
  const title = root.querySelector('title')?.textContent?.trim() || '';

  cleanRoot(root);

  const h1s = root.querySelectorAll('h1').map(h => h.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 3);
  const h2s = root.querySelectorAll('h2').map(h => h.textContent.replace(/\s+/g, ' ').trim()).filter(t => t.length > 2 && t.length < 120).slice(0, 8);
  const h3s = root.querySelectorAll('h3').map(h => h.textContent.replace(/\s+/g, ' ').trim()).filter(t => t.length > 2 && t.length < 100).slice(0, 6);

  // Main body text — prefer <main>, then <article>, then <body>
  const mainEl = root.querySelector('main') || root.querySelector('article') || root.querySelector('.content') || root.querySelector('#content') || root.querySelector('body');
  const bodyText = mainEl
    ? mainEl.textContent.replace(/\s+/g, ' ').trim().substring(0, 1800)
    : '';

  // Service / product lists — look for <li> inside service-sounding containers
  const listItems = [];
  root.querySelectorAll('ul li, ol li').forEach(li => {
    const t = li.textContent.replace(/\s+/g, ' ').trim();
    if (t.length > 3 && t.length < 100 && !t.includes('\n')) listItems.push(t);
  });

  return {
    url,
    title: title.substring(0, 120),
    metaDescription: (metaDesc || ogDesc).substring(0, 300),
    h1: h1s,
    h2: h2s,
    h3: h3s,
    bodyText,
    listItems: [...new Set(listItems)].slice(0, 20),
  };
}

// ── Find subpages to scrape (about, services, team) ──────────────
function findSubpageLinks(html, baseUrl) {
  const root = parse(html);
  const origin = new URL(baseUrl).origin;
  const targets = {
    about: ['/about', '/about-us', '/our-story', '/who-we-are', '/company', '/our-company', '/about-us/', '/about/'],
    services: ['/services', '/what-we-do', '/solutions', '/products', '/our-services', '/services/'],
    team: ['/team', '/our-team', '/staff', '/people', '/meet-the-team', '/leadership'],
  };

  const found = {};
  const links = root.querySelectorAll('a[href]');
  for (const link of links) {
    const href = (link.getAttribute('href') || '').trim().toLowerCase().split('?')[0].split('#')[0];
    if (!href) continue;

    // Absolute same-origin or relative
    let full;
    try {
      full = href.startsWith('http') ? href : new URL(href, baseUrl).href;
    } catch { continue; }

    // Must be same origin
    if (!full.startsWith(origin)) continue;
    const path = new URL(full).pathname.replace(/\/$/, '') || '/';

    for (const [type, patterns] of Object.entries(targets)) {
      if (!found[type] && patterns.some(p => path === p || path.startsWith(p + '/'))) {
        found[type] = full;
      }
    }
  }
  return found;
}

// ── Scrape one member's website ───────────────────────────────────
async function scrapeMember(member) {
  const result = {
    chamberSlug: member.chamberSlug,
    website: member.website,
    scrapedAt: new Date().toISOString(),
    ok: false,
    pages: {},
  };

  // Normalise URL
  let baseUrl = member.website.trim();
  if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;

  // Fetch homepage
  let homeHtml = await fetchHtml(baseUrl);

  // Try https if http failed
  if (!homeHtml && baseUrl.startsWith('http://')) {
    homeHtml = await fetchHtml(baseUrl.replace('http://', 'https://'));
  }

  if (!homeHtml) return result;

  result.ok = true;
  result.pages.home = extractPage(homeHtml, baseUrl);

  // Find and scrape subpages
  const sublinks = findSubpageLinks(homeHtml, baseUrl);
  await sleep(300);

  for (const [type, url] of Object.entries(sublinks)) {
    const html = await fetchHtml(url);
    if (html) {
      result.pages[type] = extractPage(html, url);
      await sleep(300);
    }
  }

  return result;
}

// ── Consolidate scraped pages into a summary ──────────────────────
function summarize(scraped) {
  if (!scraped.ok) return null;

  const allH2 = [
    ...((scraped.pages.home?.h2 || [])),
    ...((scraped.pages.services?.h2 || [])),
    ...((scraped.pages.about?.h2 || [])),
  ];
  const allH3 = [
    ...((scraped.pages.services?.h3 || [])),
    ...((scraped.pages.home?.h3 || [])),
  ];
  const allLists = [
    ...((scraped.pages.services?.listItems || [])),
    ...((scraped.pages.home?.listItems || [])),
  ];

  return {
    chamberSlug: scraped.chamberSlug,
    website: scraped.website,
    scrapedAt: scraped.scrapedAt,
    title: scraped.pages.home?.title || '',
    metaDescription: scraped.pages.home?.metaDescription || '',
    h1: scraped.pages.home?.h1 || [],
    services: [...new Set([...allH2, ...allH3])].slice(0, 12),
    listItems: [...new Set(allLists)].slice(0, 15),
    homeText: scraped.pages.home?.bodyText?.substring(0, 1000) || '',
    aboutText: scraped.pages.about?.bodyText?.substring(0, 1200) || '',
    pagesScraped: Object.keys(scraped.pages),
  };
}

// ── MAIN ──────────────────────────────────────────────────────────
async function main() {
  console.log('🌐  Medina Chamber — Website Scraper');
  console.log('='.repeat(52));

  const membersData = JSON.parse(readFileSync(MEMBERS_FILE, 'utf-8'));
  let members = membersData.members.filter(m => m.website && m.website.trim());

  if (SLUG_ONLY) {
    members = members.filter(m => m.chamberSlug === SLUG_ONLY);
    if (!members.length) { console.error('❌ Slug not found:', SLUG_ONLY); process.exit(1); }
  }

  if (LIMIT) members = members.slice(0, LIMIT);

  // Load existing results so we can resume
  let existing = {};
  if (existsSync(OUT_FILE)) {
    try {
      const prev = JSON.parse(readFileSync(OUT_FILE, 'utf-8'));
      prev.members.forEach(m => { existing[m.chamberSlug] = m; });
      console.log(`ℹ  Resuming — ${Object.keys(existing).length} already scraped\n`);
    } catch {}
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const results = { ...existing };
  let done = 0, ok = 0, fail = 0, skip = 0, pruned = 0;

  for (const member of members) {
    done++;
    const pct = ((done / members.length) * 100).toFixed(0);

    // Skip only when the existing entry is a FRESH success. Successful
    // scrapes are re-fetched after 30 days (a redesigned member site must
    // re-enter the vector index — skip-if-present froze every entry at its
    // first scrape forever) and failed entries retry every run; within a
    // single run the checkpoint saves still make this resumable.
    const prev = existing[member.chamberSlug];
    const prevAgeDays = prev?.scrapedAt
      ? (Date.now() - Date.parse(prev.scrapedAt)) / 86400000
      : Infinity;
    if (prev && prev.ok !== false && prevAgeDays < 30) {
      process.stdout.write(`  [${pct}%] ${member.name.substring(0, 40).padEnd(40)} SKIP (fresh, ${Math.floor(prevAgeDays)}d)\n`);
      skip++;
      continue;
    }

    process.stdout.write(`  [${pct}%] ${member.name.substring(0, 40).padEnd(40)} `);

    const scraped = await scrapeMember(member);
    const summary = summarize(scraped);

    if (summary) {
      results[member.chamberSlug] = summary;
      ok++;
      const pages = summary.pagesScraped.join('+');
      console.log(`✓  (${pages}) — "${(summary.metaDescription || summary.h1[0] || '').substring(0, 50)}"`);
    } else if (prev && prev.ok !== false && prev.website === member.website) {
      // A 30-day re-fetch that times out or hits a one-off 5xx must not throw
      // away a good summary: this entry feeds the member's Upstash vector
      // document, so blanking it strips their website signals out of search
      // until a later run succeeds. Keep the summary, record the attempt.
      results[member.chamberSlug] = {
        ...prev,
        lastAttemptAt: new Date().toISOString(),
        failCount: (prev.failCount ?? 0) + 1,
      };
      fail++;
      console.log(`✗  (unreachable — kept the ${Math.floor(prevAgeDays)}d-old summary)`);
    } else {
      results[member.chamberSlug] = {
        chamberSlug: member.chamberSlug,
        website: member.website,
        scrapedAt: new Date().toISOString(),
        ok: false,
      };
      fail++;
      console.log('✗  (unreachable)');
    }

    // Save every 20 members so we can resume on crash
    if (done % 20 === 0) {
      writeFileSync(OUT_FILE, JSON.stringify({
        generatedAt: new Date().toISOString(),
        totalScraped: Object.keys(results).length,
        members: Object.values(results),
      }, null, 2), 'utf-8');
      process.stdout.write(`  💾 Progress saved (${done}/${members.length})\n`);
    }

    await sleep(DELAY_MS);
  }

  // Departed members were never removed, so this file grew monotonically (53
  // orphaned entries today). Only prune on a full run — a --limit or --slug
  // run never looked at the rest of the roster.
  if (!LIMIT && !SLUG_ONLY) {
    const currentSlugs = new Set(membersData.members.map(m => m.chamberSlug));
    for (const slug of Object.keys(results)) {
      if (!currentSlugs.has(slug)) {
        delete results[slug];
        pruned++;
      }
    }
    if (pruned) console.log(`\n  🧹 Pruned ${pruned} entries for members no longer in members.json`);
  }

  // Final save
  writeFileSync(OUT_FILE, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalScraped: Object.keys(results).length,
    successCount: ok + skip,
    failCount: fail,
    members: Object.values(results),
  }, null, 2), 'utf-8');

  console.log('\n' + '='.repeat(52));
  console.log(`✅ Done!  ✓ ${ok + skip} reachable  ✗ ${fail} failed  → src/data/member-websites.json`);
  console.log(`\n  Re-run anytime — already-scraped members are skipped automatically.`);
  console.log(`  Use --slug=<chamberSlug> to re-scrape a single member.`);
}

main().catch(e => {
  console.error('\n❌ Fatal:', e.message);
  process.exit(1);
});
