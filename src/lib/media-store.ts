/**
 * Media store — Vercel Blob + Redis metadata.
 *
 * Vercel Blob stores the actual files and returns public CDN URLs.
 * Redis stores lightweight metadata so pages can list/display images
 * without hitting the Blob list API on every render.
 *
 * Key namespaces:
 *   cms:media:event:{slug}   MediaItem[] — photos uploaded for a specific event
 *   cms:media:recent         MediaItem[] — global feed (newest 50), for homepage
 *   cms:event-graphic:{slug} string      — URL of a custom uploaded social graphic
 *
 * Requires env var: BLOB_READ_WRITE_TOKEN (set in Vercel project settings)
 */

import { put, del } from "@vercel/blob";
import { unstable_cache } from "next/cache";
import { getRedis } from "@/lib/upstash";

const RECENT_CAP = 50;

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
  const existing = (await redis.get<MediaItem[]>(`cms:media:event:${slug}`)) ?? [];
  await redis.set(`cms:media:event:${slug}`, [item, ...existing]);
}

export async function getEventPhotos(slug: string): Promise<MediaItem[]> {
  const redis = getRedis();
  if (!redis) return [];
  // Public event pages call this — a Redis outage must mean "no photos",
  // not a 500 (same read-side contract as cms-store).
  try {
    return (await redis.get<MediaItem[]>(`cms:media:event:${slug}`)) ?? [];
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
    const read = async (s: string) =>
      (await redis.get<MediaItem[]>(`cms:media:event:${s}`)) ?? [];

    const photos = await read(slug);
    if (photos.length > 0) return photos;
    const typeSlug = toTypeSlug(slug);
    return typeSlug === slug ? photos : read(typeSlug);
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

  // Delete from Blob storage
  try {
    await del(url);
  } catch {
    // Blob may already be gone — proceed to clean Redis
  }

  if (!redis) return;

  const ops: Promise<unknown>[] = [];

  // Remove from recent feed
  const recent = (await redis.get<MediaItem[]>("cms:media:recent")) ?? [];
  ops.push(
    redis.set("cms:media:recent", recent.filter((i) => i.url !== url)),
  );

  // Remove from event photos if tagged
  if (eventSlug) {
    const existing = (await redis.get<MediaItem[]>(`cms:media:event:${eventSlug}`)) ?? [];
    ops.push(
      redis.set(
        `cms:media:event:${eventSlug}`,
        existing.filter((i) => i.url !== url),
      ),
    );
  }

  await Promise.all(ops);
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

  const applyMeta = (item: MediaItem): MediaItem =>
    item.url === url ? { ...item, ...meta } : item;

  const ops: Promise<unknown>[] = [];

  const recent = (await redis.get<MediaItem[]>("cms:media:recent")) ?? [];
  ops.push(redis.set("cms:media:recent", recent.map(applyMeta)));

  if (eventSlug) {
    const existing = (await redis.get<MediaItem[]>(`cms:media:event:${eventSlug}`)) ?? [];
    ops.push(
      redis.set(`cms:media:event:${eventSlug}`, existing.map(applyMeta)),
    );
  }

  await Promise.all(ops);
}

export async function updateEventPhotoCaption(
  slug: string,
  url: string,
  caption: string,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const existing = (await redis.get<MediaItem[]>(`cms:media:event:${slug}`)) ?? [];
  await redis.set(
    `cms:media:event:${slug}`,
    existing.map((i) => (i.url === url ? { ...i, caption } : i)),
  );
}

// ── Recent feed (for future homepage use) ─────────────────────────────────────

async function addToRecentFeed(item: MediaItem): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const existing = (await redis.get<MediaItem[]>("cms:media:recent")) ?? [];
  const updated = [item, ...existing].slice(0, RECENT_CAP);
  await redis.set("cms:media:recent", updated);
}

export async function getRecentMedia(limit = 20): Promise<MediaItem[]> {
  const redis = getRedis();
  if (!redis) return [];
  const all = (await redis.get<MediaItem[]>("cms:media:recent")) ?? [];
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
