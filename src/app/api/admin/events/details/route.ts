/**
 * GET  /api/admin/events/details?slug=xxx  → current CmsEventData override
 * PUT  /api/admin/events/details           → { slug, data } → save override
 * DELETE /api/admin/events/details?slug=xxx → clear override
 *
 * When dateISO is provided in PUT, the day-of-week / month / day / year /
 * dateString fields are automatically derived so callers don't have to.
 */

import { NextResponse } from "next/server";
import { requireAdminToken } from "@/lib/admin-auth";
import {
  getCmsEventData,
  setCmsEventData,
  clearCmsEventData,
  type CmsEventData,
} from "@/lib/cms-store";

export const dynamic = "force-dynamic";

function deriveDateFields(
  dateISO: string,
): Pick<CmsEventData, "dayOfWeek" | "month" | "day" | "year" | "dateString"> {
  // Use noon UTC to stay well clear of DST / timezone edges
  const d = new Date(`${dateISO}T12:00:00.000Z`);
  return {
    dayOfWeek: d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
    month: d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" }),
    day: d.getUTCDate(),
    year: d.getUTCFullYear(),
    dateString: d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }),
  };
}

export async function GET(req: Request): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const data = await getCmsEventData(slug);
  return NextResponse.json({ data });
}

export async function PUT(req: Request): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  let body: { slug?: string; data?: CmsEventData };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, data } = body;
  if (!slug || !data) {
    return NextResponse.json({ error: "Missing slug or data" }, { status: 400 });
  }

  if (data.dateISO) {
    Object.assign(data, deriveDateFields(data.dateISO));
  }

  await setCmsEventData(slug, data);
  const saved = await getCmsEventData(slug);
  return NextResponse.json({ data: saved });
}

export async function DELETE(req: Request): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  await clearCmsEventData(slug);
  return NextResponse.json({ ok: true });
}
