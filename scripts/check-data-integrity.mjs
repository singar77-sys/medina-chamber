/**
 * Data integrity check — runs as a prebuild guardrail.
 *
 * The site bundles two coupled data files:
 *   - src/data/members.json          — directory source of truth
 *   - src/data/member-embeddings.json — vectors used by /api/search
 *
 * If a member is added/removed but embeddings aren't regenerated, the new
 * member becomes invisible to ChamberBot's semantic search forever — silent
 * failure, no error logged, just confused users. This check fails the build
 * loudly so the desync is caught before deploy.
 *
 * Run manually:  node scripts/check-data-integrity.mjs
 * Run via npm:   npm run check:data
 */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MEMBERS_FILE = join(ROOT, "src/data/members.json");
const EMBEDDINGS_FILE = join(ROOT, "src/data/member-embeddings.json");

const REGEN_CMD = "node scripts/generate-member-embeddings.mjs";

function bail(msg) {
  console.error("\n❌ DATA INTEGRITY CHECK FAILED\n");
  console.error(msg);
  console.error(`\nFix: regenerate embeddings → ${REGEN_CMD}\n`);
  process.exit(1);
}

const [membersRaw, embRaw] = await Promise.all([
  readFile(MEMBERS_FILE, "utf8"),
  readFile(EMBEDDINGS_FILE, "utf8"),
]);

const members = JSON.parse(membersRaw).members;
const embeddings = JSON.parse(embRaw).embeddings;

if (!Array.isArray(members) || !Array.isArray(embeddings)) {
  bail("Could not find members[] or embeddings[] arrays in source files.");
}

// 1. Count parity — fast structural check
if (members.length !== embeddings.length) {
  bail(
    `Count mismatch: ${members.length} members in members.json, ` +
    `${embeddings.length} vectors in member-embeddings.json.`
  );
}

// 2. Slug parity — every member.chamberSlug must have a matching embedding.slug.
//    Catches the case where the counts coincidentally match but the actual
//    members differ (someone removed one, added another, didn't regenerate).
const memberSlugs = new Set(members.map((m) => m.chamberSlug));
const embeddingSlugs = new Set(embeddings.map((e) => e.slug));

const missingFromEmbeddings = [...memberSlugs].filter((s) => !embeddingSlugs.has(s));
const orphanEmbeddings = [...embeddingSlugs].filter((s) => !memberSlugs.has(s));

if (missingFromEmbeddings.length > 0 || orphanEmbeddings.length > 0) {
  const lines = [];
  if (missingFromEmbeddings.length > 0) {
    lines.push(
      `Members without embeddings (${missingFromEmbeddings.length}):\n  - ` +
      missingFromEmbeddings.slice(0, 10).join("\n  - ") +
      (missingFromEmbeddings.length > 10 ? `\n  …and ${missingFromEmbeddings.length - 10} more` : "")
    );
  }
  if (orphanEmbeddings.length > 0) {
    lines.push(
      `Orphan embeddings (member removed but vector retained, ${orphanEmbeddings.length}):\n  - ` +
      orphanEmbeddings.slice(0, 10).join("\n  - ") +
      (orphanEmbeddings.length > 10 ? `\n  …and ${orphanEmbeddings.length - 10} more` : "")
    );
  }
  bail(lines.join("\n\n"));
}

console.log(
  `✓ Data integrity OK — ${members.length} members ↔ ${embeddings.length} embeddings, all slugs match.`
);
