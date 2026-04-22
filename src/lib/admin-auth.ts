/**
 * Shared auth gate for /api/admin/* routes.
 *
 * Expects a bearer token matching process.env.CHAT_ADMIN_TOKEN. The
 * token can arrive via:
 *   - Authorization: Bearer <token>   (preferred)
 *   - ?token=<token>                  (convenient for browser hits)
 *
 * Returns null if authorized, or a 401 Response to return directly
 * otherwise. Uses timing-safe comparison to resist remote timing
 * attacks on the token value.
 *
 * If CHAT_ADMIN_TOKEN is unset in the environment, every admin
 * request is rejected — fail-closed, never accidentally open the
 * door with a default credential.
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
  const url = new URL(req.url);
  const qs = url.searchParams.get("token");
  if (qs) return qs.trim();
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
