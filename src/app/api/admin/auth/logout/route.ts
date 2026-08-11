/**
 * POST /api/admin/auth/logout — clear the admin session cookie.
 *
 * AdminNav posts here to sign out. Lives at its own path because the login
 * route (../route.ts) only matches /api/admin/auth; a POST to
 * /api/admin/auth/logout would otherwise 404 and never clear the cookie.
 */

import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-session";

export async function POST(): Promise<Response> {
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
