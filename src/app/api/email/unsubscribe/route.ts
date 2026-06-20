/**
 * /api/email/unsubscribe?token=… — unsubscribe a contact from chamber emails.
 *
 * GET  — the link in the email footer; unsubscribes and returns a confirmation page.
 * POST — RFC 8058 one-click (List-Unsubscribe-Post); unsubscribes and returns 200.
 *
 * The token is HMAC(contactId), so the link can't be used to unsubscribe anyone
 * else. Idempotent: the global flag flips once; the campaign counter + send row
 * are attributed only on that first unsubscribe.
 */

import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, emailSends, emailCampaigns } from "@/lib/db/schema";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { applyRateLimit, emailUnsubscribeLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function unsubscribe(token: string): Promise<boolean> {
  const contactId = verifyUnsubscribeToken(token);
  if (!contactId) return false;

  // Flip the global flag once. Only the first unsubscribe attributes a campaign.
  const [flipped] = await db
    .update(contacts)
    .set({ unsubscribedAt: sql`now()`, updatedAt: sql`now()` })
    .where(and(eq(contacts.id, contactId), isNull(contacts.unsubscribedAt)))
    .returning({ id: contacts.id });

  if (flipped) {
    // Attribute to the contact's most recent send (the campaign they're leaving).
    const [latest] = await db
      .select({ id: emailSends.id, campaignId: emailSends.campaignId })
      .from(emailSends)
      // Only actually-sent rows are candidates: sentAt is null for queued/failed
      // sends, and Postgres sorts NULLs first on DESC — without this filter a
      // never-delivered row could win and credit the wrong campaign.
      .where(and(eq(emailSends.contactId, contactId), isNotNull(emailSends.sentAt)))
      .orderBy(desc(emailSends.sentAt))
      .limit(1);

    if (latest) {
      await db
        .update(emailSends)
        .set({ status: "unsubscribed", unsubscribedAt: sql`now()` })
        .where(eq(emailSends.id, latest.id));
      await db
        .update(emailCampaigns)
        .set({ unsubscribeCount: sql`${emailCampaigns.unsubscribeCount} + 1` })
        .where(eq(emailCampaigns.id, latest.campaignId));
    }
  }
  return true;
}

function page(ok: boolean): string {
  const heading = ok ? "You're unsubscribed" : "Invalid link";
  const body = ok
    ? "You won't receive chamber emails anymore. Changed your mind? Contact the chamber office to resubscribe."
    : "This unsubscribe link is invalid or expired. Please contact the chamber office for help.";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading}</title></head>
<body style="margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a">
  <div style="max-width:440px;margin:80px auto;padding:32px;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center">
    <h1 style="font-size:20px;margin:0 0 8px">${heading}</h1>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0">${body}</p>
    <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">Greater Medina Chamber of Commerce</p>
  </div>
</body></html>`;
}

export async function GET(req: Request): Promise<Response> {
  const limited = await applyRateLimit(req, emailUnsubscribeLimiter);
  if (limited) return limited;

  const token = new URL(req.url).searchParams.get("token") ?? "";
  const ok = await unsubscribe(token);
  return new Response(page(ok), {
    status: ok ? 200 : 400,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function POST(req: Request): Promise<Response> {
  const limited = await applyRateLimit(req, emailUnsubscribeLimiter);
  if (limited) return limited;

  const token = new URL(req.url).searchParams.get("token") ?? "";
  const ok = await unsubscribe(token);
  return new Response(ok ? "unsubscribed" : "invalid token", { status: ok ? 200 : 400 });
}
