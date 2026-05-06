/**
 * POST /api/portal/auth/logout
 *
 * Clears the portal session cookie and redirects to the login page.
 */

import { NextResponse } from "next/server";
import { PORTAL_COOKIE } from "@/lib/portal-session";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
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
