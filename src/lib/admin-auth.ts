/**
 * Shared auth gate for /api/admin/* routes.
 *
 * Reads the httpOnly `admin_session` cookie and verifies it with
 * verifySession (HMAC-SHA256 over ADMIN_SESSION_SECRET, see admin-session.ts).
 * This replaces the old Bearer-token / ?token= guard — the session cookie
 * is set server-side at login and is never exposed to JavaScript, access
 * logs, browser history, or Referer headers.
 *
 * Fail-closed:
 *   - 503 if CHAT_ADMIN_TOKEN is unset or shorter than 16 chars (not
 *     configured — never accidentally open with a default credential).
 *   - 401 if the cookie is missing or fails verification.
 *   - null if authorized and OK to proceed.
 *
 * Mirrors the page-level gate in src/proxy.ts so API routes and pages
 * enforce the same session check.
 *
 * The cookie header is parsed directly off the plain Request rather than
 * via next/headers cookies(), so plain-Request route handlers and tests
 * that construct raw Request objects work unchanged.
 */

import { ADMIN_COOKIE, getAdminSecret, readSession } from "@/lib/admin-session";
import { isCurrentAdmin } from "@/lib/admin-users";
import { assertSameOrigin } from "@/lib/csrf";

function extractSessionCookie(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    if (part.slice(0, i).trim() === ADMIN_COOKIE) return part.slice(i + 1).trim();
  }
  return null;
}

/** 503 if not configured, 401 if cookie missing/invalid, null if OK. Fail-closed. */
export async function requireAdminSession(req: Request): Promise<Response | null> {
  // CSRF defense-in-depth: reject cross-origin state-changing requests. The admin
  // cookie is already SameSite=Strict; this is a second layer. Safe methods and
  // Origin-less requests pass through untouched.
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  if (!getAdminSecret())
    return Response.json({ error: "Admin access not configured." }, { status: 503 });
  const token = extractSessionCookie(req);
  if (!token) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const payload = await readSession(token);
  if (!payload) return Response.json({ error: "Unauthorized." }, { status: 401 });
  // Per-admin revocation: reject a session whose subject is no longer a current
  // admin (removed from ADMIN_USERS) without waiting out the 12h expiry.
  if (!isCurrentAdmin(payload.sub))
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  return null;
}
