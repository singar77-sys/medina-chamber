/**
 * /api/admin/graphic-templates
 *
 * GET    — list all saved templates
 * POST   — save a generated template (body: { config: GraphicConfigDraft, name: string })
 * DELETE — delete a template (query: ?id=xxx)
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  listGraphicTemplates,
  saveGraphicTemplate,
  deleteGraphicTemplate,
  type GraphicConfigDraft,
} from "@/lib/graphic-template";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const templates = await listGraphicTemplates();
  return NextResponse.json({ templates });
}

export async function POST(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  let body: { config?: GraphicConfigDraft; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.config) {
    return NextResponse.json({ error: "Missing config." }, { status: 400 });
  }

  const id = `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const config = {
    ...body.config,
    id,
    name: body.name?.trim() || body.config.name || "Untitled Template",
    createdAt: new Date().toISOString(),
  };

  await saveGraphicTemplate(config);
  return NextResponse.json({ id, config });
}

export async function DELETE(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  await deleteGraphicTemplate(id);
  return NextResponse.json({ ok: true });
}
