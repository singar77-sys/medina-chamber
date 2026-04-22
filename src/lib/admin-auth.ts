/**
 * Shared auth gate for /api/admin/* routes.
 *
 * Expects a bearer token matching process.env.CHAT_ADMIN_TOKEN, supplied
 * via the Authorization header only:
 *
 *   Authorization: Bearer <token>
 *
 * Query-string tokens (?token=…) are explicitly rejected. They appear in
 * Vercel access logs, browser history, Referer headers, and session-replay
 * tools — leaking a credential through any of those is unacceptable for
 * an admin endpoint.
 *
 * Returns null if authorized, or a Response to return directly otherwise.
 * Uses timing-safe comparison to resist remote timing attacks on the token.
 *
 * If CHAT_ADMIN_TOKEN is unset, every request is rejected — fail-closed,
 * never accidentally open with a default credential.
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function extractToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth) {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m) return m[1].trim();
  }
  return null;
}

/** Returns a 401 Response if unauthorized, null if OK to proceed. */
export function requireAdminToken(req: Request): Response | null {
  const expected = process.env.CHAT_ADMIN_TOKEN;
  if (!expected || expected.length < 16) {
    return Response.json(
      { error: "Admin access not configured." },
      { status: 503 },
    );
  }
  const provided = extractToken(req);
  if (!provided) {
    return Response.json({ error: "Missing token." }, { status: 401 });
  }
  if (!timingSafeEqual(provided, expected)) {
    return Response.json({ error: "Invalid token." }, { status: 401 });
  }
  return null;
}
