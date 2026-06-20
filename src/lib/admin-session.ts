/**
 * Admin session cookie — signs and verifies the httpOnly cookie that
 * authenticates the chamber admin UI.
 *
 * Uses SubtleCrypto (Web Crypto API) so it runs in both Node.js and
 * Edge runtimes. The signing secret is CHAT_ADMIN_TOKEN — the same
 * credential used by the cookie-session API guard in admin-auth.ts.
 *
 * Cookie value format: base64url(payload).base64url(hmac)
 * Payload: JSON { iat: number, exp: number }
 * HMAC: SHA-256 keyed on CHAT_ADMIN_TOKEN
 */

export const ADMIN_COOKIE = "admin_session";
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Minimum accepted length for CHAT_ADMIN_TOKEN. A shorter (or unset) secret is
 * treated as "admin not configured" everywhere — the single source of the
 * fail-closed floor shared by signSession, verifySession, the API guard
 * (admin-auth.ts), and the login route (api/admin/auth).
 */
export const MIN_ADMIN_SECRET_LEN = 16;

/** The configured admin secret, or null if unset / below the minimum length. */
export function getAdminSecret(): string | null {
  const secret = process.env.CHAT_ADMIN_TOKEN;
  if (!secret || secret.length < MIN_ADMIN_SECRET_LEN) return null;
  return secret;
}

interface Payload {
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

export async function signSession(): Promise<string> {
  const secret = getAdminSecret();
  if (!secret) throw new Error("CHAT_ADMIN_TOKEN not configured or too short");

  const payload: Payload = { iat: Date.now(), exp: Date.now() + TTL_MS };
  const payloadB64 = toB64u(toBuffer(JSON.stringify(payload)));

  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, toBuffer(payloadB64));

  return `${payloadB64}.${toB64u(sig)}`;
}

export async function verifySession(token: string): Promise<boolean> {
  const secret = getAdminSecret();
  if (!secret) return false;

  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;

  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  try {
    const key = await importKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromB64u(sigB64),
      toBuffer(payloadB64),
    );
    if (!valid) return false;

    const payload: Payload = JSON.parse(
      new TextDecoder().decode(fromB64u(payloadB64)),
    );
    return Date.now() < payload.exp;
  } catch {
    return false;
  }
}
