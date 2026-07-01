/**
 * Admin session cookie — signs and verifies the httpOnly cookie that
 * authenticates the chamber admin UI.
 *
 * Uses SubtleCrypto (Web Crypto API) so it runs in both Node.js and
 * Edge runtimes.
 *
 * The signing secret is ADMIN_SESSION_SECRET — a dedicated HMAC key that is
 * SEPARATE from the login credential (CHAT_ADMIN_TOKEN / ADMIN_USERS). This
 * mirrors the portal's PORTAL_AUTH_SECRET split: rotating the human-typed login
 * password no longer invalidates every live admin session, and rotating the
 * signing secret is the deliberate lever that DOES revoke all sessions. Separate
 * secrets = separate blast radius.
 *
 * Fail-closed in production: getSessionSecret throws at first use (sign OR verify)
 * if ADMIN_SESSION_SECRET is unset or shorter than 32 chars when NODE_ENV is
 * "production", so a misconfigured deploy can never fall back to a weak/derived
 * key. In dev it falls back to CHAT_ADMIN_TOKEN for zero-config local runs.
 *
 * Cookie value format: base64url(payload).base64url(hmac)
 * Payload: JSON { sub?: string, iat: number, exp: number }
 * HMAC: SHA-256 keyed on ADMIN_SESSION_SECRET
 */

export const ADMIN_COOKIE = "admin_session";
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Minimum accepted length for CHAT_ADMIN_TOKEN (the LOGIN credential). A shorter
 * (or unset) value is treated as "admin not configured" everywhere — the single
 * source of the fail-closed floor shared by the API guard (admin-auth.ts) and the
 * login route (api/admin/auth).
 */
export const MIN_ADMIN_SECRET_LEN = 16;

/** Minimum length for the dedicated ADMIN_SESSION_SECRET signing key. */
export const MIN_SESSION_SECRET_LEN = 32;

/**
 * The configured admin LOGIN credential, or null if unset / below the minimum
 * length. This gates whether admin is "configured" at all (login + API guard);
 * it is NOT the cookie signing key (see getSessionSecret).
 */
export function getAdminSecret(): string | null {
  const secret = process.env.CHAT_ADMIN_TOKEN;
  if (!secret || secret.length < MIN_ADMIN_SECRET_LEN) return null;
  return secret;
}

/**
 * The dedicated HMAC signing key for the admin session cookie.
 *
 * Production: ADMIN_SESSION_SECRET is REQUIRED and must be ≥32 chars — throws
 * otherwise (fail closed; never sign/verify with a weak or missing key).
 *
 * Development: falls back to CHAT_ADMIN_TOKEN so local runs need zero extra
 * config. The fallback never applies in production.
 */
export function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret && secret.length >= MIN_SESSION_SECRET_LEN) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      secret
        ? "ADMIN_SESSION_SECRET too short (min 32 chars)"
        : "ADMIN_SESSION_SECRET not configured",
    );
  }

  // Dev/test convenience only: reuse the login credential when the dedicated
  // secret isn't set. Never reached in production (the throw above fires first).
  const fallback = getAdminSecret();
  if (!fallback) {
    throw new Error("ADMIN_SESSION_SECRET not configured (and no CHAT_ADMIN_TOKEN fallback)");
  }
  return fallback;
}

interface Payload {
  /**
   * Subject — the admin's display name (per-admin accounts, admin-users.ts).
   * Optional for backward-compat with sessions minted before named accounts.
   */
  sub?: string;
  iat: number;
  exp: number;
}

async function importKey(secret: string): Promise<CryptoKey> {
  // importKey needs an ArrayBuffer; .encode().buffer is ArrayBufferLike — cast safe here
  const raw = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    "raw",
    raw.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toB64u(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function fromB64u(s: string): ArrayBuffer {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer as ArrayBuffer;
}

function toBuffer(s: string): ArrayBuffer {
  return new TextEncoder().encode(s).buffer as ArrayBuffer;
}

export async function signSession(sub?: string): Promise<string> {
  const secret = getSessionSecret();

  const payload: Payload = {
    ...(sub ? { sub } : {}),
    iat: Date.now(),
    exp: Date.now() + TTL_MS,
  };
  const payloadB64 = toB64u(toBuffer(JSON.stringify(payload)));

  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, toBuffer(payloadB64));

  return `${payloadB64}.${toB64u(sig)}`;
}

/**
 * Verify the session cookie and return its payload (including `sub`, the admin
 * name) when valid, or null. The signature is checked against the server
 * secret and the token must be unexpired.
 */
export async function readSession(token: string): Promise<Payload | null> {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;

  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    // Signing key unset/too short. In production getSessionSecret throws (fail
    // closed → no valid session); treat as unverifiable rather than crashing the
    // guard so admin routes cleanly 401 instead of 500.
    return null;
  }

  try {
    const key = await importKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromB64u(sigB64),
      toBuffer(payloadB64),
    );
    if (!valid) return null;

    const payload: Payload = JSON.parse(
      new TextDecoder().decode(fromB64u(payloadB64)),
    );
    if (Date.now() >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Boolean gate used by the proxy guard and the /api/admin/* guard. */
export async function verifySession(token: string): Promise<boolean> {
  return (await readSession(token)) !== null;
}
