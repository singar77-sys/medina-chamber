/**
 * POST /api/admin/auth/login   — verify password, set session cookie
 * POST /api/admin/auth/logout  — clear session cookie
 *
 * The admin password IS the CHAT_ADMIN_TOKEN env var. One credential
 * controls both the bearer-token API routes and the UI login.
 */

import { NextResponse } from "next/server";
import { signSession, ADMIN_COOKIE } from "@/lib/admin-session";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const action = url.pathname.endsWith("/logout") ? "logout" : "login";

  if (action === "logout") {
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

  // Login
  const expected = process.env.CHAT_ADMIN_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "Admin access not configured." }, { status: 503 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { password } = body;
  if (!password || !timingSafeEqual(password, expected)) {
    // Constant-ish delay to blunt timing attacks even at the HTTP layer
    await new Promise((r) => setTimeout(r, 200));
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const token = await signSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 12 * 60 * 60,
    path: "/",
  });
  return res;
}
