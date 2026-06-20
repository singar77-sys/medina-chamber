/**
 * GET /api/portal/auth/verify?token=...
 *
 * Verifies a magic link token, sets the portal session cookie,
 * marks portalClaimedAt on first login, and redirects to the dashboard.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  verifyMagicToken,
  signPortalSession,
  PORTAL_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/portal-session";
import { logEngagement } from "@/lib/engagement";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  const { searchParams, origin } = new URL(req.url);
  const token = searchParams.get("token") ?? "";

  const payload = await verifyMagicToken(token);
  if (!payload) {
    return NextResponse.redirect(`${origin}/portal?error=invalid_link`);
  }

  const [contact] = await db
    .select({
      id: contacts.id,
      organizationId: contacts.organizationId,
      portalClaimedAt: contacts.portalClaimedAt,
    })
    .from(contacts)
    .where(eq(contacts.id, payload.contactId))
    .limit(1);

  if (!contact) {
    return NextResponse.redirect(`${origin}/portal?error=not_found`);
  }

  // Mark first-time claim
  if (!contact.portalClaimedAt) {
    await db
      .update(contacts)
      .set({ portalClaimedAt: sql`now()` })
      .where(eq(contacts.id, contact.id));
  }

  const sessionToken = await signPortalSession(
    contact.id,
    contact.organizationId,
  );

  const res = NextResponse.redirect(`${origin}/portal/dashboard`);
  res.cookies.set(PORTAL_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  // Member-ROI signal — a portal login. Best-effort, after the cookie is set so a
  // logging failure can never affect the login (matches every other call site).
  await logEngagement(db, {
    eventType: "portal_login",
    organizationId: contact.organizationId,
    contactId: contact.id,
  });

  return res;
}
