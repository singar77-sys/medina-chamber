/**
 * POST /api/admin/auth/logout — clear the admin session cookie.
 *
 * AdminNav posts here to sign out. Lives at its own path because the login
 * route (../route.ts) only matches /api/admin/auth; a POST to
 * /api/admin/auth/logout would otherwise 404 and never clear the cookie.
 */

import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-session";
import { assertSameOrigin } from "@/lib/csrf";

export async function POST(req: Request): Promise<Response> {
  // Same-origin check like every other cookie-acting route — without it any
  // cross-site page could force-logout an admin via an auto-submitted form.
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return res;
}
