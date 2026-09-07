/**
 * Media store — Vercel Blob + Redis metadata.
 *
 * Vercel Blob stores the actual files and returns public CDN URLs.
 * Redis stores lightweight metadata so pages can list/display images
 * without hitting the Blob list API on every render.
 *
 * Key namespaces (current):
 *   cms:media:event:{slug}:items   HASH  url → MediaItem  (photo bodies)
 *   cms:media:event:{slug}:order   ZSET  url → sort score (newest = highest)
 *   cms:media:recent:items         HASH  url → MediaItem  (global feed bodies)
 *   cms:media:recent:order         ZSET  url → sort score (capped at 50)
 *   cms:event-graphic:{slug}       string  URL of a custom uploaded social graphic
 *
 * Legacy (read-only fallback, migrated on first write):
 *   cms:media:event:{slug}   MediaItem[]  single JSON array
 *   cms:media:recent         MediaItem[]  single JSON array
 *
 * WHY the split. Both lists used to be one JSON array under one key, mutated
 * with GET → modify → SET. That is a lost-update race: two uploads land in the
 * same window, both read the same "before" array, and the second SET erases the
 * first photo — the upload returns 200, the blob exists, and the photo is simply
 * gone from the gallery. The photo uploader worked around it by uploading
 * strictly one at a time, but client-side sequencing is not a server-side
 * guarantee: two admin tabs, two staff members, or an upload racing a delete all
 * reintroduce it. Bodies now live in a hash keyed by URL and ordering lives in a
 * sorted set, so every mutation is a single-member Redis write that cannot
 * clobber an unrelated record.
 *
 * Requires env var: BLOB_READ_WRITE_TOKEN (set in Vercel project settings)
 */

import { put, del } from "@vercel/blob";
import { unstable_cache } from "next/cache";
import { getRedis } from "@/lib/upstash";
import type { Redis } from "@upstash/redis";

const RECENT_CAP = 50;

/** Legacy single-array key for the global feed; the base for its new keys too. */
const RECENT_BASE = "cms:media:recent";

const eventBase = (slug: string) => `cms:media:event:${slug}`;
const itemsKey = (base: string) => `${base}:items`;
const orderKey = (base: string) => `${base}:order`;
/** Held for the duration of a legacy-array migration — see ensureMigrated. */
const migratingKey = (base: string) => `${base}:migrating`;

/** Generous: the migration itself is three round trips. An expired lock only
 *  reopens the window the lock closes, so erring long is the safe direction. */
const MIGRATION_LOCK_SECONDS = 30;
/** Bounded wait for someone else's migration: 40 x 50ms = 2s, then fail loudly.
 *  Only ever reached while a legacy key still exists — once per key, ever — so
 *  the cost is paid on one request in the life of the deployment. */
const MIGRATION_WAIT_MS = 50;
const MIGRATION_WAIT_TRIES = 40;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface MediaItem {
  url: string;
  pathname: string;   // the blob pathname, used for deletion
  filename: string;
  size: number;
  uploadedAt: string;
  eventSlug?: string;
  alt?: string;       // generated SEO/accessibility alt text
  caption?: string;   // optional user-visible caption
}

export interface UploadOptions {
  pathname: string;      // full blob path, e.g. "events/slug/chamber-golf-2026-001.webp"
  filename: string;      // display filename
  contentType: string;
  size: number;
  eventSlug?: string;
  alt?: string;
  caption?: string;
}

// ── Indexed list primitives ───────────────────────────────────────────────────
// One "list" = a HASH of bodies + a ZSET of ordering. Newest first means highest
// score first, so reads use ZRANGE ... REV.

/** Ordering token. Upload time in epoch ms: monotonic enough for display order,
 *  and always far above the small ordinals a legacy migration assigns. */
function scoreFor(item: MediaItem): number {
  const t = Date.parse(item.uploadedAt);
  return Number.isFinite(t) ? t : Date.now();
}

/**
 * One-time move of a legacy JSON array onto the hash + sorted set.
 *
 * Scores are assigned from the array position (n-i) rather than uploadedAt so
 * the stored order is preserved exactly even when timestamps are missing or
 * duplicated; every subsequent upload scores in epoch ms and therefore sorts
 * above the whole migrated block, which is correct — it IS newer.
 *
 * hset -> zadd -> del is deliberate: every partial-failure path leaves the
 * legacy array intact until BOTH new structures exist, and readList falls back
 * to it while the ZSET is empty, so no crash here can lose a record.
 *
 * Callers hold the migration lock (ensureMigrated). The zcard re-check below is
 * the second line of defence, for the case where that lock expired under a
 * stalled process.
 */
async function migrateLegacyList(redis: Redis, base: string): Promise<void> {
  const legacy = (await redis.get<MediaItem[]>(base)) ?? [];
  if (!Array.isArray(legacy) || legacy.length === 0) {
    // Nothing to carry over. Drop a stray non-array value so we don't re-read it.
    if (legacy && !Array.isArray(legacy)) await redis.del(base);
    return;
  }

  // The index was empty when we decided to migrate; if it is not empty NOW,
  // somebody else migrated this list while we were reading it — and may already
  // have DELETED one of the photos in our stale snapshot. Writing the snapshot
  // over their work resurrects that photo, and deleteMediaItem removes the blob
  // first, so what comes back is a gallery entry pointing at a dead URL.
  if ((await redis.zcard(orderKey(base))) > 0) return;

  const bodies: Record<string, MediaItem> = {};
  const entries: { score: number; member: string }[] = [];
  const seen = new Set<string>();
  legacy.forEach((item, i) => {
    if (!item?.url) return;
    // A duplicated URL is ONE member of the sorted set. Pushing it twice let the
    // later (lower) score win and quietly reordered the gallery.
    if (seen.has(item.url)) return;
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
}

/**
 * Migrate before any mutation, so writes never operate on a half-old list.
 *
 * The migration is MUTUALLY EXCLUSIVE with every other mutation of the same
 * list. Without that, this interleaving resurrects a deleted photo:
 *
 *   1. uploader   zcard = 0, starts migrating, GETs the legacy array [A, B]
 *   2. deleter    migrates the same array itself, then removes A
 *   3. uploader   writes its stale [A, B] snapshot back — A is in the gallery
 *                 again, and its blob is gone
 *
 * So exactly one caller migrates (SET NX EX) and everyone else RETRIES until
 * either the index is populated or the lock frees up (the holder finished, or
 * died and its TTL expired — in which case the retrying caller migrates).
 *
 * Giving up and mutating anyway is not an option: with the legacy array still
 * unmigrated, a bare hset/zadd makes the index non-empty, every later
 * ensureMigrated then short-circuits, and the whole legacy gallery is orphaned.
 * So this throws instead. A failed admin action that says "try again" is a far
 * better outcome than a silently half-migrated list, and the window only exists
 * while a legacy key does — once per key in the life of the store.
 */
async function ensureMigrated(redis: Redis, base: string): Promise<void> {
  const lock = migratingKey(base);

  for (let attempt = 0; attempt < MIGRATION_WAIT_TRIES; attempt++) {
    if ((await redis.zcard(orderKey(base))) > 0) return;

    const acquired = await redis.set(lock, "1", {
      nx: true,
      ex: MIGRATION_LOCK_SECONDS,
    });
    if (acquired) {
      try {
        await migrateLegacyList(redis, base);
      } finally {
        await redis.del(lock);
      }
      return;
    }

    await sleep(MIGRATION_WAIT_MS);
  }

  throw new Error(
    `Another writer is still migrating ${base} to the indexed format. Nothing was changed — try again in a moment.`,
  );
}

/** Read a list newest-first. Falls back to the legacy array when the indexed
 *  keys are empty — reads stay side-effect free (the public event page calls
 *  this through a cache, and a cached read must not write). */
async function readList(redis: Redis, base: string): Promise<MediaItem[]> {
  const order = await redis.zrange<string[]>(orderKey(base), 0, -1, { rev: true });
  if (!order || order.length === 0) {
    return (await redis.get<MediaItem[]>(base)) ?? [];
  }
  const bodies = await redis.hgetall<Record<string, MediaItem>>(itemsKey(base));
  if (!bodies) return [];
  return order.map((url) => bodies[url]).filter((i): i is MediaItem => Boolean(i));
}

/** Add one item. HSET before ZADD so the index never points at a missing body. */
async function addToList(redis: Redis, base: string, item: MediaItem): Promise<void> {
  await ensureMigrated(redis, base);
  await redis.hset(itemsKey(base), { [item.url]: item });
  await redis.zadd(orderKey(base), { score: scoreFor(item), member: item.url });
}

/** Drop the oldest entries beyond `cap`. Idempotent: concurrent trims remove the
 *  same tail, and neither can touch the freshly added top of the list. */
async function trimList(redis: Redis, base: string, cap: number): Promise<void> {
  const stale = await redis.zrange<string[]>(orderKey(base), 0, -(cap + 1));
  if (!stale || stale.length === 0) return;
  await redis.zrem(orderKey(base), ...stale);
  await redis.hdel(itemsKey(base), ...stale);
}

/** Remove one item. ZREM before HDEL so a partial failure leaves an orphan body
 *  rather than an index entry pointing at nothing. */
async function removeFromList(redis: Redis, base: string, url: string): Promise<void> {
  await ensureMigrated(redis, base);
  await redis.zrem(orderKey(base), url);
  await redis.hdel(itemsKey(base), url);
}

/** Edit one item's metadata. Read-modify-write of a SINGLE hash field, so a
 *  concurrent upload, delete, or edit of any OTHER photo is untouched. */
async function patchInList(
  redis: Redis,
  base: string,
  url: string,
  patch: Partial<MediaItem>,
): Promise<void> {
  await ensureMigrated(redis, base);
  const current = await redis.hget<MediaItem>(itemsKey(base), url);
  if (!current) return;
  await redis.hset(itemsKey(base), { [url]: { ...current, ...patch } });
}

// ── Blob upload ───────────────────────────────────────────────────────────────

export async function uploadMedia(
  data: Buffer | ArrayBuffer | Blob,
  options: UploadOptions,
): Promise<MediaItem> {
  const blob = await put(options.pathname, data, {
    access: "public",
    contentType: options.contentType,
  });

  const item: MediaItem = {
    url: blob.url,
    pathname: blob.pathname,
    filename: options.filename,
    size: options.size,
    uploadedAt: new Date().toISOString(),
    eventSlug: options.eventSlug,
    alt: options.alt,
    caption: options.caption,
  };

  // Persist metadata to Redis
  await Promise.all([
    options.eventSlug ? addEventPhoto(options.eventSlug, item) : Promise.resolve(),
    addToRecentFeed(item),
  ]);

  return item;
}

// ── Sequence counter (for clean filenames) ────────────────────────────────────
// Redis INCR is atomic — concurrent uploads for the same slug never collide.

export async function getNextSequence(descSlug: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return Math.floor(Math.random() * 900) + 1; // fallback if Redis unavailable
  const n = await redis.incr(`cms:media:seq:${descSlug}`);
  return n;
}

// ── Event photos ──────────────────────────────────────────────────────────────

async function addEventPhoto(slug: string, item: MediaItem): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await addToList(redis, eventBase(slug), item);
}

export async function getEventPhotos(slug: string): Promise<MediaItem[]> {
  const redis = getRedis();
  if (!redis) return [];
  // Public event pages call this — a Redis outage must mean "no photos",
  // not a 500 (same read-side contract as cms-store).
  try {
    return await readList(redis, eventBase(slug));
  } catch (err) {
    console.error("[media-store] Redis read failed (event-photos):", err);
    return [];
  }
}

/**
 * Strip a trailing month-year suffix to get the recurring event type slug.
 *   "business-brew-may-2026"  → "business-brew"
 *   "annual-chamber-golf-outing" → "annual-chamber-golf-outing" (unchanged)
 */
function toTypeSlug(slug: string): string {
  return slug
    .replace(
      /-(?:january|february|march|april|may|june|july|august|september|october|november|december)-\d{4}$/i,
      "",
    )
    .replace(/-\d{4}$/, "");
}

/**
 * Like getEventPhotos, but falls back to the recurring event type slug when
 * no instance-specific photos exist. This lets seeded galleries (stored once
 * under e.g. "business-brew") serve every dated instance automatically
 * ("business-brew-may-2026", "business-brew-june-2026", …).
 *
 * CMS uploads to the exact slug always take precedence — the fallback only
 * fires when the instance key is empty.
 */
export async function getEventPhotosWithFallback(slug: string): Promise<MediaItem[]> {
  const photos = await getEventPhotos(slug);
  if (photos.length > 0) return photos;

  const typeSlug = toTypeSlug(slug);
  if (typeSlug === slug) return photos; // already at type level, no fallback needed
  return getEventPhotos(typeSlug);
}

/** Tag for on-demand revalidation — the admin media APIs bust this when a photo
 *  is uploaded, deleted, or edited. Profile "max" marks the tag STALE and serves
 *  stale-while-revalidate, so the change lands on the NEXT public request rather
 *  than the one immediately after the upload. */
export const EVENT_PHOTOS_TAG = "event-photos";

// getEventPhotos / getEventPhotosWithFallback above stay uncached for the admin
// screens, which have to read back what they just uploaded. The public event
// page reads through here instead: the Upstash REST call is an uncached fetch
// that would otherwise opt every /events/[slug] page out of static generation.
// Reads Redis directly rather than through getEventPhotos: that helper swallows
// a Redis error into [], and caching that would pin "no photos" on the event page
// for the whole 300s window over one transient blip. Throwing means
// unstable_cache stores nothing and the wrapper below degrades per-request.
const getCachedEventPhotos = unstable_cache(
  async (slug: string): Promise<MediaItem[]> => {
    const redis = getRedis();
    if (!redis) return [];

    const photos = await readList(redis, eventBase(slug));
    if (photos.length > 0) return photos;
    const typeSlug = toTypeSlug(slug);
    return typeSlug === slug ? photos : readList(redis, eventBase(typeSlug));
  },
  ["event-photos"],
  { tags: [EVENT_PHOTOS_TAG], revalidate: 300 },
);

/** Gallery photos for the public event page — same recurring-type-slug fallback,
 *  and still an empty list (not a throw) when Redis is down. The catch sits
 *  outside the cache so an outage costs one request, not 300 seconds. */
export async function getPublicEventPhotos(slug: string): Promise<MediaItem[]> {
  try {
    return await getCachedEventPhotos(slug);
  } catch (err) {
    console.error("[media-store] Redis read failed (cached event-photos):", err);
    return [];
  }
}

/**
 * Delete a media item from Blob storage and Redis.
 * Works for both event-tagged photos and global-feed-only items.
 */
export async function deleteMediaItem(url: string, eventSlug?: string): Promise<void> {
  const redis = getRedis();

  // METADATA FIRST, blob second. The other order leaves a window in which the
  // blob is gone but the gallery entry still points at it — a broken image on
  // the public event page — and anything that makes the Redis half fail (a
  // migration in flight, an outage) makes that window permanent. This way a
  // failed delete changes nothing, and the worst case is an orphaned blob.
  if (redis) {
    await Promise.all([
      removeFromList(redis, RECENT_BASE, url),
      eventSlug ? removeFromList(redis, eventBase(eventSlug), url) : Promise.resolve(),
    ]);
  }

  try {
    await del(url);
  } catch {
    // Blob may already be gone — the metadata is what the site reads.
  }
}

/**
 * Update alt text and/or display filename in Redis metadata.
 * Touches both the recent feed and the event list (if eventSlug provided).
 * The Blob URL is immutable — this is purely metadata.
 */
export async function updateMediaItemMeta(
  url: string,
  meta: { alt?: string; filename?: string },
  eventSlug?: string,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  await Promise.all([
    patchInList(redis, RECENT_BASE, url, meta),
    eventSlug ? patchInList(redis, eventBase(eventSlug), url, meta) : Promise.resolve(),
  ]);
}

export async function updateEventPhotoCaption(
  slug: string,
  url: string,
  caption: string,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await patchInList(redis, eventBase(slug), url, { caption });
}

// ── Recent feed (for future homepage use) ─────────────────────────────────────

async function addToRecentFeed(item: MediaItem): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await addToList(redis, RECENT_BASE, item);
  await trimList(redis, RECENT_BASE, RECENT_CAP);
}

export async function getRecentMedia(limit = 20): Promise<MediaItem[]> {
  const redis = getRedis();
  if (!redis) return [];
  const all = await readList(redis, RECENT_BASE);
  return all.slice(0, limit);
}

// ── Custom event social graphic ───────────────────────────────────────────────
// Uploaded by admin to replace AI/built-in graphic with a custom image (e.g. Canva export).

export async function setEventGraphicImage(slug: string, url: string): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis not configured");
  await redis.set(`cms:event-graphic:${slug}`, url);
}

export async function getEventGraphicImage(slug: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  return redis.get<string>(`cms:event-graphic:${slug}`);
}

export async function clearEventGraphicImage(slug: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(`cms:event-graphic:${slug}`);
}
