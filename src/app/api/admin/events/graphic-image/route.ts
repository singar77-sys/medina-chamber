/**
 * DELETE /api/admin/events/graphic-image?slug=xxx
 * Clears the custom uploaded social graphic for an event.
 */

import { NextResponse } from "next/server";
import { requireAdminToken } from "@/lib/admin-auth";
import { clearEventGraphicImage } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug." }, { status: 400 });

  await clearEventGraphicImage(slug);
  return NextResponse.json({ ok: true });
}
