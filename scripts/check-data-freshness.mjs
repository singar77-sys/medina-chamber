/**
 * Data freshness gate for the weekly scrape.
 *
 * WHY THIS EXISTS
 * ---------------
 * src/data/member-ratings.json was generated 2026-06-14 and did not move again.
 * The Sept 6 weekly run behaved correctly on every count — the Google Places
 * lookup failed (billing is not enabled on the Cloud project), the scraper
 * refused to overwrite good data with nothing, the other datasets were scraped
 * and pushed, and the run went red. And then nothing happened, because the
 * custom email alert is skipped when its secrets are unset. One loud failure
 * three months ago left a dataset frozen while every other file kept refreshing.
 *
 * A failure is an event; staleness is a state. Alerting on the event alone means
 * a dataset only gets one chance to be noticed. This checks the STATE — the age
 * of the data on disk — so a file that has stopped moving fails the weekly run
 * every week until somebody fixes it.
 *
 * POLICY
 * ------
 * Every file below is rewritten by the weekly refresh, so a healthy one is at
 * most 7 days old. The threshold is 21 days: three consecutive missed
 * refreshes. One missed run is a blip (a rate limit, a slow source, a cancelled
 * job); three in a row is a broken pipeline.
 *
 * Stale data is ALERTED ON, not suppressed or hidden. Google star ratings are
 * slow-moving — a three-month-old 4.7 is still substantially true — and blanking
 * every member's rating because an ops credential lapsed would silently delete a
 * working feature over a problem the visitor did not cause. Ratings also surface
 * only inside ChamberBot's prompt context today, with no "as of" date attached
 * to falsify. If a rating ever becomes a dated public badge, revisit this and
 * label it there.
 *
 * Usage:
 *   node scripts/check-data-freshness.mjs              # exit 1 if anything is stale
 *   node scripts/check-data-freshness.mjs --warn-only  # report, always exit 0
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(__dir, "..", "src", "data");

/** Three consecutive missed weekly refreshes. */
export const STALE_AFTER_DAYS = 21;

export const FRESHNESS_POLICY = [
  { file: "members.json", maxAgeDays: STALE_AFTER_DAYS, source: "pnpm scrape" },
  { file: "member-websites.json", maxAgeDays: STALE_AFTER_DAYS, source: "pnpm scrape:websites" },
  { file: "member-ratings.json", maxAgeDays: STALE_AFTER_DAYS, source: "pnpm scrape:ratings" },
  { file: "blog.json", maxAgeDays: STALE_AFTER_DAYS, source: "pnpm scrape:blog" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days between generatedAt and now; null when the stamp is unusable. */
export function ageInDays(generatedAt, now) {
  const t = Date.parse(generatedAt ?? "");
  if (!Number.isFinite(t)) return null;
  return Math.floor((now.getTime() - t) / DAY_MS);
}

/**
 * Classify one dataset. Pure — the caller supplies the timestamp, so this is
 * testable without touching the real (and currently stale) data files.
 * status: "fresh" | "stale" | "unreadable"
 */
export function assess(entry, generatedAt, now) {
  const ageDays = ageInDays(generatedAt, now);
  if (ageDays === null) {
    return {
      file: entry.file,
      generatedAt: generatedAt ?? null,
      ageDays: null,
      status: "unreadable",
      message: `${entry.file}: no usable generatedAt timestamp — cannot tell whether this data is current.`,
    };
  }
  if (ageDays > entry.maxAgeDays) {
    return {
      file: entry.file,
      generatedAt,
      ageDays,
      status: "stale",
      message: `${entry.file}: ${ageDays} days old (limit ${entry.maxAgeDays}). Last generated ${generatedAt}. Regenerate with \`${entry.source}\`.`,
    };
  }
  return {
    file: entry.file,
    generatedAt,
    ageDays,
    status: "fresh",
    message: `${entry.file}: ${ageDays} days old.`,
  };
}

export function assessAll(policy, generatedAtByFile, now) {
  return policy.map((entry) => assess(entry, generatedAtByFile[entry.file], now));
}

export function formatReport(results) {
  const icon = { fresh: "✓", stale: "❌", unreadable: "❌" };
  const lines = results.map((r) => `${icon[r.status]} ${r.message}`);
  const bad = results.filter((r) => r.status !== "fresh");
  if (bad.length) {
    lines.push(
      "",
      `❌ ${bad.length} dataset(s) have stopped refreshing. Every weekly run will fail until they do.`,
    );
  }
  return lines.join("\n");
}

function readGeneratedAt(dir, file) {
  try {
    return JSON.parse(readFileSync(join(dir, file), "utf8")).generatedAt;
  } catch {
    return undefined;
  }
}

function main() {
  const warnOnly = process.argv.includes("--warn-only");
  const stamps = Object.fromEntries(
    FRESHNESS_POLICY.map((e) => [e.file, readGeneratedAt(DATA_DIR, e.file)]),
  );
  const results = assessAll(FRESHNESS_POLICY, stamps, new Date());
  console.log(formatReport(results));
  if (!warnOnly && results.some((r) => r.status !== "fresh")) process.exit(1);
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) main();
