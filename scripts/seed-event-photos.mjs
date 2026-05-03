/**
 * seed-event-photos.mjs
 *
 * Uploads static event photos from public/images/events/ to Vercel Blob
 * and registers them in Redis under cms:media:event:{type-slug}.
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

const TTL = 365 * 24 * 3600; // 1 year — matches media-store.ts
const CONCURRENCY = 5;        // parallel uploads per folder

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
  const redisKey = `cms:media:event:${typeSlug}`;

  // Skip already-seeded unless --force
  if (!FORCE) {
    const existing = await redis.get(redisKey);
    if (Array.isArray(existing) && existing.length > 0) {
      console.log(
        `⏭  ${folder} → already seeded (${existing.length} photos). Use --force to overwrite.`,
      );
      return 0;
    }
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

  // Write metadata to Redis
  await redis.set(redisKey, items, { ex: TTL });
  console.log(`  ✅ Redis: ${redisKey} → ${items.length} items`);

  // Prepend to recent feed (cap at 50)
  const recent = (await redis.get("cms:media:recent")) ?? [];
  const updated = [...items, ...(Array.isArray(recent) ? recent : [])].slice(0, 50);
  await redis.set("cms:media:recent", updated, { ex: TTL });

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
