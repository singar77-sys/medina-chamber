/**
 * /api/admin/campaigns — list campaigns, create a draft.
 *
 * Admin only (admin_session cookie). A new campaign is always created as a
 * draft; it is only sent via POST /api/admin/campaigns/[id]/send.
 */

import { requireAdminSession } from "@/lib/admin-auth";
import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailCampaigns, emailSends } from "@/lib/db/schema";
import type { CampaignSegment } from "@/lib/db/schema";
import { EMAIL_RE } from "@/lib/email";
import { cleanLine, MAX_FROM_NAME, MAX_HTML, MAX_NAME, MAX_SUBJECT } from "@/lib/email/campaign-validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_FROM_NAME = "Greater Medina Chamber of Commerce";
const DEFAULT_FROM_EMAIL = process.env.CHAMBER_FROM_EMAIL ?? "news@medinaohchamber.com";

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function GET(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const campaigns = await db
    .select({
      id: emailCampaigns.id,
      name: emailCampaigns.name,
      subject: emailCampaigns.subject,
      status: emailCampaigns.status,
      recipientCount: emailCampaigns.recipientCount,
      sentCount: emailCampaigns.sentCount,
      // Live count of failed deliveries — when a batch fails, sentCount and
      // recipientCount diverge; this makes a partially-failed blast visible
      // instead of looking cleanly "sent".
      failedCount: sql<number>`(
        select count(*)::int from ${emailSends}
        where ${emailSends.campaignId} = ${emailCampaigns.id}
          and ${emailSends.status} = 'failed'
      )`,
      openCount: emailCampaigns.openCount,
      clickCount: emailCampaigns.clickCount,
      unsubscribeCount: emailCampaigns.unsubscribeCount,
      bounceCount: emailCampaigns.bounceCount,
      sentAt: emailCampaigns.sentAt,
      createdAt: emailCampaigns.createdAt,
    })
    .from(emailCampaigns)
    .orderBy(desc(emailCampaigns.createdAt));

  return Response.json({ campaigns });
}

export async function POST(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const name = cleanLine(body.name, MAX_NAME);
  const subject = cleanLine(body.subject, MAX_SUBJECT);
  if (!name) return Response.json({ error: "Campaign name is required (max 150 chars, single line)." }, { status: 400 });
  if (!subject) return Response.json({ error: "Subject is required (max 300 chars, single line)." }, { status: 400 });

  const fromName = cleanLine(body.fromName, MAX_FROM_NAME) ?? DEFAULT_FROM_NAME;
  const fromEmail = str(body.fromEmail) ?? DEFAULT_FROM_EMAIL;
  if (!EMAIL_RE.test(fromEmail)) {
    return Response.json({ error: "From address is not a valid email." }, { status: 400 });
  }
  const replyTo = str(body.replyTo);
  if (replyTo && !EMAIL_RE.test(replyTo)) {
    return Response.json({ error: "Reply-to is not a valid email." }, { status: 400 });
  }

  const htmlBody = typeof body.htmlBody === "string" ? body.htmlBody : null;
  if (htmlBody && htmlBody.length > MAX_HTML) {
    return Response.json({ error: "Email body is too large." }, { status: 400 });
  }
  const segmentFilter =
    body.segmentFilter && typeof body.segmentFilter === "object"
      ? (body.segmentFilter as CampaignSegment)
      : null;

  const [campaign] = await db
    .insert(emailCampaigns)
    .values({ name, subject, fromName, fromEmail, replyTo, htmlBody, segmentFilter, status: "draft" })
    .returning();

  return Response.json({ campaign }, { status: 201 });
}
