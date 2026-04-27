/**
 * GET  /api/admin/content?page=&field=  — read a content field override
 * PUT  /api/admin/content               — save a content field override
 * DELETE /api/admin/content?page=&field= — reset to static default
 *
 * All routes require the admin bearer token (Authorization: Bearer ...).
 * The admin UI pages use fetch() with the token from a client-side
 * session context; direct API calls also work for scripting.
 */

import { NextResponse } from "next/server";
import { requireAdminToken } from "@/lib/admin-auth";
import {
  getContentField,
  setContentField,
  clearContentField,
  CONTENT_FIELD_DEFS,
} from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const page = url.searchParams.get("page");
  const field = url.searchParams.get("field");

  if (!page || !field) {
    // Return all field defs with their current values
    const values = await Promise.all(
      CONTENT_FIELD_DEFS.map(async (def) => ({
        ...def,
        currentValue: (await getContentField(def.page, def.field)) ?? def.defaultValue,
        isOverridden: (await getContentField(def.page, def.field)) !== null,
      })),
    );
    return NextResponse.json({ fields: values });
  }

  const def = CONTENT_FIELD_DEFS.find((d) => d.page === page && d.field === field);
  if (!def) {
    return NextResponse.json({ error: "Unknown field." }, { status: 404 });
  }

  const value = (await getContentField(page, field)) ?? def.defaultValue;
  return NextResponse.json({ page, field, value, isOverridden: value !== def.defaultValue });
}

export async function PUT(req: Request): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  let body: { page?: string; field?: string; value?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { page, field, value } = body;
  if (!page || !field || typeof value !== "string") {
    return NextResponse.json({ error: "Missing page, field, or value." }, { status: 400 });
  }

  const def = CONTENT_FIELD_DEFS.find((d) => d.page === page && d.field === field);
  if (!def) {
    return NextResponse.json({ error: "Unknown field." }, { status: 404 });
  }

  if (value.length > def.maxLength) {
    return NextResponse.json(
      { error: `Value exceeds max length of ${def.maxLength} characters.` },
      { status: 400 },
    );
  }

  await setContentField(page, field, value.trim());
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const page = url.searchParams.get("page");
  const field = url.searchParams.get("field");

  if (!page || !field) {
    return NextResponse.json({ error: "Missing page or field." }, { status: 400 });
  }

  await clearContentField(page, field);
  return NextResponse.json({ ok: true });
}
