/**
 * One-off asset-diet conversion — the two oversized photographic event-graphic
 * source assets that still shipped as raw PNG/JPEG.
 *
 *   networking-people.png  (1536×1024, 2.7 MB)  → networking-people.webp
 *   get-to-know.jpg        (2048×1536, 1.0 MB)  → get-to-know.webp
 *
 * Both are used only as `ASSETS.networkingPeople` / `ASSETS.getToKnow` in
 * src/components/events/graphics/shared.ts, rendered inside 1200×630 /
 * 1080×1080 / 1080×1920 social-export canvases. A 1600px long edge is ample
 * for those canvases at retina, so we cap there and encode WebP q82 — the same
 * sweet spot the top-8 photo pipeline uses (see process-top-8-photos.mjs).
 *
 * Metadata is stripped (EXIF can carry GPS/camera serial). `.rotate()` bakes
 * any EXIF orientation before stripping so nothing flips.
 *
 * NOTE: public/images/events/ is gitignored, so the emitted .webp files must be
 * force-added (`git add -f`). This script only writes to disk; git staging and
 * the removal of the originals are done by the caller.
 *
 * Run:      node scripts/convert-event-heroes-webp.mjs
 * Dry run:  node scripts/convert-event-heroes-webp.mjs --dry
 */

import sharp from "sharp";
import { stat } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const DRY = process.argv.includes("--dry");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const MAX_EDGE = 1600;
const QUALITY = 82;

const JOBS = [
  { in: "public/images/events/networking-people.png", out: "public/images/events/networking-people.webp" },
  { in: "public/images/events/get-to-know.jpg",       out: "public/images/events/get-to-know.webp" },
];

function kb(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

async function main() {
  for (const job of JOBS) {
    const srcPath = join(ROOT, job.in);
    const outPath = join(ROOT, job.out);

    const before = (await stat(srcPath)).size;
    const meta = await sharp(srcPath).metadata();

    if (DRY) {
      console.log(`[dry] ${job.in} (${meta.width}×${meta.height}, ${kb(before)}) → ${job.out}`);
      continue;
    }

    await sharp(srcPath)
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outPath);

    const after = (await stat(outPath)).size;
    const out = await sharp(outPath).metadata();
    console.log(
      `${job.in} (${meta.width}×${meta.height}, ${kb(before)}) → ` +
        `${job.out} (${out.width}×${out.height}, ${kb(after)})  ` +
        `−${Math.round((1 - after / before) * 100)}%`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
