/**
 * Clean up garbage/malformed member URLs flagged by the link audit.
 * Only touches unambiguous errors. Ambiguous cases (genuinely dead websites
 * that may have a correct replacement) are left for user review.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const MEMBERS_FILE = join(__dir, '..', 'src', 'data', 'members.json');

// Slug → { field, from, to, reason }
const FIXES = [
  // Placeholder garbage: "http://www.www./"
  { slug: 'brown-geo-m-assoc-inc', field: 'website', to: '',
    reason: 'was "http://www.www./" placeholder' },
  { slug: 'medina-county-commissioners', field: 'website', to: '',
    reason: 'was "http://www.www./" placeholder' },
  { slug: 'russs-car-care', field: 'website', to: '',
    reason: 'was "http://www.www./" placeholder' },

  // Malformed URL: "http://www/ffl.net" — First Federal Lakewood's real URL is ffl.bank
  { slug: 'first-federal-of-lakewood', field: 'website', to: 'https://www.ffl.bank/',
    reason: 'was "http://www/ffl.net" (malformed); bank rebranded to .bank TLD' },

  // Email address in website field
  { slug: 'duck-duck-print', field: 'website', to: '',
    reason: 'was "http://info@goduckduckprint.com/" — email address, not a URL' },
  { slug: 'shrm-medina-county', field: 'website', to: '',
    reason: 'was "http://shrm-medina@ohioshrm.org/" — email address, not a URL' },

  // Malformed social.facebook: two URLs concatenated
  { slug: 'sperry-the-masica-company', field: 'social.facebook',
    to: 'https://www.facebook.com/sperrycgathemasicacompany',
    reason: 'was "http://facebook.com/pageshttps://www.facebook.com/sperrycgathemasicacompany" — two URLs stuck together' },
];

const data = JSON.parse(readFileSync(MEMBERS_FILE, 'utf8'));
const applied = [];

for (const fix of FIXES) {
  const member = data.members.find(m => m.chamberSlug === fix.slug);
  if (!member) {
    applied.push({ ...fix, status: 'slug-not-found' });
    continue;
  }
  const [parent, child] = fix.field.split('.');
  const fromValue = child ? (member[parent] && member[parent][child]) : member[parent];
  if (child) {
    if (!member[parent]) member[parent] = {};
    member[parent][child] = fix.to;
  } else {
    member[parent] = fix.to;
  }
  applied.push({ ...fix, from: fromValue || '(empty)', status: 'applied' });
}

writeFileSync(MEMBERS_FILE, JSON.stringify(data, null, 2));

console.log('Applied ' + applied.filter(a => a.status === 'applied').length + ' fixes:');
for (const a of applied) {
  console.log('  [' + a.status + '] ' + a.slug + '.' + a.field);
  console.log('    from: ' + (a.from || '').slice(0, 80));
  console.log('    to:   ' + (a.to || '(empty)'));
  console.log('    why:  ' + a.reason);
}
