/**
 * Bulk filename SEO cleanup.
 *
 * For each entry in RENAMES:
 *   1. Rename the file in public/images/
 *   2. Search-and-replace every reference in src/ and scripts/ data files
 *
 * Run dry: node scripts/rename-images-bulk.mjs --dry
 * Run for real: node scripts/rename-images-bulk.mjs
 */

import { readdir, stat, rename, readFile, writeFile, access } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const DRY = process.argv.includes("--dry");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");

// Map: old path (relative to public/) → new path (relative to public/)
// Goal: strip filler tokens (-jpg-, -jpeg-, -png-, -copy-, -copy-copy-,
// -amp-, -image-), drop meaningless numeric prefixes, replace HTML
// entity garbage (-amp- → -and-), and put SEO keywords up front.
const RENAMES = {
  // ── about/advocacy ───────────────────────────────────────────
  "images/about/advocacy/county-amp-regional-resources-medina-chamber.jpg":
    "images/about/advocacy/county-and-regional-resources-medina-chamber.jpg",
  "images/about/advocacy/local-amp-regional-gov-affairs-copy-copy-medina-chamber.jpg":
    "images/about/advocacy/local-and-regional-government-affairs-medina-chamber.jpg",
  "images/about/advocacy/state-amp-fed-gov-affairs-copy-copy-medina-chamber.jpg":
    "images/about/advocacy/state-and-federal-government-affairs-medina-chamber.jpg",
  "images/about/advocacy/medinachamber-283-jpg-medina-chamber.jpg":
    "images/about/advocacy/medina-chamber-advocacy-photo.jpg",

  // ── events/athena-awards ─────────────────────────────────────
  "images/events/athena-awards/athena-awards-image-04-medina-chamber.jpg":
    "images/events/athena-awards/athena-awards-04-medina-chamber.jpg",
  "images/events/athena-awards/athena-awards-image-05-medina-chamber.jpg":
    "images/events/athena-awards/athena-awards-05-medina-chamber.jpg",
  "images/events/athena-awards/athena-awards-image-06-medina-chamber.jpg":
    "images/events/athena-awards/athena-awards-06-medina-chamber.jpg",

  // ── events/golf-outing — sequential keyword-loaded rename ────
  "images/events/golf-outing/20250721-110245-jpg-medina-chamber.jpg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-01.jpg",
  "images/events/golf-outing/20250721-115800-jpg-medina-chamber.jpg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-02.jpg",
  "images/events/golf-outing/20250721-124521-jpg-medina-chamber.jpg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-03.jpg",
  "images/events/golf-outing/20250721-133455-jpg-medina-chamber.jpg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-04.jpg",
  "images/events/golf-outing/20250721-142501-jpg-medina-chamber.jpg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-05.jpg",
  "images/events/golf-outing/20250721-150501-jpg-medina-chamber.jpg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-06.jpg",
  "images/events/golf-outing/4097145734346118161-jpeg-medina-chamber.jpeg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-07.jpeg",
  "images/events/golf-outing/fullsizerender-2-jpeg-medina-chamber.jpeg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-08.jpeg",
  "images/events/golf-outing/fullsizerender-3-jpeg-medina-chamber.jpeg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-09.jpeg",
  "images/events/golf-outing/fullsizerender-4-jpeg-medina-chamber.jpeg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-10.jpeg",
  "images/events/golf-outing/fullsizerender-5-jpeg-medina-chamber.jpeg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-11.jpeg",
  "images/events/golf-outing/fullsizerender-6-jpeg-medina-chamber.jpeg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-12.jpeg",
  "images/events/golf-outing/fullsizerender-7-jpeg-medina-chamber.jpeg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-13.jpeg",
  "images/events/golf-outing/fullsizerender-8-jpeg-medina-chamber.jpeg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-14.jpeg",
  "images/events/golf-outing/fullsizerender-9-jpeg-medina-chamber.jpeg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-15.jpeg",
  "images/events/golf-outing/golf-outing-image-03-medina-chamber.jpg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-16.jpg",
  "images/events/golf-outing/img-1886-jpeg-medina-chamber.jpeg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-17.jpeg",
  "images/events/golf-outing/img-1908-jpeg-medina-chamber.jpeg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-18.jpeg",
  "images/events/golf-outing/img-8896-jpeg-medina-chamber.jpeg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-19.jpeg",
  "images/events/golf-outing/img-8903-jpg-medina-chamber.jpg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-20.jpg",
  "images/events/golf-outing/img-8907-jpeg-medina-chamber.jpeg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-21.jpeg",
  "images/events/golf-outing/img-8924-jpeg-medina-chamber.jpeg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-22.jpeg",
  "images/events/golf-outing/img-8942-jpeg-medina-chamber.jpeg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-23.jpeg",
  "images/events/golf-outing/img-9089-jpg-medina-chamber.jpg":
    "images/events/golf-outing/medina-chamber-annual-golf-outing-24.jpg",

  // ── events/social-connect — strip "-image-" filler ───────────
  "images/events/social-connect/social-connect-image-03-medina-chamber.jpg":
    "images/events/social-connect/social-connect-03-medina-chamber.jpg",
  "images/events/social-connect/social-connect-image-05-medina-chamber.jpg":
    "images/events/social-connect/social-connect-05-medina-chamber.jpg",
  "images/events/social-connect/social-connect-image-06-medina-chamber.jpg":
    "images/events/social-connect/social-connect-06-medina-chamber.jpg",
  "images/events/social-connect/social-connect-image-07-medina-chamber.jpg":
    "images/events/social-connect/social-connect-07-medina-chamber.jpg",
  "images/events/social-connect/social-connect-image-08-medina-chamber.jpeg":
    "images/events/social-connect/social-connect-08-medina-chamber.jpeg",
  "images/events/social-connect/social-connect-image-09-medina-chamber.jpg":
    "images/events/social-connect/social-connect-09-medina-chamber.jpg",
  "images/events/social-connect/social-connect-image-10-medina-chamber.jpg":
    "images/events/social-connect/social-connect-10-medina-chamber.jpg",
  "images/events/social-connect/social-connect-image-207-medina-chamber.jpg":
    "images/events/social-connect/social-connect-207-medina-chamber.jpg",
  "images/events/social-connect/social-connect-image-208-medina-chamber.jpg":
    "images/events/social-connect/social-connect-208-medina-chamber.jpg",
  "images/events/social-connect/social-connect-image-209-medina-chamber.jpg":
    "images/events/social-connect/social-connect-209-medina-chamber.jpg",

  // ── membership ───────────────────────────────────────────────
  "images/membership/certificatesoforigin-jpg-medina-chamber.jpg":
    "images/membership/certificates-of-origin-medina-chamber.jpg",
  "images/membership/medinachamber-189-jpg-medina-chamber.jpg":
    "images/membership/medina-chamber-membership-photo.jpg",
  "images/membership/member-benefits-image-03-medina-chamber.jpg":
    "images/membership/member-benefits-03-medina-chamber.jpg",
  "images/membership/member-benefits-image-04-medina-chamber.png":
    "images/membership/member-benefits-04-medina-chamber.png",
  "images/membership/member-benefits-image-05-medina-chamber.png":
    "images/membership/member-benefits-05-medina-chamber.png",
  "images/membership/member-benefits-image-06-medina-chamber.png":
    "images/membership/member-benefits-06-medina-chamber.png",
  "images/membership/member-benefits-image-07-medina-chamber.png":
    "images/membership/member-benefits-07-medina-chamber.png",
  "images/membership/member-benefits-image-08-medina-chamber.png":
    "images/membership/member-benefits-08-medina-chamber.png",
  "images/membership/pricing-image-03-medina-chamber.jpg":
    "images/membership/membership-pricing-medina-chamber.jpg",

  // ── people/ambassadors ───────────────────────────────────────
  "images/people/ambassadors/don-hicks-jpg-medina-chamber.jpg":
    "images/people/ambassadors/don-hicks-medina-chamber-ambassador.jpg",
  "images/people/ambassadors/tania-grant-jpg-medina-chamber.jpg":
    "images/people/ambassadors/tania-grant-medina-chamber-ambassador.jpg",
  "images/people/ambassadors/tori-toth-jpeg-medina-chamber.jpeg":
    "images/people/ambassadors/tori-toth-medina-chamber-ambassador.jpeg",
  "images/people/ambassadors/ambassadors-image-03-medina-chamber.jpg":
    "images/people/ambassadors/medina-chamber-ambassador-03.jpg",
  "images/people/ambassadors/ambassadors-image-08-medina-chamber.jpg":
    "images/people/ambassadors/medina-chamber-ambassador-08.jpg",
  "images/people/ambassadors/ambassadors-image-13-medina-chamber.jpg":
    "images/people/ambassadors/medina-chamber-ambassador-13.jpg",

  // ── programs/compass ─────────────────────────────────────────
  "images/programs/compass/compass-image-03-medina-chamber.jpg":
    "images/programs/compass/compass-program-03-medina-chamber.jpg",
  "images/programs/compass/compass-image-04-medina-chamber.jpg":
    "images/programs/compass/compass-program-04-medina-chamber.jpg",
  "images/programs/compass/compass-image-05-medina-chamber.png":
    "images/programs/compass/compass-program-05-medina-chamber.png",

  // ── programs/rental-space ────────────────────────────────────
  "images/programs/rental-space/rental-space-image-03-medina-chamber.jpg":
    "images/programs/rental-space/rental-space-03-medina-chamber.jpg",
  "images/programs/rental-space/rental-space-image-04-medina-chamber.jpg":
    "images/programs/rental-space/rental-space-04-medina-chamber.jpg",
  "images/programs/rental-space/rental-space-image-05-medina-chamber.png":
    "images/programs/rental-space/rental-space-05-medina-chamber.png",
  "images/programs/rental-space/rental-space-image-06-medina-chamber.jpg":
    "images/programs/rental-space/rental-space-06-medina-chamber.jpg",
  "images/programs/rental-space/rental-space-image-07-medina-chamber.png":
    "images/programs/rental-space/rental-space-07-medina-chamber.png",
  "images/programs/rental-space/rental-space-image-08-medina-chamber.jpg":
    "images/programs/rental-space/rental-space-08-medina-chamber.jpg",

  // ── programs/safety-council ──────────────────────────────────
  "images/programs/safety-council/bwc-new-logo-jpg-copy-medina-chamber.jpg":
    "images/programs/safety-council/bwc-medina-chamber-safety-council-logo.jpg",
  "images/programs/safety-council/full-lockup-greenpng-png-copy-medina-chamber.png":
    "images/programs/safety-council/bwc-medina-chamber-safety-council-full-lockup.png",
  "images/programs/safety-council/safety-council-image-03-medina-chamber.jpg":
    "images/programs/safety-council/safety-council-03-medina-chamber.jpg",
  "images/programs/safety-council/safety-council-image-04-medina-chamber.jpg":
    "images/programs/safety-council/safety-council-04-medina-chamber.jpg",
};

// ── Source files to scan for old paths ────────────────────────
const SCAN_DIRS = [
  join(ROOT, "src"),
  join(ROOT, "scripts"),
];
const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md"]);

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch { return; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      yield* walk(full);
    } else if (SCAN_EXTS.has(extname(e.name).toLowerCase())) {
      yield full;
    }
  }
}

async function main() {
  console.log(`${DRY ? "[DRY RUN] " : ""}Renaming ${Object.keys(RENAMES).length} files\n`);

  // ── Step 1: rename files ──
  let renamed = 0;
  let missing = 0;
  for (const [oldRel, newRel] of Object.entries(RENAMES)) {
    const oldAbs = join(PUBLIC, oldRel);
    const newAbs = join(PUBLIC, newRel);
    try {
      await access(oldAbs);
    } catch {
      console.log(`  MISSING: ${oldRel}`);
      missing++;
      continue;
    }
    try {
      await access(newAbs);
      console.log(`  COLLISION (target exists): ${newRel}`);
      continue;
    } catch { /* good — target doesn't exist */ }

    if (!DRY) await rename(oldAbs, newAbs);
    console.log(`  ${oldRel}\n    → ${newRel}`);
    renamed++;
  }
  console.log(`\nFiles ${DRY ? "would-be " : ""}renamed: ${renamed}`);
  if (missing) console.log(`Files missing (already renamed?): ${missing}`);

  // ── Step 2: update source references ──
  console.log("\nScanning source files for old paths…");
  // Build search-with-leading-slash form (how Image src is written)
  const searchMap = new Map(
    Object.entries(RENAMES).map(([o, n]) => [`/${o}`, `/${n}`])
  );

  let filesTouched = 0;
  let totalReplacements = 0;
  for (const dir of SCAN_DIRS) {
    for await (const file of walk(dir)) {
      let content = await readFile(file, "utf8");
      let changed = false;
      let count = 0;
      for (const [oldPath, newPath] of searchMap) {
        if (content.includes(oldPath)) {
          const before = content.length;
          content = content.split(oldPath).join(newPath);
          const occurrences = (before - content.length + newPath.length - oldPath.length === 0)
            ? 0
            : Math.round((before - content.length) / (oldPath.length - newPath.length || 1));
          // Simpler counting:
          const re = new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
          // NOTE: content already mutated. Re-derive count from a clean recount.
          // Cheap approach: count old in original file by re-reading.
          changed = true;
          count++;
        }
      }
      if (changed) {
        if (!DRY) await writeFile(file, content, "utf8");
        const rel = file.replace(ROOT, "").replace(/\\/g, "/");
        console.log(`  ${DRY ? "[would update]" : "updated"} ${rel} (${count} pattern${count === 1 ? "" : "s"})`);
        filesTouched++;
        totalReplacements += count;
      }
    }
  }
  console.log(`\nSource files ${DRY ? "would be " : ""}touched: ${filesTouched}`);
  console.log(`Total old-path occurrences ${DRY ? "would be " : ""}rewritten: ${totalReplacements}`);

  if (DRY) console.log("\nDRY RUN — no changes written. Re-run without --dry to apply.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
