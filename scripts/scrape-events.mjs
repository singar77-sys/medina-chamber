/**
 * GrowthZone Events Scraper
 * -------------------------
 * Fetches upcoming chamber events from GrowthZone's public event calendar.
 * Scrapes the listing page for all event URLs, then each detail page for
 * full event data. Saves to src/data/events.json.
 *
 * Usage:
 *   node scripts/scrape-events.mjs              # full run → src/data/events.json
 *   node scripts/scrape-events.mjs --test       # single event only (first)
 *
 * HTML structure (confirmed from live GrowthZone pages):
 *   Listing:  .gz-events-cards .gz-card → event card
 *             a[href*="/Details/"]       → detail URL (contains slug + id)
 *   Detail:   .gz-pagetitle             → event title
 *             .gz-subtitle              → date/time string
 *             .gz-street-address etc    → location
 *             .gz-event-pricing-info    → pricing block (HTML)
 *             a[href*="/ap/Events/Register/"] → registration link
 *             .gz-details-img img       → event image
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'node-html-parser';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const OUT_FILE = join(ROOT, 'src', 'data', 'events.json');

const LISTING_URL = 'https://business.medinachamber.com/member-events';
const DELAY_MS = 400;

const args = process.argv.slice(2);
const TEST_MODE = args.includes('--test');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function get(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} → ${url}`);
  return res.text();
}

/** Extract plain text from HTML, collapsing whitespace */
function htmlToText(html = '') {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Parse the listing page for all event detail URLs and basic card data */
function parseListingPage(html) {
  const root = parse(html);
  const seen = new Set();
  const events = [];

  // Collect all /Details/ links (each event appears twice — image + title link)
  const allDetailLinks = root.querySelectorAll('a[href*="/Details/"]');
  for (const a of allDetailLinks) {
    const href = a.getAttribute('href') || '';
    const cleanHref = href.split('?')[0];
    if (seen.has(cleanHref)) continue;
    seen.add(cleanHref);

    // Extract slug (e.g. networking-wow-april-2026-1594363)
    const match = cleanHref.match(/\/Details\/(.+)$/);
    if (!match) continue;
    const fullSlug = match[1]; // e.g. "networking-wow-april-2026-1594363"

    // Split off the numeric ID suffix
    const idMatch = fullSlug.match(/-(\d+)$/);
    const eventId = idMatch ? idMatch[1] : null;
    const slug = idMatch ? fullSlug.replace(/-\d+$/, '') : fullSlug;

    const detailUrl = cleanHref.startsWith('http')
      ? cleanHref
      : `https://business.medinachamber.com${cleanHref}`;

    events.push({ slug, eventId, detailUrl, fullSlug });
  }

  return events;
}

/** Parse a detail page for full event data */
function parseDetailPage(html, { slug, eventId, detailUrl }) {
  const root = parse(html);

  // Title
  const title = root.querySelector('.gz-pagetitle')?.text?.trim() ?? '';

  // Date/time subtitle: "Wednesday, April 15, 2026 (8:30 AM - 10:00 AM)"
  const subtitleRaw = root.querySelector('.gz-subtitle')?.text?.trim()
    ?.replace(/\s*\([^)]*\)\s*$/, '') // remove timezone abbr like "(EDT)"
    ?.trim() ?? '';

  // Parse the date string into structured parts
  const dateMatch = subtitleRaw.match(/(\w+),\s+(\w+)\s+(\d+),\s+(\d+)\s+\((\d+:\d+\s*[AP]M)\s*[-–]\s*(\d+:\d+\s*[AP]M)\)/i);
  let dayOfWeek = '', month = '', day = '', year = '', startTime = '', endTime = '', dateISO = '';
  if (dateMatch) {
    [, dayOfWeek, month, day, year, startTime, endTime] = dateMatch;
    // Build ISO date string for sorting
    const months = { January:0,February:1,March:2,April:3,May:4,June:5,July:6,August:7,September:8,October:9,November:10,December:11 };
    const d = new Date(parseInt(year), months[month] ?? 0, parseInt(day));
    dateISO = d.toISOString().split('T')[0];
  }

  // Location
  const street = root.querySelector('.gz-street-address')?.text?.trim() ?? '';
  const city = root.querySelector('.gz-city')?.text?.trim() ?? '';
  const state = root.querySelector('.gz-state')?.text?.trim() ?? '';
  const zip = root.querySelector('.gz-postalcode')?.text?.trim() ?? '';
  const locationDesc = root.querySelector('.gz-location-description')?.text?.trim() ?? '';
  const location = [street, city && state ? `${city}, ${state}` : city || state, zip].filter(Boolean).join(', ');

  // Pricing (strip HTML to plain text)
  const pricingHtml = root.querySelector('.gz-event-pricing-info')?.innerHTML ?? '';
  const pricing = htmlToText(pricingHtml);

  // Image (Cloudinary URL from GrowthZone)
  const imgEl = root.querySelector('.gz-details-img img, .gz-event-details-img img, [class*="gz-details"] img');
  const image = imgEl?.getAttribute('src') ?? '';

  // Registration link
  const registerEl = root.querySelector('a[href*="/ap/Events/Register/"]');
  const registerUrl = registerEl?.getAttribute('href') ?? detailUrl;

  // Contact
  const contactSection = root.querySelector('.gz-contact-info, [class*="contact"]');
  const contactName = root.querySelector('.gz-contact-name')?.text?.trim()
    ?? (root.innerHTML.includes('Stephanie Mueller') ? 'Stephanie Mueller' : '');
  const contactPhone = root.querySelector('.gz-contact-phone, [itemprop="telephone"]')?.text?.trim() ?? '';

  return {
    slug,
    eventId,
    title,
    dateISO,
    dayOfWeek,
    month,
    day: parseInt(day) || 0,
    year: parseInt(year) || 0,
    startTime,
    endTime,
    dateString: subtitleRaw,
    location,
    locationDesc,
    street,
    city,
    state,
    zip,
    pricing,
    image,
    registerUrl,
    contactName,
    contactPhone,
    detailUrl,
    scrapedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────
console.log('\n📅  Medina Chamber — Events Scraper');
console.log('====================================================');

// Step 1: Get listing page and collect event URLs
console.log('  Fetching event listing page...');
const listingHtml = await get(LISTING_URL);
let eventStubs = parseListingPage(listingHtml);

if (TEST_MODE) {
  eventStubs = eventStubs.slice(0, 3);
  console.log(`  ℹ  TEST MODE — processing first 3 events only`);
}

console.log(`  Found ${eventStubs.length} events to scrape\n`);

// Step 2: Scrape each detail page
const events = [];
for (let i = 0; i < eventStubs.length; i++) {
  const stub = eventStubs[i];
  const pct = Math.round(((i + 1) / eventStubs.length) * 100);
  const prefix = `  [${String(pct).padStart(3)}%] ${stub.slug.substring(0, 45).padEnd(45)}`;

  try {
    const html = await get(stub.detailUrl);
    const event = parseDetailPage(html, stub);

    if (event.title) {
      events.push(event);
      const dateLabel = event.dateISO || 'no date';
      console.log(`${prefix} ✓  ${dateLabel} — ${event.startTime}`);
    } else {
      console.log(`${prefix} ⚠  no title found`);
    }
  } catch (err) {
    console.log(`${prefix} ✗  ${err.message}`);
  }

  if (i < eventStubs.length - 1) await sleep(DELAY_MS);
}

// Step 3: De-duplicate slugs. GrowthZone slugs are only unique when GrowthZone
// itself embeds a month-year suffix (e.g. safety-council-meeting-july-2026);
// recurring events like "raising-the-bar" reuse one bare slug across
// occurrences, which would make every card link to the first occurrence.
// Rewrite duplicates to the existing sibling convention, then assert uniqueness.
const slugCounts = new Map();
for (const event of events) {
  slugCounts.set(event.slug, (slugCounts.get(event.slug) ?? 0) + 1);
}
const takenSlugs = new Set(events.map((e) => e.slug));
for (const event of events) {
  if (slugCounts.get(event.slug) > 1) {
    const base = event.slug;
    const suffix = event.month && event.year
      ? `-${event.month.toLowerCase()}-${event.year}`
      : '';
    takenSlugs.delete(base); // every member of the group gets renamed
    let renamed = suffix && !base.endsWith(suffix)
      ? `${base}${suffix}`
      : `${base}-${event.eventId}`; // fallback: no month/year, or slug already suffixed
    if (takenSlugs.has(renamed)) renamed = `${base}-${event.eventId}`;
    takenSlugs.add(renamed);
    console.log(`  ↻  slug collision: ${base} → ${renamed}`);
    event.slug = renamed;
  }
}
const finalSlugs = new Set();
for (const event of events) {
  if (finalSlugs.has(event.slug)) {
    throw new Error(`Duplicate event slug after de-duplication: "${event.slug}" — resolve manually before saving.`);
  }
  finalSlugs.add(event.slug);
}

// Step 4: Sort by date ascending
events.sort((a, b) => a.dateISO.localeCompare(b.dateISO));

// Step 5: Save
const output = {
  generatedAt: new Date().toISOString(),
  totalEvents: events.length,
  events,
};

writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

console.log('\n====================================================');
console.log(`✅  Done! ${events.length} events saved to src/data/events.json`);
if (events.length > 0) {
  console.log(`\n  Date range: ${events[0].dateISO} → ${events[events.length - 1].dateISO}`);
}
