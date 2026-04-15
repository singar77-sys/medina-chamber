/**
 * Generate Member Embeddings
 * ---------------------------
 * For each member, builds a semantic document from all available signals
 * (name, categories, chamber description, scraped website content) and
 * requests an embedding from OpenAI text-embedding-3-small (1536 dims).
 *
 * Output: src/data/member-embeddings.json
 *   {
 *     generatedAt,
 *     model: "text-embedding-3-small",
 *     dimensions: 1536,
 *     count: 511,
 *     embeddings: [
 *       { slug: "...", doc: "...", vector: [1536 floats] },
 *       ...
 *     ]
 *   }
 *
 * Runs once per content refresh. Cost: ~$0.001 total for 511 members.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/generate-member-embeddings.mjs
 *   OPENAI_API_KEY=sk-... node scripts/generate-member-embeddings.mjs --limit=10  # test run
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { openai } from '@ai-sdk/openai';
import { embedMany } from 'ai';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const MEMBERS_FILE = join(ROOT, 'src', 'data', 'members.json');
const WEBSITES_FILE = join(ROOT, 'src', 'data', 'member-websites.json');
const OUT_FILE = join(ROOT, 'src', 'data', 'member-embeddings.json');

const MODEL = 'text-embedding-3-small';
const DIMENSIONS = 1536;
const BATCH_SIZE = 100;

// Load .env.local for OPENAI_API_KEY
const envPath = join(ROOT, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

if (!process.env.OPENAI_API_KEY) {
  console.error('FATAL: OPENAI_API_KEY not set (.env.local or shell env).');
  process.exit(1);
}

const args = process.argv.slice(2);
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0');

// ── Build semantic document per member ─────────────────────────────
function extractCity(address) {
  if (!address) return '';
  const parts = address.split(',');
  return parts.length >= 2 ? parts[1].trim() : '';
}

function cleanText(t, maxLen = 600) {
  if (!t) return '';
  return String(t)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function buildDocument(member, scraped) {
  const lines = [];

  // Line 1: name — highest weight (it's first)
  lines.push(member.name);

  // Line 2: categories — authoritative taxonomy, usually accurate
  if (member.categories && member.categories.length) {
    lines.push('Business categories: ' + member.categories.join(', '));
  }

  // Line 3: chamber description (if present) — curated
  if (member.description && member.description.trim().length > 5) {
    lines.push(cleanText(member.description, 500));
  }

  // Line 4: scraped meta description / title — often a clean tagline
  if (scraped) {
    if (scraped.metaDescription && scraped.metaDescription.trim().length > 10) {
      lines.push(cleanText(scraped.metaDescription, 300));
    } else if (scraped.title && scraped.title.length > 5 && scraped.title !== member.name) {
      lines.push(cleanText(scraped.title, 150));
    }

    // Line 5: services list — strong signal when present
    if (Array.isArray(scraped.services) && scraped.services.length) {
      // Filter junk entries (very short, nav labels)
      const clean = scraped.services
        .map(s => String(s).trim())
        .filter(s => s.length > 3 && s.length < 120 && !/^(home|menu|about|contact|services)$/i.test(s))
        .slice(0, 10);
      if (clean.length) lines.push('Services offered: ' + clean.join('; '));
    }

    // Line 6: h1s — page headlines
    if (Array.isArray(scraped.h1) && scraped.h1.length) {
      const clean = scraped.h1
        .map(h => String(h).trim())
        .filter(h => h.length > 5 && h.length < 150)
        .slice(0, 3);
      if (clean.length) lines.push(clean.join(' '));
    }

    // Line 7: aboutText — biggest chunk, trim hard
    if (scraped.aboutText) {
      const cleaned = cleanText(scraped.aboutText, 600);
      if (cleaned.length > 30) lines.push(cleaned);
    }
  }

  // Line 8: location
  const city = extractCity(member.address);
  if (city) lines.push(`Located in ${city}, Medina County, Ohio`);

  return lines.join('\n');
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  const members = JSON.parse(readFileSync(MEMBERS_FILE, 'utf8')).members;
  const scrapedData = existsSync(WEBSITES_FILE)
    ? JSON.parse(readFileSync(WEBSITES_FILE, 'utf8')).members
    : [];
  const scrapedBySlug = new Map(scrapedData.map(s => [s.chamberSlug, s]));

  let targets = members;
  if (LIMIT > 0) targets = members.slice(0, LIMIT);

  console.log(`Building documents for ${targets.length} members...`);

  const docs = targets.map(m => ({
    slug: m.chamberSlug,
    doc: buildDocument(m, scrapedBySlug.get(m.chamberSlug)),
  }));

  // Sanity-check
  const empty = docs.filter(d => !d.doc || d.doc.length < 20);
  if (empty.length) {
    console.warn(`WARNING: ${empty.length} members produced very short documents:`);
    for (const e of empty.slice(0, 5)) console.warn(`  ${e.slug}: "${e.doc}"`);
  }

  const avgLen = Math.round(docs.reduce((s, d) => s + d.doc.length, 0) / docs.length);
  console.log(`Avg document length: ${avgLen} chars`);
  console.log('');

  // Batch embed
  const embeddings = [];
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    process.stdout.write(`Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(docs.length / BATCH_SIZE)} (${batch.length} docs)... `);
    const t0 = Date.now();
    const result = await embedMany({
      model: openai.embedding(MODEL),
      values: batch.map(b => b.doc),
    });
    const ms = Date.now() - t0;
    for (let j = 0; j < batch.length; j++) {
      embeddings.push({
        slug: batch[j].slug,
        vector: result.embeddings[j],
      });
    }
    console.log(`${ms}ms`);
  }

  // Write output — vectors only (not docs, to keep file small)
  const output = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    dimensions: DIMENSIONS,
    count: embeddings.length,
    embeddings,
  };

  writeFileSync(OUT_FILE, JSON.stringify(output));
  const sizeKB = Math.round(JSON.stringify(output).length / 1024);
  console.log('');
  console.log(`Wrote ${embeddings.length} embeddings to ${OUT_FILE} (${sizeKB} KB)`);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
