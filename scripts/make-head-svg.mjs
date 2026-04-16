/**
 * Generate chamberbot-head.svg from the full chamberbot.svg.
 * Crops viewBox to head area and strips body/leg/arm groups.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const SRC = join(ROOT, 'public', 'images', 'chamberbot.svg');
const OUT = join(ROOT, 'public', 'images', 'chamberbot-head.svg');

let svg = readFileSync(SRC, 'utf8');

// Crop viewBox to head: antenna top through mouth area
svg = svg.replace(/viewBox="[^"]+"/, 'viewBox="75 10 310 310"');

// Remove BG rect
svg = svg.replace(/<g id="BG">[\s\S]*?<\/g>\s*/, '');

// Remove body groups by splitting on their <g id="..."> tags and
// tracking depth to find the matching closing </g>.
const removeIds = [
  '_x31_3._Legs',
  '_x31_2._Body',
  '_x31_1._Forearms_Right',
  '_x31_0._Forearm_Left',
  '_x39_._Hand_Right',
  '_x38_._Hand_Left',
];

for (const id of removeIds) {
  const marker = `id="${id}"`;
  const startIdx = svg.indexOf(marker);
  if (startIdx === -1) {
    console.log('WARN: not found:', id);
    continue;
  }

  // Walk back to the opening <g
  let gStart = svg.lastIndexOf('<g', startIdx);
  if (gStart === -1) continue;

  // Walk forward from gStart, counting <g> depth until we find the matching </g>
  let depth = 0;
  let i = gStart;
  let gEnd = -1;
  while (i < svg.length) {
    if (svg[i] === '<') {
      if (svg.substring(i, i + 2) === '<g') {
        depth++;
      } else if (svg.substring(i, i + 4) === '</g>') {
        depth--;
        if (depth === 0) {
          gEnd = i + 4;
          break;
        }
      }
    }
    i++;
  }

  if (gEnd === -1) {
    console.log('WARN: could not find closing </g> for', id);
    continue;
  }

  const removed = svg.substring(gStart, gEnd);
  svg = svg.substring(0, gStart) + svg.substring(gEnd);
  console.log(`removed ${id} (${removed.length} chars)`);
}

writeFileSync(OUT, svg);
console.log(`\nWrote ${OUT} (${(svg.length / 1024).toFixed(1)} KB)`);
