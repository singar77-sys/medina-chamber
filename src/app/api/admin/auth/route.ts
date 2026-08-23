/**
 * POST /api/admin/auth  — verify password, set session cookie.
 * (Logout lives at /api/admin/auth/logout/route.ts — see AdminNav.)
 *
 * The login credential is a per-admin ADMIN_USERS token when those are
 * configured (CHAT_ADMIN_TOKEN is then unnecessary and can be removed), else
 * the shared CHAT_ADMIN_TOKEN. The session cookie is signed with the SEPARATE
 * ADMIN_SESSION_SECRET, so login credentials and the cookie-signing key rotate
 * independently.
 *
 * The login route is rate-limited (limitAdminAuth: 5/min + 20/hour per IP) BEFORE
 * the constant-time credential check, so a spammed brute-force is 429'd fast
 * without ever running the expensive comparison. Failed attempts are logged with
 * a hashed IP, user agent, and reason — never the submitted password.
 */

import { NextResponse } from "next/server";
import { signSession, ADMIN_COOKIE } from "@/lib/admin-session";
import { authenticateAdmin, getAdminAuthStatus } from "@/lib/admin-users";
import { limitAdminAuth, getRequestIp } from "@/lib/rate-limit";

/** SHA-256 the client IP to an 8-char prefix so logs correlate attempts without
 *  storing a raw IP. */
async function hashIp(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest).slice(0, 4))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function logFailedLogin(req: Request, reason: string): Promise<void> {
  try {
    const ipHash = await hashIp(getRequestIp(req));
    const ua = req.headers.get("user-agent")?.slice(0, 200) ?? "";
    // Structured, secret-free: never the submitted token/password.
    console.warn(
      `[admin/auth] failed login: reason=${reason} ipHash=${ipHash} ua=${JSON.stringify(ua)} at=${new Date().toISOString()}`,
    );
  } catch {
    // Logging must never break the auth response.
  }
}

export async function POST(req: Request): Promise<Response> {
  // Rate-limit BEFORE any credential work so a brute-force flood gets a fast 429
  // and never reaches the constant-time comparison (5/min + 20/hour per IP).
  const rl = await limitAdminAuth(req);
  if (rl) {
    await logFailedLogin(req, rl.reason);
    return rl.response;
  }

  // Single source of the fail-closed floor (getAdminAuthStatus in
  // admin-users.ts): refuse to mint a session when no usable credential is
  // configured, or when ADMIN_USERS is set but malformed/weak — a broken
  // named-user config must surface as an explicit 503, never silently fall
  // back to the legacy shared token. Login and the API guard share this check.
  const authStatus = getAdminAuthStatus();
  if (authStatus !== "ok") {
    return NextResponse.json(
      {
        error:
          authStatus === "misconfigured"
            ? "Admin authentication misconfigured."
            : "Admin access not configured.",
      },
      { status: 503 },
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    await logFailedLogin(req, "bad_body");
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Match the submitted token against the per-admin credentials (ADMIN_USERS),
  // or the shared CHAT_ADMIN_TOKEN when those aren't configured. Returns the
  // admin's display name on success, recorded in the session for accountability.
  const adminName = body.password ? await authenticateAdmin(body.password) : null;
  if (!adminName) {
    await logFailedLogin(req, "bad_credential");
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
