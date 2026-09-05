/**
 * /api/portal/auth/verify?token=...
 *
 * GET  — renders an interstitial with a "Sign in" button that POSTs the token. It
 *        NEVER consumes the link or writes anything, so an email-security prefetch
 *        (Outlook SafeLinks, Mimecast, …) that GET-scans the link can't burn it.
 * POST — consumes the magic link exactly once (bumps the contact's
 *        magic_token_epoch under a guard), sets the session cookie, and redirects
 *        to the dashboard. A replay or second click finds the epoch already
 *        advanced → invalid_link.
 */

import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import {
  verifyMagicToken,
  signPortalSession,
  PORTAL_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/portal-session";
import { logEngagement } from "@/lib/engagement";
import { portalDormant } from "../../_dormant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function interstitial(token: string): string {
  // token is base64url + '.' (URL/HTML-safe) — encode into the action defensively.
  const action = `/api/portal/auth/verify?token=${encodeURIComponent(token)}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in · Greater Medina Chamber</title></head>
<body style="margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a">
  <div style="max-width:440px;margin:80px auto;padding:32px;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center">
    <p style="margin:0 0 4px;color:#83BCA9;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:600">Greater Medina Chamber of Commerce</p>
    <h1 style="font-size:20px;margin:0 0 8px">Sign in to your member portal</h1>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px">Click below to finish signing in. This link works once and expires shortly.</p>
    <form method="POST" action="${action}">
      <button type="submit" style="display:inline-block;padding:14px 36px;background:#0C1B33;color:#fff;border:0;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">Sign in &rarr;</button>
    </form>
  </div>
</body></html>`;
}

export async function GET(req: Request): Promise<Response> {
  // Dormant pre-cutover: 404 before the interstitial renders. A live-looking
  // sign-in page for a system GrowthZone still owns is a support burden.
  const dormant = portalDormant();
  if (dormant) return dormant;

  const { origin } = new URL(req.url);
  const token = new URL(req.url).searchParams.get("token") ?? "";
  // Validate the signature so an obviously-bad link errors immediately — but DO
  // NOT consume (no DB write). Consuming the link is POST-only (prefetch-safe).
  const payload = await verifyMagicToken(token);
  if (!payload) {
    return NextResponse.redirect(`${origin}/portal?error=invalid_link`);
  }
  return new Response(interstitial(token), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function POST(req: Request): Promise<Response> {
  // Dormant pre-cutover: 404 before the magic_token_epoch write.
  const dormant = portalDormant();
  if (dormant) return dormant;

  const { origin } = new URL(req.url);
  const token = new URL(req.url).searchParams.get("token") ?? "";

  const payload = await verifyMagicToken(token);
  if (!payload) {
    return NextResponse.redirect(`${origin}/portal?error=invalid_link`, 303);
  }

  // Consume exactly once: bump magic_token_epoch only if it still matches the
  // token's. A replay / second click finds the epoch already advanced → 0 rows.
  // portal_claimed_at is set on first login in the same atomic write.
  const [consumed] = await db
    .update(contacts)
    .set({
      magicTokenEpoch: sql`${contacts.magicTokenEpoch} + 1`,
      portalClaimedAt: sql`coalesce(${contacts.portalClaimedAt}, now())`,
      updatedAt: sql`now()`,
    })
    .where(and(eq(contacts.id, payload.contactId), eq(contacts.magicTokenEpoch, payload.epoch)))
    .returning({
      id: contacts.id,
      organizationId: contacts.organizationId,
      sessionEpoch: contacts.sessionEpoch,
    });

  if (!consumed) {
    // Already used (epoch advanced) or the contact is gone.
    return NextResponse.redirect(`${origin}/portal?error=invalid_link`, 303);
  }

  const sessionToken = await signPortalSession(
    consumed.id,
    consumed.organizationId,
    consumed.sessionEpoch,
  );

  const res = NextResponse.redirect(`${origin}/portal/dashboard`, 303);
  res.cookies.set(PORTAL_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  // Member-ROI signal — a portal login. Best-effort, after the cookie is set so a
  // logging failure can never affect the login.
  await logEngagement(db, {
    eventType: "portal_login",
    organizationId: consumed.organizationId,
    contactId: consumed.id,
  });

  return res;
}
