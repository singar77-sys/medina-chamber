/**
 * Image optimization script
 * Converts large photographic PNGs → JPEG (quality 85) and the henschel GIF → JPEG.
 * Logos (in /images/logos/) are skipped — they may have transparency.
 * Run: node scripts/optimize-images.mjs
 * Dry run: node scripts/optimize-images.mjs --dry
 */

import sharp from "sharp";
import { readdir, stat, rename, rm, readFile, writeFile } from "fs/promises";
import { join, dirname, basename, extname } from "path";
import { fileURLToPath } from "url";

const DRY = process.argv.includes("--dry");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_IMAGES = join(ROOT, "public/images");

// Directories to skip entirely (logos use transparency)
const SKIP_DIRS = ["logos"];

// Minimum file size (bytes) to bother converting — skip tiny files
const MIN_SIZE = 150_000;

async function* walkFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.includes(entry.name)) continue;
      yield* walkFiles(full);
    } else {
      yield full;
    }
  }
}

function jpegPath(p) {
  return p.replace(/\.(png|gif)$/i, ".jpg");
}

async function main() {
  const candidates = [];

  for await (const file of walkFiles(PUBLIC_IMAGES)) {
    const ext = extname(file).toLowerCase();
    if (ext !== ".png" && ext !== ".gif") continue;
    const { size } = await stat(file);
    if (size < MIN_SIZE) continue;
    candidates.push({ file, size });
  }

  // Sort largest first
  candidates.sort((a, b) => b.size - a.size);

  let totalSaved = 0;

  for (const { file, size } of candidates) {
    const out = jpegPath(file);
    if (!DRY) {
      try {
        await sharp(file).jpeg({ quality: 85, progressive: true }).toFile(out);
      } catch (err) {
        console.error(`  ERROR converting ${file}: ${err.message}`);
        continue;
      }
    }

    const outSize = DRY ? 0 : (await stat(out)).size;
    const saved = DRY ? size * 0.75 : size - outSize; // estimate in dry mode
    totalSaved += saved;

    const rel = file.replace(PUBLIC_IMAGES, "").replace(/\\/g, "/");
    const relOut = out.replace(PUBLIC_IMAGES, "").replace(/\\/g, "/");
    const pct = Math.round((saved / size) * 100);
    console.log(
      `${DRY ? "[dry]" : "     "} ${rel}\n` +
      `       → ${relOut}  ${(size / 1024).toFixed(0)}KB → ${DRY ? "~" : ""}${((size - saved) / 1024).toFixed(0)}KB  (−${pct}%)`
    );

    if (!DRY) {
      await rm(file);
      console.log(`       deleted original PNG/GIF`);
    }
  }

  console.log(
    `\n${DRY ? "Estimated" : "Total"} savings: ${(totalSaved / 1024 / 1024).toFixed(1)} MB across ${candidates.length} files`
  );

  if (!DRY) {
    console.log("\nDone. Verify the images look correct, then update any .png/.gif references in source files.");
    await updateSourceRefs(candidates.map((c) => c.file));
  }
}

async function updateSourceRefs(convertedFiles) {
  const SRC = join(ROOT, "src");
  const DATA = join(ROOT, "src/data");

  // Build a mapping of old path → new path (relative to public/)
  const mapping = new Map(
    convertedFiles.map((f) => {
      const rel = f.replace(join(ROOT, "public"), "").replace(/\\/g, "/");
      return [rel, rel.replace(/\.(png|gif)$/i, ".jpg")];
    })
  );

  async function* walkSrc(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        yield* walkSrc(full);
      } else if (/\.(ts|tsx|json)$/.test(entry.name)) {
        yield full;
      }
    }
  }

  let filesUpdated = 0;
  for await (const srcFile of walkSrc(SRC)) {
    let content = await readFile(srcFile, "utf8");
    let changed = false;
    for (const [oldPath, newPath] of mapping) {
      if (content.includes(oldPath)) {
        content = content.replaceAll(oldPath, newPath);
        changed = true;
      }
    }
    if (changed) {
      await writeFile(srcFile, content, "utf8");
      console.log(`  updated refs in ${srcFile.replace(ROOT, "")}`);
      filesUpdated++;
    }
  }
  console.log(`Updated ${filesUpdated} source file(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
