/**
 * Walk public/images/members/logos/ and point members.json logoUrl at each
 * matching file. Skips members that already have a logoUrl set (so existing
 * GrowthZone Cloudinary logos for Armstrong, Drug Mart, etc. are preserved).
 * Use --force to overwrite existing logoUrls.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const MEMBERS_FILE = join(ROOT, 'src', 'data', 'members.json');
const LOGO_DIR = join(ROOT, 'public', 'images', 'members', 'logos');

const FORCE = process.argv.includes('--force');

// Build slug → filename map from directory
const files = readdirSync(LOGO_DIR);
const bySlug = new Map();
for (const f of files) {
  const ext = extname(f);
  const slug = basename(f, ext);
  bySlug.set(slug, f);
}

const data = JSON.parse(readFileSync(MEMBERS_FILE, 'utf8'));
const updates = [];
const skipped = [];

for (const m of data.members) {
  const file = bySlug.get(m.chamberSlug);
  if (!file) continue;
  const newUrl = `/images/members/logos/${file}`;
  if (m.logoUrl && !FORCE) {
    skipped.push({ slug: m.chamberSlug, existing: m.logoUrl });
    continue;
  }
  if (m.logoUrl !== newUrl) {
    updates.push({ slug: m.chamberSlug, from: m.logoUrl || '(empty)', to: newUrl });
    m.logoUrl = newUrl;
  }
}

writeFileSync(MEMBERS_FILE, JSON.stringify(data, null, 2));

console.log(`Updated ${updates.length} members.`);
for (const u of updates) console.log(`  ${u.slug}`);
if (skipped.length) {
  console.log(`\nSkipped ${skipped.length} (already had logoUrl, pass --force to overwrite):`);
  for (const s of skipped) console.log(`  ${s.slug} → ${s.existing.slice(0, 80)}`);
}
