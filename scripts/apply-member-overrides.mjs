/**
 * Re-apply src/data/member-overrides.json onto src/data/members.json.
 *
 * The scraper already calls this enrichment at the end of every run, so
 * members.json is normally enriched on disk. Use this standalone script to
 * re-apply after editing member-overrides.json WITHOUT re-scraping, e.g.:
 *
 *   node scripts/apply-member-overrides.mjs
 *   node scripts/sync-vectors-to-upstash.mjs   # rebuild the search index
 *
 * Idempotent: running twice is a no-op the second time.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { applyMemberOverrides } from "./lib-member-overrides.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const MEMBERS_FILE = join(__dir, "..", "src", "data", "members.json");

const data = JSON.parse(readFileSync(MEMBERS_FILE, "utf8"));
const members = data.members ?? data;

const report = applyMemberOverrides(members);

if (report.length) {
  writeFileSync(MEMBERS_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`✅ Applied ${report.length} member override(s):`);
  report.forEach((r) => console.log("   " + r));
} else {
  console.log("✅ No changes — members.json already reflects every override.");
}
