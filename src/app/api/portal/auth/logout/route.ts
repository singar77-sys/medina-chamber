/**
 * POST /api/portal/auth/logout
 *
 * Clears the portal session cookie and redirects to the login page.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { PORTAL_COOKIE, verifyPortalSession } from "@/lib/portal-session";
import { assertSameOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  // Revoke EVERY outstanding session for this member, not just clear this cookie:
  // bump session_epoch so a copied/stolen cookie is invalidated too. Best-effort —
  // logout must still clear the cookie even if the bump fails.
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  if (token) {
    const session = await verifyPortalSession(token);
    if (session) {
      try {
        await db
          .update(contacts)
          .set({ sessionEpoch: sql`${contacts.sessionEpoch} + 1`, updatedAt: sql`now()` })
          .where(eq(contacts.id, session.contactId));
      } catch (err) {
        console.error("[portal/logout] session_epoch bump failed:", err);
      }
    }
  }

  const { origin } = new URL(req.url);
  const res = NextResponse.redirect(`${origin}/portal`);
  res.cookies.set(PORTAL_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
