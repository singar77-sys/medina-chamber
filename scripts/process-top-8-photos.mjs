/**
 * Top-8 photo processor — drop raw photos in, get web-ready top-8 grid output.
 *
 * Pipeline per photo:
 *   1. Bake in EXIF orientation (`.rotate()` reads the tag, applies the rotation,
 *      and strips it — portrait-shot iPhone photos end up actually portrait on
 *      disk rather than landscape-with-orientation-tag).
 *   2. Resize to max 1600px on the long edge (no enlargement). Top-8 grid tiles
 *      render at ~25vw → 1600px is plenty for retina at every breakpoint.
 *   3. Encode as WebP, quality 82. Quality 82 is the sweet spot on the perceptual
 *      curve for photographic content — below ~78 you see artifacts, above ~88
 *      file size balloons for negligible visual gain.
 *   4. Strip metadata. EXIF often contains GPS + camera serial — we don't want
 *      that public.
 *   5. Write to `public/images/photos/top-8/01.webp` … `08.webp` in alphabetical
 *      order of the source files (lexicographic sort, matches `static-media`'s
 *      `.sort()` order so display order is deterministic).
 *
 * The destination folder is cleared before write to keep things idempotent —
 * re-running with a fresh batch fully replaces the previous one. Falling back
 * to `photos/gallery` for fewer-than-4 photos is handled by `RecentPhotoStrip`,
 * not here.
 *
 * Portrait inputs: NOT a special case. The site's `RecentPhotoStrip` wraps
 * every tile in `aspect-[4/3] overflow-hidden` and uses `object-cover` on the
 * `<Image>`, so portrait photos get their top/bottom cropped to fit the
 * landscape tile. Keeping the source actually-portrait (after EXIF bake) means
 * the crop preserves the most subject material; CSS does the rest.
 *
 * Usage:
 *   node scripts/process-top-8-photos.mjs --src "C:/path/to/raw-photos"
 *   node scripts/process-top-8-photos.mjs --src ./tmp/top-8-raw
 *
 * Optional flags:
 *   --dry      Show what would happen; don't write anything.
 *   --quality  WebP quality 1-100 (default 82).
 *   --maxEdge  Long-edge max px (default 1600).
 */

import sharp from "sharp";
import { readdir, mkdir, rm, stat } from "fs/promises";
import { join, dirname, extname, resolve } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEST = join(ROOT, "public", "images", "photos", "top-8");

const ALLOWED_EXT = /\.(jpe?g|png|heic|heif|webp)$/i;
const MAX_COUNT = 8;

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

const SRC = arg("--src");
const DRY = process.argv.includes("--dry");
const QUALITY = Number(arg("--quality", 82));
const MAX_EDGE = Number(arg("--maxEdge", 1600));

if (!SRC) {
  console.error("Usage: node scripts/process-top-8-photos.mjs --src <path-to-raw-photos>");
  process.exit(1);
}

const srcAbs = resolve(SRC);

async function main() {
  const files = (await readdir(srcAbs))
    .filter((f) => ALLOWED_EXT.test(f))
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }))
    .slice(0, MAX_COUNT);

  if (files.length === 0) {
    console.error(`No image files found in ${srcAbs}`);
    process.exit(1);
  }

  console.log(`[top-8] Source: ${srcAbs}`);
  console.log(`[top-8] Found ${files.length} input photos (cap ${MAX_COUNT}).`);
  console.log(`[top-8] Destination: ${DEST}`);
  console.log(`[top-8] Settings: webp quality=${QUALITY}, max-edge=${MAX_EDGE}px`);
  if (DRY) console.log("[top-8] DRY RUN — no files written.\n");

  // Clear destination (idempotent re-runs)
  if (!DRY) {
    await rm(DEST, { recursive: true, force: true });
    await mkdir(DEST, { recursive: true });
  }

  for (let i = 0; i < files.length; i++) {
    const src = join(srcAbs, files[i]);
    const slot = String(i + 1).padStart(2, "0");
    const dst = join(DEST, `${slot}.webp`);

    const inMeta = await sharp(src).metadata();
    const inSize = (await stat(src)).size;

    if (DRY) {
      console.log(
        `[top-8] ${files[i]}  (${inMeta.width}x${inMeta.height}, orient=${inMeta.orientation ?? "-"}, ${(inSize / 1024 / 1024).toFixed(1)} MB) → ${slot}.webp`,
      );
      continue;
    }

    await sharp(src)
      .rotate() // bake EXIF orientation, strip the tag
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY, effort: 6 })
      .toFile(dst);

    const outMeta = await sharp(dst).metadata();
    const outSize = (await stat(dst)).size;
    const orient =
      outMeta.width > outMeta.height
        ? "landscape"
        : outMeta.height > outMeta.width
          ? "portrait"
          : "square";

    console.log(
      `[top-8] ${files[i].padEnd(20)} → ${slot}.webp  ${outMeta.width}x${outMeta.height} [${orient}]  ${(outSize / 1024).toFixed(0)} KB  (was ${(inSize / 1024 / 1024).toFixed(1)} MB)`,
    );
  }

  if (!DRY) {
    console.log(`\n[top-8] Done. ${files.length} photo${files.length === 1 ? "" : "s"} written to ${DEST}`);
    console.log("[top-8] Next: rebuild + redeploy to pick up the new top-8 in <RecentPhotoStrip />.");
  }
}

main().catch((err) => {
  console.error("[top-8] Error:", err);
  process.exit(1);
});
