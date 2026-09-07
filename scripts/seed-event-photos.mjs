/**
 * seed-event-photos.mjs
 *
 * Uploads static event photos from public/images/events/ to Vercel Blob
 * and registers them in Redis under cms:media:event:{type-slug}:items /
 * :order — the same indexed shape src/lib/media-store.ts reads and writes.
 *
 * It used to write the LEGACY single-JSON-array key (cms:media:event:{slug}).
 * media-store migrates that array onto the hash + sorted set on the first admin
 * write and DELETES it, after which this script was writing to a key nothing
 * reads and reading a guard key nothing writes: "already seeded" saw nothing,
 * so it re-uploaded every blob, and the metadata it then wrote was invisible.
 * Seeding silently did nothing.
 *
 * Event detail pages fall back to the type slug when no instance-specific
 * photos exist, so seeding once covers all recurring event instances.
 * "business-brew" photos serve every business-brew-may-2026, -june-2026, etc.
 *
 * Usage:
 *   node scripts/seed-event-photos.mjs                        # seed all folders
 *   node scripts/seed-event-photos.mjs --dry-run              # preview only
 *   node scripts/seed-event-photos.mjs --folder=business-brew # one folder
 *   node scripts/seed-event-photos.mjs --force                # overwrite existing
 *
 * Env vars (from .env.local):
 *   BLOB_READ_WRITE_TOKEN
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..");
const EVENTS_DIR = join(ROOT, "public", "images", "events");

// ── .env.local loader ─────────────────────────────────────────────────────────
const envPath = join(ROOT, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

// ── Validate env ──────────────────────────────────────────────────────────────
const REQUIRED = [
  "BLOB_READ_WRITE_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`FATAL: missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

// ── Clients ───────────────────────────────────────────────────────────────────
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ── Folder → type slug mapping ────────────────────────────────────────────────
// folder: directory name under public/images/events/
// typeSlug: Redis key suffix (cms:media:event:{typeSlug}); also used as
//           Vercel Blob path prefix (events/{typeSlug}/{filename})
// alt: default alt text applied to all photos in this folder
//
// Intentionally excluded:
//   misc/ — unidentified event, needs manual classification first
//
const FOLDER_MAP = [
  {
    folder: "business-brew",
    typeSlug: "business-brew",
    alt: "Business Brew networking event at the Greater Medina Chamber of Commerce in Medina, Ohio",
  },
  {
    folder: "social-connect",
    typeSlug: "social-connect",
    alt: "Social Connect networking event, Greater Medina Chamber of Commerce, Medina Ohio",
  },
  {
    folder: "networking-wow",
    typeSlug: "networking-wow",
    alt: "Networking WOW event at the Greater Medina Chamber of Commerce, Medina Ohio",
  },
  {
    folder: "golf-outing",
    typeSlug: "annual-chamber-golf-outing",
    alt: "Annual Chamber Golf Outing, Greater Medina Chamber of Commerce, Medina Ohio",
  },
  {
    folder: "athena-awards",
    typeSlug: "athena-awards",
    alt: "Athena Awards ceremony honoring women leaders, Greater Medina Chamber of Commerce, Medina Ohio",
  },
  {
    folder: "chamber-chat",
    typeSlug: "chamber-chat",
    alt: "Chamber Chat conversation event, Greater Medina Chamber of Commerce, Medina Ohio",
  },
  {
    folder: "eggs-and-expertise",
    typeSlug: "eggs-expertise",
    alt: "Eggs & Expertise breakfast workshop, Greater Medina Chamber of Commerce, Medina Ohio",
  },
  {
    folder: "get-to-know-the-chamber",
    typeSlug: "get-to-know-the-chamber",
    alt: "Get to Know the Chamber event, Greater Medina Chamber of Commerce, Medina Ohio",
  },
  {
    folder: "lunch-bunch",
    typeSlug: "lunch-bunch",
    alt: "Lunch Bunch networking lunch, Greater Medina Chamber of Commerce, Medina Ohio",
  },
  {
    folder: "october-member-meeting",
    typeSlug: "chamber-member-meeting",
    alt: "Chamber Member Meeting, Greater Medina Chamber of Commerce, Medina Ohio",
  },
  {
    folder: "ppe-fashion-show",
    typeSlug: "ppe-fashion-show",
    alt: "PPE Fashion Show safety event, Greater Medina Chamber of Commerce, Medina Ohio",
  },
  {
    folder: "state-of-the-city",
    typeSlug: "state-of-the-city",
    alt: "State of the City address, Greater Medina Chamber of Commerce, Medina Ohio",
  },
];

// ── CLI flags ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");
const onlyFolder = args.find((a) => a.startsWith("--folder="))?.split("=")[1];

const CONCURRENCY = 5;        // parallel uploads per folder
const RECENT_CAP = 50;        // matches media-store.ts

// Indexed key shape, kept in lockstep with src/lib/media-store.ts.
// NO TTL: these keys hold published content whose only lifecycle is the admin
// UI. The legacy writes here set a 1-year expiry, which would have quietly
// emptied a seeded gallery a year after seeding.
const RECENT_BASE = "cms:media:recent";
const eventBase = (slug) => `cms:media:event:${slug}`;
const itemsKey = (base) => `${base}:items`;
const orderKey = (base) => `${base}:order`;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Read only the .webp files directly in a folder (non-recursive). */
function listWebpFiles(folder) {
  const dir = join(EVENTS_DIR, folder);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => {
      if (extname(f).toLowerCase() !== ".webp") return false;
      return statSync(join(dir, f)).isFile();
    })
    .sort();
}

/**
 * Write items into one indexed list. HSET before ZADD so the index never points
 * at a missing body; scores descend with the file order so the gallery reads
 * back in the same order `files.sort()` produced.
 */
async function writeList(base, items, baseScore) {
  const bodies = Object.fromEntries(items.map((item) => [item.url, item]));
  const entries = items.map((item, i) => ({
    score: baseScore + (items.length - i),
    member: item.url,
  }));
  await redis.hset(itemsKey(base), bodies);
  await redis.zadd(orderKey(base), entries[0], ...entries.slice(1));
}

/** Drop everything past `cap`, bodies included — media-store.trimList. */
async function trimList(base, cap) {
  const stale = await redis.zrange(orderKey(base), 0, -(cap + 1));
  if (!stale || stale.length === 0) return;
  await redis.zrem(orderKey(base), ...stale);
  await redis.hdel(itemsKey(base), ...stale);
}

/**
 * Carry a legacy single-array key onto the indexed keys, exactly as
 * media-store.migrateLegacyList does (hset -> zadd -> del, ordinal scores, so a
 * partial failure leaves the array intact and the stored order survives).
 *
 * Needed because readList prefers the sorted set whenever it is non-empty:
 * writing seeded photos into the new keys while an unmigrated array still sat
 * in the old one would hide every photo in that array.
 *
 * This script is operator-run and is NOT designed to race admin uploads; the
 * store's migration lock is deliberately not reimplemented here.
 */
async function migrateLegacy(base) {
  if ((await redis.zcard(orderKey(base))) > 0) return;

  const legacy = await redis.get(base);
  if (!Array.isArray(legacy) || legacy.length === 0) {
    if (legacy) await redis.del(base);
    return;
  }

  const seen = new Set();
  const bodies = {};
  const entries = [];
  legacy.forEach((item, i) => {
    if (!item?.url || seen.has(item.url)) return;
    seen.add(item.url);
    bodies[item.url] = item;
    entries.push({ score: legacy.length - i, member: item.url });
  });
  if (entries.length === 0) {
    await redis.del(base);
    return;
  }

  await redis.hset(itemsKey(base), bodies);
  await redis.zadd(orderKey(base), entries[0], ...entries.slice(1));
  await redis.del(base);
  console.log(`  ↻ migrated ${entries.length} legacy item(s) off ${base}`);
}

/** How many photos this event already has, in either shape. */
async function existingCount(base) {
  const indexed = await redis.zcard(orderKey(base));
  if (indexed > 0) return indexed;
  const legacy = await redis.get(base);
  return Array.isArray(legacy) ? legacy.length : 0;
}

/** Upload files in batches of CONCURRENCY. */
async function uploadBatch(tasks) {
  const results = [];
  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map((t) => t()));
    for (const r of settled) {
      if (r.status === "fulfilled") {
        results.push(r.value);
      } else {
        console.error("  ✗ upload error:", r.reason?.message ?? r.reason);
      }
    }
  }
  return results;
}

// ── Core seeder ───────────────────────────────────────────────────────────────

async function seedFolder(entry) {
  const { folder, typeSlug, alt } = entry;
  const base = eventBase(typeSlug);

  // Skip already-seeded unless --force. Checks the INDEXED keys first: once an
  // admin upload has migrated this event, the legacy array is gone and reading
  // only that key reported "never seeded" for a full gallery.
  const already = await existingCount(base);
  if (!FORCE && already > 0) {
    console.log(
      `⏭  ${folder} → already seeded (${already} photos). Use --force to overwrite.`,
    );
    return 0;
  }

  const files = listWebpFiles(folder);
  if (files.length === 0) {
    console.log(`⚠  ${folder} → no .webp files found (folder may not exist), skipping`);
    return 0;
  }

  console.log(
    `\n📁 ${folder} → ${typeSlug} (${files.length} photos)${DRY_RUN ? " [DRY RUN]" : ""}`,
  );

  if (DRY_RUN) {
    for (const filename of files) {
      const size = statSync(join(EVENTS_DIR, folder, filename)).size;
      console.log(`  → ${filename} (${(size / 1024).toFixed(0)}KB)`);
    }
    return files.length;
  }

  // Upload all files with bounded concurrency
  const uploadedAt = new Date().toISOString();
  const tasks = files.map((filename) => async () => {
    const filePath = join(EVENTS_DIR, folder, filename);
    const size = statSync(filePath).size;
    const blobPathname = `events/${typeSlug}/${filename}`;
    const data = await readFile(filePath);

    const blob = await put(blobPathname, data, {
      access: "public",
      contentType: "image/webp",
    });

    process.stdout.write(`  ✓ ${filename} (${(size / 1024).toFixed(0)}KB)\n`);

    return {
      url: blob.url,
      pathname: blob.pathname,
      filename,
      size,
      uploadedAt,
      eventSlug: typeSlug,
      alt,
    };
  });

  const items = await uploadBatch(tasks);
  if (items.length === 0) return 0;

  // --force replaces this event's gallery, which is what the old whole-array
  // SET did. Clearing both new keys AND the legacy one means a re-seed can't
  // leave half of a previous seeding behind in the other shape.
  if (FORCE) {
    await redis.del(itemsKey(base), orderKey(base), base);
  } else {
    await migrateLegacy(base);
  }
  await migrateLegacy(RECENT_BASE);

  const baseScore = Date.parse(uploadedAt);
  await writeList(base, items, baseScore);
  console.log(`  ✅ Redis: ${itemsKey(base)} + ${orderKey(base)} → ${items.length} items`);

  // Add to the global recent feed, then trim it to the same cap media-store uses.
  await writeList(RECENT_BASE, items, baseScore);
  await trimList(RECENT_BASE, RECENT_CAP);

  return items.length;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const toProcess = onlyFolder
  ? FOLDER_MAP.filter((e) => e.folder === onlyFolder)
  : FOLDER_MAP;

if (toProcess.length === 0) {
  console.error(
    `No folder config found for: ${onlyFolder}\n` +
    `Valid folders: ${FOLDER_MAP.map((e) => e.folder).join(", ")}`,
  );
  process.exit(1);
}

console.log(`\n🌱 Seeding event photos → Vercel Blob + Redis`);
console.log(`   Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
console.log(`   Force: ${FORCE ? "yes (overwrite existing)" : "no (skip seeded)"}`);
console.log(`   Folders: ${toProcess.length}`);

let total = 0;
for (const entry of toProcess) {
  total += await seedFolder(entry);
}

console.log(`\n✅ Done. ${total} photos ${DRY_RUN ? "would be " : ""}uploaded.`);
