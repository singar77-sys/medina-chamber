/**
 * Patch members.json with corrected URLs for members whose listed website
 * was broken, a dead domain, or only a social-media placeholder.
 *
 * Corrections sourced from web search on 2026-04-15.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const MEMBERS_FILE = join(__dir, '..', 'src', 'data', 'members.json');

// slug → corrected website
const CORRECTIONS = {
  'great-lakes-construction-co': 'https://www.greatlakesway.com/',
  'medina-county-career-center': 'https://mcjvs.edu/',
  'carecore-at-willowood': 'https://carecorewillowood.com/',
  'fechko-excavating-inc': 'https://www.fechko.com/',
  'fire-dex': 'https://firedex.com/',
  'genes-refrigeration-heating-ac-inc-and-gene-tolliver-inc-dba-all-american-heating-cooling': 'https://www.genesrefrigeration.com/',
  'first-financial-bank': 'https://www.bankatfirst.com/',
  'rico-manufacturing': 'https://ricoequipment.com/',
};

const data = JSON.parse(readFileSync(MEMBERS_FILE, 'utf8'));
const changed = [];

for (const m of data.members) {
  if (CORRECTIONS[m.chamberSlug] && m.website !== CORRECTIONS[m.chamberSlug]) {
    changed.push({ slug: m.chamberSlug, from: m.website, to: CORRECTIONS[m.chamberSlug] });
    m.website = CORRECTIONS[m.chamberSlug];
  }
}

writeFileSync(MEMBERS_FILE, JSON.stringify(data, null, 2));

console.log(`Patched ${changed.length} members:`);
for (const c of changed) console.log(`  ${c.slug}\n    ${c.from}\n    → ${c.to}`);
