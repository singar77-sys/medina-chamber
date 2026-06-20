/**
 * /api/admin/campaigns/[id] — read, edit (draft only), delete (draft only).
 *
 * Admin only (Bearer CHAT_ADMIN_TOKEN). Once a campaign has been sent it is
 * immutable: edits and deletes are refused with 409 so the audit trail and
 * recipient counts can't be rewritten after the fact.
 */

import { requireAdminToken } from "@/lib/admin-auth";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailCampaigns } from "@/lib/db/schema";
import type { CampaignSegment } from "@/lib/db/schema";
import { EMAIL_RE } from "@/lib/email";
import { cleanLine, MAX_FROM_NAME, MAX_HTML, MAX_NAME, MAX_SUBJECT } from "@/lib/email/campaign-validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EDITABLE = new Set(["draft", "scheduled"]);

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  const { id } = await params;
  const [campaign] = await db
    .select()
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, id))
    .limit(1);

  if (!campaign) return Response.json({ error: "campaign not found" }, { status: 404 });
  return Response.json({ campaign });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const [existing] = await db
    .select({ status: emailCampaigns.status })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, id))
    .limit(1);
  if (!existing) return Response.json({ error: "campaign not found" }, { status: 404 });
  if (!EDITABLE.has(existing.status)) {
    return Response.json({ error: "Only a draft campaign can be edited." }, { status: 409 });
  }

  const update: Partial<typeof emailCampaigns.$inferInsert> = {};
  if ("name" in body) {
    const v = cleanLine(body.name, MAX_NAME);
    if (!v) return Response.json({ error: "Invalid name (max 150 chars, single line)." }, { status: 400 });
    update.name = v;
  }
  if ("subject" in body) {
    const v = cleanLine(body.subject, MAX_SUBJECT);
    if (!v) return Response.json({ error: "Invalid subject (max 300 chars, single line)." }, { status: 400 });
    update.subject = v;
  }
  if ("fromName" in body) {
    const v = cleanLine(body.fromName, MAX_FROM_NAME);
    if (!v) return Response.json({ error: "Invalid from name (max 100 chars, single line)." }, { status: 400 });
    update.fromName = v;
  }
  if ("fromEmail" in body) {
    const v = str(body.fromEmail);
    if (!v || !EMAIL_RE.test(v)) return Response.json({ error: "Invalid from email." }, { status: 400 });
    update.fromEmail = v;
  }
  if ("replyTo" in body) {
    const v = str(body.replyTo);
    if (v && !EMAIL_RE.test(v)) return Response.json({ error: "Invalid reply-to." }, { status: 400 });
    update.replyTo = v;
  }
  if ("htmlBody" in body) {
    if (typeof body.htmlBody === "string" && body.htmlBody.length > MAX_HTML) {
      return Response.json({ error: "Email body is too large." }, { status: 400 });
    }
    update.htmlBody = typeof body.htmlBody === "string" ? body.htmlBody : null;
  }
  if ("segmentFilter" in body) {
    update.segmentFilter =
      body.segmentFilter && typeof body.segmentFilter === "object"
        ? (body.segmentFilter as CampaignSegment)
        : null;
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "No editable fields provided." }, { status: 400 });
  }

  const [campaign] = await db
    .update(emailCampaigns)
    .set({ ...update, updatedAt: sql`now()` })
    .where(eq(emailCampaigns.id, id))
    .returning();

  return Response.json({ campaign });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  const { id } = await params;
  const [existing] = await db
    .select({ status: emailCampaigns.status })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, id))
    .limit(1);
  if (!existing) return Response.json({ error: "campaign not found" }, { status: 404 });
  if (existing.status !== "draft") {
    return Response.json({ error: "Only a draft campaign can be deleted." }, { status: 409 });
  }

  await db.delete(emailCampaigns).where(eq(emailCampaigns.id, id));
  return Response.json({ deleted: true });
}
