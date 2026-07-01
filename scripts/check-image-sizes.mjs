/**
 * CI image-size guard — fails if a NEW/CHANGED raster image (jpg/jpeg/png)
 * added in the diff exceeds the size threshold. SVG and WebP/AVIF are exempt
 * (SVG is vector; WebP/AVIF are already the optimized targets we convert to).
 *
 * Rationale: 168 MB of git-tracked images used to ship in every deploy. After
 * the asset-diet sweep we want to keep it from creeping back — an unoptimized
 * 3 MB PNG dropped into public/ is exactly the regression this catches.
 *
 * How it works:
 *   1. Diff changed files against a base ref (added/copied/modified only).
 *   2. Keep .jpg/.jpeg/.png under version control that still exist on disk.
 *   3. Flag any over MAX_BYTES that isn't on the allowlist.
 *
 * Base ref resolution (first that works):
 *   - $BASE_REF                (explicit override / GitHub Actions passes this)
 *   - origin/main              (typical PR base)
 *   - the repo's first commit  (fallback: check the whole tree)
 *
 * Allowlist: scripts/image-size-allowlist.txt — one repo-relative path per
 * line, '#' comments allowed. Use sparingly for a genuinely-needed large
 * raster (e.g. a print-res asset). Prefer converting to WebP instead.
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
const RASTER_RE = /\.(jpe?g|png)$/i;
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

function resolveBaseRef() {
  if (process.env.BASE_REF) return process.env.BASE_REF;
  if (trySh("git rev-parse --verify origin/main")) return "origin/main";
  // Fallback: empty-tree hash → diff shows the entire committed tree.
  return trySh("git rev-list --max-parents=0 HEAD") || "HEAD";
}

function loadAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) return new Set();
  return new Set(
    readFileSync(ALLOWLIST_PATH, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#")),
  );
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function main() {
  const base = resolveBaseRef();
  const allowlist = loadAllowlist();

  // Added / Copied / Modified files only — deletions and renames-away can't
  // introduce an oversized asset.
  const diff = trySh(`git diff --name-only --diff-filter=ACM ${base}...HEAD`);
  const changed = diff ? diff.split("\n").filter(Boolean) : [];

  const offenders = [];
  for (const rel of changed) {
    if (!RASTER_RE.test(rel)) continue;
    if (allowlist.has(rel)) continue;
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) continue; // deleted/renamed after the diff snapshot
    const size = statSync(abs).size;
    if (size > MAX_BYTES) offenders.push({ rel, size });
  }

  if (offenders.length === 0) {
    console.log(`✓ image-size guard: no raster images over ${kb(MAX_BYTES)} (base: ${base})`);
    return;
  }

  offenders.sort((a, b) => b.size - a.size);
  console.error(`✗ image-size guard: ${offenders.length} raster image(s) exceed ${kb(MAX_BYTES)}:\n`);
  for (const o of offenders) {
    console.error(`  ${kb(o.size).padStart(9)}  ${o.rel}`);
  }
  console.error(
    "\nConvert to WebP/AVIF (see scripts/convert-event-heroes-webp.mjs for the pattern),\n" +
      "or, if this large raster is genuinely required, add its path to\n" +
      "scripts/image-size-allowlist.txt with a one-line justification comment.",
  );
  process.exit(1);
}

main();
