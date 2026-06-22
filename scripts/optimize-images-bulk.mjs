/**
 * Bulk image optimization pass.
 *
 * Two strategies:
 *   (A) RENAME + WEBP for the two oversize homepage backdrops that are
 *       referenced by hardcoded path. Source code refs for these are
 *       updated by hand alongside this script.
 *   (B) RE-ENCODE IN PLACE for bulk folders (hall-of-fame, golf-outing,
 *       social-connect, rental-space, ambassadors, staff). Preserves
 *       extensions/paths so we don't have to touch dozens of source
 *       references. next/image still serves WebP/AVIF at request time
 *       on top of the smaller source.
 *
 * Run: node scripts/optimize-images-bulk.mjs
 */

import sharp from "sharp";
import { stat, readdir, rename, unlink, access } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");

// ── Strategy A: rename + webp ─────────────────────────────────────────
const RENAMES = [
  {
    from: "images/photos/netowrking.png",
    to:   "images/photos/networking.webp",
    maxWidth: 1920,
    quality: 65, // ghosted at 0.05 opacity, doesn't need detail
  },
  {
    from: "images/photos/7f44d302-e587-4fc1-80c4-7e328329a6e1.png",
    to:   "images/photos/medina-chamber-headquarters-court-street.webp",
    maxWidth: 2000,
    quality: 78,
  },
];

// ── Strategy B: in-place JPEG re-encode ───────────────────────────────
const FOLDERS = [
  { dir: "images/people/hall-of-fame",     maxLong: 1200, q: 78 },
  { dir: "images/people/ambassadors",      maxLong: 1200, q: 78 },
  { dir: "images/people/staff",            maxLong: 1400, q: 80 },
  { dir: "images/events/golf-outing",      maxLong: 1600, q: 75 },
  { dir: "images/events/social-connect",   maxLong: 1600, q: 75 },
  { dir: "images/events/athena-awards",    maxLong: 1600, q: 75 },
  { dir: "images/programs/rental-space",   maxLong: 1600, q: 78 },
  { dir: "images/programs/compass",        maxLong: 1600, q: 78 },
  { dir: "images/programs/safety-council", maxLong: 1600, q: 78 },
  { dir: "images/membership",              maxLong: 1600, q: 78 },
  // Named hero photos used across the site (homepage, About, Programs):
  // higher max edge + slightly higher quality because they're often
  // the LCP element on their pages.
  { dir: "images/photos",                  maxLong: 2000, q: 80 },
  { dir: "images/about/advocacy",          maxLong: 1600, q: 78 },
];

const human = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(2)} MB`;
};

let totals = { before: 0, after: 0, processed: 0, skipped: 0 };

async function reencodeJpegInPlace(absPath, maxLong, quality) {
  const before = (await stat(absPath)).size;
  const meta = await sharp(absPath).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  const longEdge = Math.max(w, h);

  const tmp = `${absPath}.opt.tmp`;
  let pipe = sharp(absPath, { failOn: "none" }).rotate(); // honor EXIF

  if (longEdge > maxLong) {
    pipe = pipe.resize({
      width:  w >= h ? maxLong : null,
      height: h >  w ? maxLong : null,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  await pipe
    .jpeg({ quality, mozjpeg: true, progressive: true })
    .toFile(tmp);

  const afterSize = (await stat(tmp)).size;

  if (afterSize >= before) {
    await unlink(tmp); // no improvement, keep original
    totals.skipped++;
    return { before, after: before, replaced: false };
  }

  await rename(tmp, absPath); // atomic replace
  totals.before += before;
  totals.after  += afterSize;
  totals.processed++;
  return { before, after: afterSize, replaced: true };
}

async function processRename({ from, to, maxWidth, quality }) {
  const src = join(PUBLIC, from);
  const dst = join(PUBLIC, to);
  try { await access(src); } catch {
    console.log(`SKIP rename (source missing): ${from}`);
    return;
  }
  const before = (await stat(src)).size;
  const meta = await sharp(src).metadata();
  let pipe = sharp(src, { failOn: "none" });
  if ((meta.width || 0) > maxWidth) {
    pipe = pipe.resize({ width: maxWidth, withoutEnlargement: true });
  }
  await pipe
    .webp({ quality, effort: 5, smartSubsample: true })
    .toFile(dst);
  const after = (await stat(dst)).size;
  totals.before += before;
  totals.after  += after;
  totals.processed++;
  await unlink(src);
  const pct = (((before - after) / before) * 100).toFixed(0);
  console.log(`  RENAMED ${from}\n           → ${to}  ${human(before)} → ${human(after)} (-${pct}%)`);
}

async function walkAndReencode({ dir, maxLong, q }) {
  const abs = join(PUBLIC, dir);
  let entries;
  try {
    entries = await readdir(abs, { withFileTypes: true });
  } catch {
    console.log(`  SKIP folder (missing): ${dir}`);
    return;
  }
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const ext = extname(ent.name).toLowerCase();
    if (ext !== ".jpg" && ext !== ".jpeg") continue;
    const full = join(abs, ent.name);
    try {
      const r = await reencodeJpegInPlace(full, maxLong, q);
      const rel = join(dir, ent.name).replace(/\\/g, "/");
      if (r.replaced) {
        const pct = (((r.before - r.after) / r.before) * 100).toFixed(0);
        console.log(
          `  ${rel.padEnd(78)} ${human(r.before).padStart(9)} → ${human(r.after).padStart(9)} (-${pct}%)`
        );
      } else {
        console.log(`  SKIP (already optimal): ${rel}`);
      }
    } catch (err) {
      console.error(`  ERROR ${ent.name}: ${err.message}`);
    }
  }
}

(async () => {
  console.log("─── Strategy A: rename + webp ─────────────────────────");
  for (const r of RENAMES) await processRename(r);

  console.log("\n─── Strategy B: in-place re-encode ────────────────────");
  for (const f of FOLDERS) {
    console.log(`\n[${f.dir}] (max ${f.maxLong}px, q${f.q})`);
    await walkAndReencode(f);
  }

  console.log("\n─── Summary ───────────────────────────────────────────");
  console.log(`Processed: ${totals.processed} files`);
  console.log(`Skipped (already optimal): ${totals.skipped} files`);
  console.log(`Before: ${human(totals.before)}`);
  console.log(`After:  ${human(totals.after)}`);
  if (totals.before > 0) {
    const pct = (((totals.before - totals.after) / totals.before) * 100).toFixed(1);
    console.log(`Saved:  ${human(totals.before - totals.after)} (-${pct}%)`);
  }
})();
