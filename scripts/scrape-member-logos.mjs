/**
 * Member Logo Scraper
 * -------------------
 * For each target member, fetches the homepage and tries a ranked set of
 * heuristics to find the company logo:
 *   1. <link rel="icon" type="image/svg+xml">   — SVG favicon (best: vector)
 *   2. <meta property="og:image">               — branded share image
 *   3. <img> with class or alt containing "logo" (filtered by size)
 *   4. First <img> inside <header> or <nav>     — common pattern
 *   5. <a href="/"> wrapping an <img>           — home link logo
 *   6. <link rel="apple-touch-icon">            — high-res PNG fallback
 *
 * Candidates are scored (svg > transparent png > png > jpg) and the winner
 * is downloaded to public/images/members/logos/{slug}.{ext}.
 *
 * Usage:
 *   node scripts/scrape-member-logos.mjs              # all Visibility Plus members
 *   node scripts/scrape-member-logos.mjs --slug=armstrong
 *   node scripts/scrape-member-logos.mjs --dry-run    # don't write files
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'node-html-parser';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const MEMBERS_FILE = join(ROOT, 'src', 'data', 'members.json');
const LOGO_DIR = join(ROOT, 'public', 'images', 'members', 'logos');
const REPORT_FILE = join(ROOT, 'scripts', 'logo-scrape-report.json');

const DELAY_MS = 800;
const TIMEOUT_MS = 12_000;
const MIN_IMG_BYTES = 400;        // skip trivially tiny files
const MAX_IMG_BYTES = 4_000_000;  // skip > 4 MB

const args = process.argv.slice(2);
const SLUG_ONLY = args.find(a => a.startsWith('--slug='))?.split('=')[1];
const DRY_RUN = args.includes('--dry-run');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── HTTP helpers ─────────────────────────────────────────────────
async function fetchWithTimeout(url, { asBuffer = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        'Accept': asBuffer
          ? 'image/*,application/octet-stream'
          : 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    if (asBuffer) {
      const ct = res.headers.get('content-type') || '';
      const buf = Buffer.from(await res.arrayBuffer());
      return { buf, contentType: ct, finalUrl: res.url };
    }
    const text = await res.text();
    return { text, finalUrl: res.url };
  } catch (e) {
    clearTimeout(timer);
    return null;
  }
}

// ── URL helpers ──────────────────────────────────────────────────
function normalizeUrl(raw) {
  if (!raw) return null;
  let url = raw.trim();
  if (!url) return null;
  if (url.startsWith('//')) url = 'https:' + url;
  else if (!/^https?:/i.test(url)) url = 'http://' + url;
  try { return new URL(url).toString(); } catch { return null; }
}

function resolveUrl(rel, base) {
  if (!rel) return null;
  try { return new URL(rel, base).toString(); } catch { return null; }
}

function extFromUrl(url, contentType = '') {
  const pathname = (() => { try { return new URL(url).pathname; } catch { return url; } })();
  const ext = extname(pathname).toLowerCase().replace('.', '');
  if (['svg', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'ico'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  if (contentType.includes('svg')) return 'svg';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('x-icon')) return 'ico';
  return null;
}

// ── Logo discovery ───────────────────────────────────────────────
function scoreExt(ext) {
  if (ext === 'svg') return 100;
  if (ext === 'png') return 70;
  if (ext === 'webp') return 60;
  if (ext === 'jpg') return 40;
  if (ext === 'ico') return 10;
  return 0;
}

function looksLikeLogo(imgEl) {
  const attrs = [
    imgEl.getAttribute('alt') || '',
    imgEl.getAttribute('class') || '',
    imgEl.getAttribute('id') || '',
    imgEl.getAttribute('src') || '',
    imgEl.getAttribute('data-src') || '',
  ].join(' ').toLowerCase();
  return /logo|brand|mark/i.test(attrs);
}

function imgSrc(imgEl) {
  // Handle lazy-loaded images
  return imgEl.getAttribute('src')
    || imgEl.getAttribute('data-src')
    || imgEl.getAttribute('data-lazy-src')
    || imgEl.getAttribute('data-original');
}

function looksLikeIconOnly(url) {
  const s = (url || '').toLowerCase();
  // Common false positives: social icons, payment badges, award badges
  return /facebook|twitter|linkedin|instagram|youtube|pinterest|tiktok|yelp|\/social|icon-fb|icon-tw/i.test(s);
}

function findLogoCandidates(html, baseUrl) {
  const root = parse(html);
  const candidates = [];

  // 1. Favicons — grab ALL icon link tags, prefer SVG
  root.querySelectorAll('link[rel*="icon"]').forEach(l => {
    const href = l.getAttribute('href');
    const type = l.getAttribute('type') || '';
    if (!href) return;
    const url = resolveUrl(href, baseUrl);
    if (!url) return;
    const ext = extFromUrl(url, type);
    if (!ext) return;
    // Apple touch icons are usually high-res PNGs
    const isApple = (l.getAttribute('rel') || '').includes('apple-touch');
    candidates.push({
      url,
      source: isApple ? 'apple-touch-icon' : 'icon-link',
      score: scoreExt(ext) + (isApple ? 15 : 0) + (ext === 'svg' ? 20 : 0),
    });
  });

  // 2. Open Graph image — often a hero/brand image
  const og = root.querySelector('meta[property="og:image"]');
  if (og) {
    const url = resolveUrl(og.getAttribute('content'), baseUrl);
    if (url) {
      const ext = extFromUrl(url);
      if (ext) candidates.push({ url, source: 'og:image', score: scoreExt(ext) - 10 });
    }
  }

  // 3. <img> tags with logo markers
  root.querySelectorAll('img').forEach(img => {
    const src = imgSrc(img);
    if (!src) return;
    const url = resolveUrl(src, baseUrl);
    if (!url || looksLikeIconOnly(url)) return;
    const ext = extFromUrl(url);
    if (!ext) return;
    const isLogoish = looksLikeLogo(img);
    // Also check if it's inside a header/nav or a home link
    const parent = img.parentNode;
    const inHeader = !!img.closest('header');
    const inNav = !!img.closest('nav');
    const inHomeLink = !!img.closest('a[href="/"], a[href="./"], a[href$="index.html"]');
    let score = scoreExt(ext) - 20; // base penalty vs favicons
    if (isLogoish) score += 40;
    if (inHeader) score += 15;
    if (inNav) score += 10;
    if (inHomeLink) score += 25;
    if (score > 0) {
      candidates.push({ url, source: isLogoish ? 'img.logo' : (inHeader ? 'header>img' : 'img'), score });
    }
  });

  // Deduplicate by URL, keep highest score
  const map = new Map();
  for (const c of candidates) {
    const prev = map.get(c.url);
    if (!prev || c.score > prev.score) map.set(c.url, c);
  }
  return [...map.values()].sort((a, b) => b.score - a.score);
}

// ── Per-member processing ────────────────────────────────────────
async function processMember(member) {
  const result = {
    slug: member.chamberSlug,
    name: member.name,
    status: 'unknown',
    website: member.website || null,
    tried: [],
    picked: null,
    localPath: null,
    error: null,
  };

  const site = normalizeUrl(member.website);
  if (!site) {
    result.status = 'no-website';
    result.error = 'no usable website URL on member record';
    return result;
  }
  // Catch junk URLs like facebook.com/pages/ or bare instagram.com
  if (/facebook\.com\/pages\/?$/i.test(site) || /^https?:\/\/(www\.)?(instagram|facebook|twitter|linkedin)\.com\/?$/i.test(site)) {
    result.status = 'social-only';
    result.error = `only social profile on record (${site})`;
    return result;
  }

  const res = await fetchWithTimeout(site);
  if (!res) {
    result.status = 'fetch-failed';
    result.error = `could not fetch ${site}`;
    return result;
  }

  const candidates = findLogoCandidates(res.text, res.finalUrl);
  result.tried = candidates.slice(0, 5).map(c => ({ source: c.source, url: c.url.slice(0, 120), score: c.score }));

  if (candidates.length === 0) {
    result.status = 'no-candidates';
    return result;
  }

  // Try candidates in order until one downloads successfully
  for (const c of candidates) {
    await sleep(150);
    const dl = await fetchWithTimeout(c.url, { asBuffer: true });
    if (!dl || !dl.buf) continue;
    if (dl.buf.length < MIN_IMG_BYTES || dl.buf.length > MAX_IMG_BYTES) continue;
    const ext = extFromUrl(dl.finalUrl, dl.contentType);
    if (!ext || ext === 'ico') continue; // .ico isn't great for display
    result.picked = { source: c.source, url: c.url, score: c.score, ext, bytes: dl.buf.length };
    if (!DRY_RUN) {
      mkdirSync(LOGO_DIR, { recursive: true });
      const filename = `${member.chamberSlug}.${ext}`;
      writeFileSync(join(LOGO_DIR, filename), dl.buf);
      result.localPath = `/images/members/logos/${filename}`;
    } else {
      result.localPath = `(dry-run) /images/members/logos/${member.chamberSlug}.${ext}`;
    }
    result.status = 'downloaded';
    return result;
  }

  result.status = 'all-candidates-failed';
  return result;
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  const data = JSON.parse(readFileSync(MEMBERS_FILE, 'utf8'));
  const allMembers = data.members;

  let targets = allMembers.filter(m => m.membershipTier === 2 && !m.logoUrl);
  if (SLUG_ONLY) targets = allMembers.filter(m => m.chamberSlug === SLUG_ONLY);

  console.log(`Targeting ${targets.length} member(s)${DRY_RUN ? ' (dry run)' : ''}`);
  console.log('');

  const results = [];
  for (let i = 0; i < targets.length; i++) {
    const m = targets[i];
    process.stdout.write(`[${i + 1}/${targets.length}] ${m.name} ... `);
    const r = await processMember(m);
    results.push(r);
    if (r.status === 'downloaded') {
      console.log(`\u2713 ${r.picked.ext.toUpperCase()} ${Math.round(r.picked.bytes / 1024)}KB via ${r.picked.source}`);
    } else {
      console.log(`\u2717 ${r.status}${r.error ? ': ' + r.error : ''}`);
    }
    await sleep(DELAY_MS);
  }

  // Write a report
  writeFileSync(REPORT_FILE, JSON.stringify({
    generatedAt: new Date().toISOString(),
    total: results.length,
    downloaded: results.filter(r => r.status === 'downloaded').length,
    failed: results.filter(r => r.status !== 'downloaded').length,
    results,
  }, null, 2));

  // Summary
  const ok = results.filter(r => r.status === 'downloaded');
  const bad = results.filter(r => r.status !== 'downloaded');
  console.log('');
  console.log(`Done. ${ok.length}/${results.length} downloaded. ${bad.length} failed.`);
  if (bad.length) {
    console.log('\nFailed members:');
    for (const r of bad) console.log(`  - ${r.name} (${r.status})${r.error ? ' — ' + r.error : ''}`);
  }
  console.log(`\nReport: ${REPORT_FILE}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
