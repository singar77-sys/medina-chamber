/**
 * /api/admin/media
 *
 * GET    ?eventSlug=xxx          — list photos for an event
 * GET    ?recent=1               — list recent media (global feed)
 * DELETE ?url=xxx[&eventSlug=x]  — delete a photo (eventSlug optional)
 * PATCH  { url, eventSlug?, alt?, filename?, caption? } — update metadata
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  getEventPhotos,
  getRecentMedia,
  deleteMediaItem,
  updateEventPhotoCaption,
  updateMediaItemMeta,
} from "@/lib/media-store";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const eventSlug = searchParams.get("eventSlug");
  const recent = searchParams.get("recent");

  if (recent) {
    const items = await getRecentMedia(50);
    return NextResponse.json({ items });
  }

  if (eventSlug) {
    const items = await getEventPhotos(eventSlug);
    return NextResponse.json({ items });
  }

  return NextResponse.json({ error: "Provide eventSlug or recent=1." }, { status: 400 });
}

export async function DELETE(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const eventSlug = searchParams.get("eventSlug") ?? undefined;

  if (!url) {
    return NextResponse.json({ error: "Missing url." }, { status: 400 });
  }

  await deleteMediaItem(url, eventSlug);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  let body: { url?: string; eventSlug?: string; alt?: string; filename?: string; caption?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { url, eventSlug, alt, filename, caption } = body;
  if (!url) {
    return NextResponse.json({ error: "Missing url." }, { status: 400 });
  }

  // Legacy caption-only update (event photos)
  if (caption !== undefined && eventSlug) {
    await updateEventPhotoCaption(eventSlug, url, caption);
    return NextResponse.json({ ok: true });
  }

  // General metadata update (alt text, filename)
  if (alt !== undefined || filename !== undefined) {
    await updateMediaItemMeta(url, { alt, filename }, eventSlug);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Provide alt, filename, or caption to update." }, { status: 400 });
}
