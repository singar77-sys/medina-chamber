/**
 * /api/admin/media
 *
 * GET    ?eventSlug=xxx   — list photos for an event
 * GET    ?recent=1        — list recent media (global feed)
 * DELETE ?url=xxx&eventSlug=xxx — delete a photo
 * PATCH  { url, eventSlug, caption } — update caption
 */

import { NextResponse } from "next/server";
import { requireAdminToken } from "@/lib/admin-auth";
import {
  getEventPhotos,
  getRecentMedia,
  deleteEventPhoto,
  updateEventPhotoCaption,
} from "@/lib/media-store";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const authErr = requireAdminToken(req);
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
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const eventSlug = searchParams.get("eventSlug");

  if (!url || !eventSlug) {
    return NextResponse.json({ error: "Missing url or eventSlug." }, { status: 400 });
  }

  await deleteEventPhoto(eventSlug, url);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  let body: { url?: string; eventSlug?: string; caption?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { url, eventSlug, caption } = body;
  if (!url || !eventSlug || caption === undefined) {
    return NextResponse.json({ error: "Missing url, eventSlug, or caption." }, { status: 400 });
  }

  await updateEventPhotoCaption(eventSlug, url, caption);
  return NextResponse.json({ ok: true });
}
