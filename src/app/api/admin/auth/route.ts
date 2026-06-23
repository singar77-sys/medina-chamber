/**
 * POST /api/admin/auth/login   — verify password, set session cookie
 * POST /api/admin/auth/logout  — clear session cookie
 *
 * The admin password IS the CHAT_ADMIN_TOKEN env var. One credential
 * controls both the cookie-gated admin API routes and the UI login.
 */

import { NextResponse } from "next/server";
import { signSession, getAdminSecret, ADMIN_COOKIE } from "@/lib/admin-session";
import { authenticateAdmin } from "@/lib/admin-users";

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
  // Single source of the fail-closed floor (getAdminSecret in admin-session.ts):
  // refuse to mint a session when the secret is unset or too weak, so login,
  // the API guard, and verifySession all agree on what "configured" means.
  // The signing secret must be configured — single source of the fail-closed
  // floor (getAdminSecret), so login, the API guard, and verifySession agree
  // on what "configured" means.
  if (!getAdminSecret()) {
    return NextResponse.json({ error: "Admin access not configured." }, { status: 503 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Match the submitted token against the per-admin credentials (ADMIN_USERS),
  // or the shared CHAT_ADMIN_TOKEN when those aren't configured. Returns the
  // admin's display name on success, recorded in the session for accountability.
  const adminName = body.password ? await authenticateAdmin(body.password) : null;
  if (!adminName) {
    // Constant-ish delay to blunt timing attacks even at the HTTP layer
    await new Promise((r) => setTimeout(r, 200));
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const token = await signSession(adminName);
  console.info(`[admin/auth] login: ${adminName}`);
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
