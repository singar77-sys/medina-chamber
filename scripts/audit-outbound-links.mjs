/**
 * Outbound Link Audit
 * -------------------
 * Enumerates every external URL referenced in:
 *   - src/data/members.json  (website, logoUrl, social.*)
 *   - src/data/events.json   (registerUrl, detailUrl, image)
 *   - src/data/jobs.json     (applyUrl, detailUrl)
 *   - src/data/blog.json     (sourceUrl, image)
 *   - src/data/member-news.json (detailUrl, image, thumbnail)
 *   - src/**.(ts|tsx) hardcoded http(s):// URLs
 *
 * Tests each unique URL and records status + final URL + source locations.
 * Writes scripts/link-audit-report.json and prints a summary.
 *
 * Concurrency: 15 requests in flight. HEAD first, GET fallback for HEAD-blockers.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const REPORT = join(ROOT, 'scripts', 'link-audit-report.json');

const CONCURRENCY = 15;
const TIMEOUT_MS = 10_000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Domains to skip (they're our own or not meant to be live yet)
const SKIP_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'medinachamber.com',       // our own domain — still on GrowthZone until cutover
  'www.medinachamber.com',
  'chamber-git-main-spinkick-entertainment.vercel.app',
  'res.cloudinary.com',      // GrowthZone CDN — tested per-image if referenced
]);

// ── URL extraction ─────────────────────────────────────────────────
const URL_RE = /https?:\/\/[^\s"'<>`)(\]]+/gi;

function normalizeUrl(raw) {
  if (!raw) return null;
  let u = String(raw).trim();
  if (!u) return null;
  // Strip trailing punctuation from freeform text
  u = u.replace(/[.,;:!?\)\]]*$/, '');
  try {
    const url = new URL(u);
    return url.toString();
  } catch {
    return null;
  }
}

function addUrl(map, rawUrl, location) {
  const url = normalizeUrl(rawUrl);
  if (!url) return;
  const host = new URL(url).hostname;
  if (SKIP_HOSTS.has(host)) return;
  if (!map.has(url)) map.set(url, []);
  map.get(url).push(location);
}

function walkJsonUrls(obj, path = '') {
  // No-op: we extract URLs from specific fields below
}

// ── Gather URLs from data files ────────────────────────────────────
function gatherFromMembers(map) {
  const d = JSON.parse(readFileSync(join(ROOT, 'src/data/members.json'), 'utf8'));
  for (const m of d.members) {
    const loc = `members.json:${m.chamberSlug}`;
    if (m.website) addUrl(map, m.website, `${loc} (website)`);
    if (m.logoUrl) addUrl(map, m.logoUrl, `${loc} (logoUrl)`);
    if (m.social) {
      for (const [platform, url] of Object.entries(m.social)) {
        if (url) addUrl(map, url, `${loc} (social.${platform})`);
      }
    }
  }
}

function gatherFromEvents(map) {
  const d = JSON.parse(readFileSync(join(ROOT, 'src/data/events.json'), 'utf8'));
  for (const e of d.events) {
    const loc = `events.json:${e.slug}`;
    if (e.registerUrl) addUrl(map, e.registerUrl, `${loc} (registerUrl)`);
    if (e.detailUrl) addUrl(map, e.detailUrl, `${loc} (detailUrl)`);
    if (e.image) addUrl(map, e.image, `${loc} (image)`);
  }
}

function gatherFromJobs(map) {
  const d = JSON.parse(readFileSync(join(ROOT, 'src/data/jobs.json'), 'utf8'));
  for (const j of d.jobs) {
    const loc = `jobs.json:${j.slug}`;
    if (j.applyUrl) addUrl(map, j.applyUrl, `${loc} (applyUrl)`);
    if (j.detailUrl) addUrl(map, j.detailUrl, `${loc} (detailUrl)`);
  }
}

function gatherFromBlog(map) {
  const d = JSON.parse(readFileSync(join(ROOT, 'src/data/blog.json'), 'utf8'));
  for (const p of d.posts) {
    const loc = `blog.json:${p.slug}`;
    if (p.sourceUrl) addUrl(map, p.sourceUrl, `${loc} (sourceUrl)`);
    if (p.image) addUrl(map, p.image, `${loc} (image)`);
  }
}

function gatherFromMemberNews(map) {
  const d = JSON.parse(readFileSync(join(ROOT, 'src/data/member-news.json'), 'utf8'));
  for (const a of d.articles) {
    const loc = `member-news.json:${a.slug}`;
    if (a.detailUrl) addUrl(map, a.detailUrl, `${loc} (detailUrl)`);
    if (a.image) addUrl(map, a.image, `${loc} (image)`);
    if (a.thumbnail) addUrl(map, a.thumbnail, `${loc} (thumbnail)`);
  }
}

function gatherFromSource(map) {
  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      const p = join(dir, entry);
      const st = statSync(p);
      if (st.isDirectory()) {
        walk(p);
        continue;
      }
      if (!/\.(tsx?|mdx?)$/i.test(entry)) continue;
      const txt = readFileSync(p, 'utf8');
      const rel = relative(ROOT, p).replace(/\\/g, '/');
      let lineNo = 0;
      for (const line of txt.split('\n')) {
        lineNo++;
        const matches = line.match(URL_RE);
        if (!matches) continue;
        for (const raw of matches) {
          // Skip template literal interpolations and obvious non-URLs
          if (raw.includes('${')) continue;
          addUrl(map, raw, `${rel}:${lineNo}`);
        }
      }
    }
  }
  walk(join(ROOT, 'src'));
}

// ── HTTP testing ───────────────────────────────────────────────────
async function testOne(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();
  const attempt = async (method) => {
    return fetch(url, {
      method,
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/*;q=0.8,*/*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  };
  try {
    let res;
    try { res = await attempt('HEAD'); }
    catch { res = await attempt('GET'); }
    // Retry with GET on ANY non-2xx. Many servers (GrowthZone, Wordpress,
    // IIS, sites behind Cloudflare Bot Management) reject HEAD with various
    // status codes (400, 403, 404, 405, 503) while accepting GET.
    if (res && !res.ok) {
      try {
        const res2 = await attempt('GET');
        if (res2.ok || res2.status < res.status) res = res2;
      } catch {}
    }
    clearTimeout(timer);
    return {
      ok: res.ok,
      status: res.status,
      finalUrl: res.url,
      redirected: res.redirected,
      ms: Date.now() - start,
    };
  } catch (e) {
    clearTimeout(timer);
    return {
      ok: false,
      status: 0,
      error: (e && e.message ? e.message : String(e)).slice(0, 120),
      ms: Date.now() - start,
    };
  }
}

async function runBatches(urls, onEach) {
  let idx = 0;
  const results = new Map();
  async function worker() {
    while (idx < urls.length) {
      const i = idx++;
      const url = urls[i];
      const r = await testOne(url);
      results.set(url, r);
      onEach(i + 1, urls.length, url, r);
    }
  }
  await Promise.all(Array(CONCURRENCY).fill(0).map(() => worker()));
  return results;
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  const map = new Map();

  console.log('Gathering URLs...');
  gatherFromMembers(map);
  gatherFromEvents(map);
  gatherFromJobs(map);
  gatherFromBlog(map);
  gatherFromMemberNews(map);
  gatherFromSource(map);

  const urls = [...map.keys()].sort();
  console.log(`Found ${urls.length} unique external URLs.`);
  console.log('');

  const results = await runBatches(urls, (n, total, url, r) => {
    const sym = r.ok ? '\u2713' : '\u2717';
    const short = url.length > 72 ? url.slice(0, 69) + '...' : url;
    console.log(`[${n}/${total}] ${sym} ${r.status || 'ERR'} ${short}`);
  });

  // Categorize
  const bad = [];
  const redirected = [];
  const ok = [];
  for (const url of urls) {
    const r = results.get(url);
    const entry = {
      url,
      sources: map.get(url),
      status: r.status,
      finalUrl: r.finalUrl,
      redirected: r.redirected,
      error: r.error,
      ms: r.ms,
    };
    if (!r.ok) bad.push(entry);
    else if (r.redirected) redirected.push(entry);
    else ok.push(entry);
  }

  writeFileSync(REPORT, JSON.stringify({
    generatedAt: new Date().toISOString(),
    total: urls.length,
    ok: ok.length,
    redirected: redirected.length,
    bad: bad.length,
    results: { bad, redirected, ok },
  }, null, 2));

  console.log('');
  console.log(`Total: ${urls.length}  OK: ${ok.length}  Redirected: ${redirected.length}  Bad: ${bad.length}`);
  console.log(`Report: ${REPORT}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
