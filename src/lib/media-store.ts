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
import { getRedis } from "@/lib/upstash";

const TTL = 365 * 24 * 3600;
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
  await redis.set(`cms:media:event:${slug}`, [item, ...existing], { ex: TTL });
}

export async function getEventPhotos(slug: string): Promise<MediaItem[]> {
  const redis = getRedis();
  if (!redis) return [];
  return (await redis.get<MediaItem[]>(`cms:media:event:${slug}`)) ?? [];
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

export async function deleteEventPhoto(slug: string, url: string): Promise<void> {
  const redis = getRedis();

  // Delete from Blob storage
  try {
    await del(url);
  } catch {
    // Blob may already be gone — proceed to clean Redis
  }

  // Remove from Redis
  if (!redis) return;
  const existing = (await redis.get<MediaItem[]>(`cms:media:event:${slug}`)) ?? [];
  await redis.set(
    `cms:media:event:${slug}`,
    existing.filter((i) => i.url !== url),
    { ex: TTL },
  );

  // Remove from recent feed
  const recent = (await redis.get<MediaItem[]>("cms:media:recent")) ?? [];
  await redis.set(
    "cms:media:recent",
    recent.filter((i) => i.url !== url),
    { ex: TTL },
  );
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
    { ex: TTL },
  );
}

// ── Recent feed (for future homepage use) ─────────────────────────────────────

async function addToRecentFeed(item: MediaItem): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const existing = (await redis.get<MediaItem[]>("cms:media:recent")) ?? [];
  const updated = [item, ...existing].slice(0, RECENT_CAP);
  await redis.set("cms:media:recent", updated, { ex: TTL });
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
  await redis.set(`cms:event-graphic:${slug}`, url, { ex: TTL });
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
