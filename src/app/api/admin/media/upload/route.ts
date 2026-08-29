/**
 * POST /api/admin/media/upload
 *
 * Accepts multipart/form-data:
 *   file        File    — the image to upload
 *   description string  — plain language label, e.g. "golf outing"
 *                         Used to generate a clean SEO filename + alt tag.
 *                         If omitted, original filename is kept.
 *   eventSlug   string  — optional, tags the photo to an event
 *   type        string  — "photo" (gallery) | "graphic" (custom social graphic)
 *
 * Processing:
 *   - Converts any image to WebP via sharp (max 2400px wide, quality 85)
 *   - Generates filename: chamber-{desc-slug}-{year}-{seq:03d}.webp
 *   - Generates alt:      Greater Medina Chamber of Commerce {Title Case} {year}
 *   - Sequence is a persistent Redis counter per desc-slug (atomic INCR)
 *
 * Response: { item: MediaItem }
 */

import { NextResponse } from "next/server";
import sharp from "sharp";
import { requireAdminSession } from "@/lib/admin-auth";
import { SLUG_RE } from "@/lib/sanitize";
import {
  uploadMedia,
  setEventGraphicImage,
  getNextSequence,
  type MediaItem,
} from "@/lib/media-store";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
const PHOTO_MAX_WIDTH = 2400;
const WEBP_QUALITY = 85;

/** "golf outing 2026" → "golf-outing-2026" */
function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

/** "golf outing" → "Golf Outing" */
function toTitleCase(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export async function POST(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, GIF, and AVIF images are accepted." },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds the 15 MB limit." }, { status: 400 });
  }

  const description = (formData.get("description") as string | null)?.trim() ?? "";
  const rawEventSlug = (formData.get("eventSlug") as string | null)?.trim() || undefined;
  // eventSlug becomes both a Blob pathname segment (events/<slug>/...) and a
  // Redis key component (cms:media:event:<slug>), so it must be a plain slug —
  // reject rather than silently normalize, or the stored key would no longer
  // match the actual event's slug.
  if (rawEventSlug && !SLUG_RE.test(rawEventSlug)) {
    return NextResponse.json(
      { error: "eventSlug must be a lowercase-hyphen slug." },
      { status: 400 },
    );
  }
  const eventSlug = rawEventSlug;
  const type = (formData.get("type") as string | null) ?? "photo";

  // ── Convert to WebP via sharp ──────────────────────────────────────────────
  const rawBuffer = Buffer.from(await file.arrayBuffer());

  let webpBuffer: Buffer;
  try {
    webpBuffer = await sharp(rawBuffer)
      .resize({ width: PHOTO_MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch (err) {
    console.error("[media/upload] sharp error:", err);
    return NextResponse.json({ error: "Image processing failed." }, { status: 500 });
  }

  // ── Build clean filename ───────────────────────────────────────────────────
  const year = new Date().getFullYear();
  let filename: string;
  let alt: string | undefined;
  let blobPathname: string;

  if (description) {
    const descSlug = toSlug(description);
    const seq = await getNextSequence(descSlug);
    const seqStr = String(seq).padStart(3, "0");
    filename = `chamber-${descSlug}-${year}-${seqStr}.webp`;
    alt = `Greater Medina Chamber of Commerce ${toTitleCase(description)} ${year}`;
    const prefix = eventSlug ? `events/${eventSlug}/` : "media/";
    blobPathname = `${prefix}${filename}`;
  } else {
    // No description — preserve original name, just swap extension to .webp
    const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9.\-_]/gi, "-");
    filename = `${baseName}.webp`;
    const prefix = eventSlug ? `events/${eventSlug}/` : "media/";
    blobPathname = `${prefix}${Date.now()}-${filename}`;
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  let item: MediaItem;
  try {
    item = await uploadMedia(webpBuffer, {
      pathname: blobPathname,
      filename,
      contentType: "image/webp",
      size: webpBuffer.length,
      eventSlug,
      alt,
    });
  } catch (err) {
    console.error("[media/upload]", err);
    return NextResponse.json(
      { error: "Upload failed. Check that BLOB_READ_WRITE_TOKEN is configured." },
      { status: 500 },
    );
  }

  // For custom social graphics, register the URL so GraphicPanel shows it.
  // The blob already uploaded — a Redis hiccup here must not 500 the request.
  if (type === "graphic" && eventSlug) {
    try {
      await setEventGraphicImage(eventSlug, item.url);
    } catch (err) {
      console.error("[media/upload] setEventGraphicImage failed:", err);
    }
  }

  return NextResponse.json({ item });
}
