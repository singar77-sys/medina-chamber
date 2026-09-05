/**
 * CI image-size guard — fails if a NEW/CHANGED raster image added in the diff
 * is too many BYTES or too many PIXELS. SVG is exempt (vector, no raster cost).
 *
 * Rationale: 168 MB of git-tracked images used to ship in every deploy. After
 * the asset-diet sweep we want to keep it from creeping back — an unoptimized
 * 3 MB PNG dropped into public/ is exactly the regression this catches.
 *
 * WebP and AVIF are covered too (they were not, until 2026-09-05). Exempting
 * them confused the FORMAT with the WORK: converting a 6000x4000 camera frame
 * to WebP without resizing it still produces a megabyte-plus file. 75 tracked
 * .webp files were already over the byte limit when this check was widened —
 * they are grandfathered in the allowlist, and re-encoding them is the real fix.
 *
 * Two limits, because compression does not bound dimensions:
 *   - MAX_BYTES      what the visitor downloads.
 *   - MAX_DIMENSION  what the visitor's browser has to decode. A heavily
 *                    compressed 6000x4000 image can slip under the byte limit
 *                    and still cost ~24M pixels of decode memory on a phone.
 *
 * How it works:
 *   1. Diff changed files against a base ref (added/copied/modified only).
 *   2. Keep raster images under version control that still exist on disk.
 *   3. Flag any over MAX_BYTES or MAX_DIMENSION that isn't on the allowlist.
 *
 * Base ref resolution:
 *   - $BASE_REF                (explicit override / GitHub Actions passes this;
 *                               HEAD~1 if it names no commit here, e.g. the
 *                               all-zero SHA of a branch's first push)
 *   - origin/main              (no BASE_REF: typical local/PR base)
 *   - the repo's first commit  (fallback: check the whole tree)
 *
 * A guard that cannot see the diff must not report green: an unusable base ref
 * or a failing git command exits non-zero instead of silently finding nothing.
 *
 * Allowlist: scripts/image-size-allowlist.txt — one repo-relative path per
 * line, '#' comments allowed (whole-line or trailing). An entry exempts that
 * path from BOTH limits. Use sparingly: for a genuinely-needed large raster (a
 * print-res or source-quality brand asset), or to grandfather pre-existing debt
 * that must not turn CI red today. Prefer resizing and re-encoding instead.
 *
 * Dimensions are read with sharp (already a runtime dependency). CI installs
 * before running this, so it is always available; if it ever is not, the guard
 * fails rather than silently skipping the pixel check.
 *
 * Run locally:  node scripts/check-image-sizes.mjs
 * In CI:        BASE_REF=origin/main node scripts/check-image-sizes.mjs
 */

import { execSync } from "node:child_process";
import { readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAX_BYTES = 500 * 1024; // 500 KB
// 3000 px on the long edge. The largest image this site actually serves is a
// 1920px hero, so 3000 leaves generous headroom (a 1500px slot at 2x DPR) while
// any straight-off-the-camera frame (4000px+ on the long edge) trips it. The
// handful of legitimately larger source assets — 4020px brand wordmarks, the
// 4000px tagline lockup — are listed in the allowlist, which is what it is for.
const MAX_DIMENSION = 3000;
const RASTER_RE = /\.(jpe?g|png|webp|avif)$/i;
const ALLOWLIST_PATH = join(ROOT, "scripts", "image-size-allowlist.txt");

function sh(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function trySh(cmd) {
  try {
    return sh(cmd);
  } catch {
    return null;
  }
}

function shOrDie(cmd, hint) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (err) {
    console.error(`✗ image-size guard: ${hint}`);
    console.error(`  ${cmd}`);
    console.error(String(err.stderr || err.message).trim());
    process.exit(1);
  }
}

function resolveBaseRef() {
  const requested = process.env.BASE_REF?.trim();
  if (requested) {
    // GitHub sends an all-zero SHA as `github.event.before` on a branch's
    // first push, and a shallow clone may not carry the ref at all. Either
    // way the previous commit is the honest base — diffing against something
    // unresolvable would just report "no changed files" and pass.
    // Quote the revision: execSync shells out through cmd.exe on Windows,
    // where a bare ^ is the escape character and would eat the ^{commit}.
    if (!/^0+$/.test(requested) && trySh(`git rev-parse --verify "${requested}^{commit}"`)) {
      return requested;
    }
    console.warn(`! BASE_REF "${requested}" names no commit here — using HEAD~1.`);
    if (trySh("git rev-parse --verify HEAD~1")) return "HEAD~1";
    // No HEAD~1 either (a true first commit). Diffing HEAD against HEAD is
    // empty and would exit 0 with a green tick, i.e. a guard that reports
    // success precisely because it cannot see anything. Fail instead.
    console.error("✗ image-size guard: no usable base ref (no HEAD~1 to fall back to).");
    process.exit(1);
  }
  if (trySh("git rev-parse --verify origin/main")) return "origin/main";
  // Fallback: the repo's first commit → diff shows the entire committed tree.
  return trySh("git rev-list --max-parents=0 HEAD") || "HEAD";
}

function loadAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) return new Set();
  return new Set(
    readFileSync(ALLOWLIST_PATH, "utf8")
      .split("\n")
      // Trailing '#' comments are stripped too, so a grandfathered entry can
      // carry its recorded size inline without breaking the path match.
      .map((l) => l.split("#")[0].trim())
      .filter(Boolean),
  );
}

// sharp is a runtime dependency, so CI has it after `pnpm install`. Imported
// lazily: it is only needed once something actually has to be measured, and a
// top-level import would make the guard unusable on a tree with no
// node_modules even when nothing changed.
let sharpModule;
async function dimensionsOf(abs) {
  if (!sharpModule) {
    try {
      sharpModule = (await import("sharp")).default;
    } catch (err) {
      // Do not skip the check. A guard that reports green because it could not
      // look is the exact failure mode this file is written to avoid.
      console.error("✗ image-size guard: could not load sharp to read image dimensions.");
      console.error("  Run `pnpm install` first (sharp is a dependency), then re-run.");
      console.error(String(err.message).trim());
      process.exit(1);
    }
  }
  const { width, height } = await sharpModule(abs).metadata();
  return { width: width ?? 0, height: height ?? 0 };
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

async function main() {
  const base = resolveBaseRef();
  const allowlist = loadAllowlist();

  // Added / Copied / Modified files only — deletions and renames-away can't
  // introduce an oversized asset.
  const diff = shOrDie(
    `git diff --name-only --diff-filter=ACM ${base}...HEAD`,
    `could not diff ${base}...HEAD`,
  );
  const changed = diff ? diff.split("\n").filter(Boolean) : [];

  const offenders = [];
  for (const rel of changed) {
    if (!RASTER_RE.test(rel)) continue;
    if (allowlist.has(rel)) continue;
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) continue; // deleted/renamed after the diff snapshot

    const size = statSync(abs).size;
    const { width, height } = await dimensionsOf(abs);
    const longEdge = Math.max(width, height);

    const reasons = [];
    if (size > MAX_BYTES) reasons.push(`${kb(size)} — over the ${kb(MAX_BYTES)} byte limit`);
    if (longEdge > MAX_DIMENSION) {
      reasons.push(`${width}x${height} — long edge ${longEdge}px over the ${MAX_DIMENSION}px limit`);
    }
    if (reasons.length) offenders.push({ rel, size, reasons });
  }

  if (offenders.length === 0) {
    console.log(
      `✓ image-size guard: no raster image over ${kb(MAX_BYTES)} or ${MAX_DIMENSION}px ` +
        `(base: ${base}, ${changed.length} changed file(s))`,
    );
    return;
  }

  offenders.sort((a, b) => b.size - a.size);
  console.error(`✗ image-size guard: ${offenders.length} raster image(s) over the limits:\n`);
  for (const o of offenders) {
    console.error(`  ${o.rel}`);
    for (const r of o.reasons) console.error(`      ${r}`);
  }
  console.error(
    "\nThe fix is almost always RESIZE first, then re-encode — the format alone\n" +
      "bounds nothing: a full-frame camera photo saved as WebP is still a\n" +
      "megabyte. sharp is a dependency, so a few lines of script will do it:\n" +
      "  sharp(src).resize({ width: 1920, withoutEnlargement: true })\n" +
      "            .webp({ quality: 82 }).toFile(dest)\n" +
      "\nIf this large raster is genuinely required (a print-res or source-quality\n" +
      "brand asset), add its path to scripts/image-size-allowlist.txt with a\n" +
      "one-line justification comment.",
  );
  process.exit(1);
}

await main();
