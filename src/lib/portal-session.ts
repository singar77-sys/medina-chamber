/**
 * Member portal auth — magic link tokens + session cookies.
 *
 * Magic link: 15-minute HMAC-signed token emailed to the member.
 * Portal session: 30-day httpOnly cookie set after successful verification.
 *
 * Both use HMAC-SHA256 keyed on PORTAL_AUTH_SECRET (separate from
 * CHAT_ADMIN_TOKEN — separate secrets = separate blast radius).
 *
 * Token format: base64url(JSON payload).base64url(HMAC signature)
 * Same scheme as admin-session.ts — proven, auditable, zero deps.
 */

export const PORTAL_COOKIE = "portal_session";

const MAGIC_TTL_MS = 15 * 60 * 1000;          // 15 minutes
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // seconds, for cookie maxAge

// ── Payload shapes ─────────────────────────────────────────────────────────────

export interface MagicLinkPayload {
  contactId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface PortalSessionPayload {
  contactId: string;
  organizationId: string;
  exp: number;
}

// ── Crypto helpers ─────────────────────────────────────────────────────────────

function getSecret(): string {
  const s = process.env.PORTAL_AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("PORTAL_AUTH_SECRET not configured (min 32 chars)");
  }
  return s;
}

async function importKey(secret: string): Promise<CryptoKey> {
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

async function signPayload(payload: object): Promise<string> {
  const payloadB64 = toB64u(toBuffer(JSON.stringify(payload)));
  const key = await importKey(getSecret());
  const sig = await crypto.subtle.sign("HMAC", key, toBuffer(payloadB64));
  return `${payloadB64}.${toB64u(sig)}`;
}

async function verifyToken<T extends { exp: number }>(token: string): Promise<T | null> {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;

  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  try {
    const key = await importKey(getSecret());
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromB64u(sigB64),
      toBuffer(payloadB64),
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(fromB64u(payloadB64)),
    ) as T;

    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

// ── Magic link ─────────────────────────────────────────────────────────────────

export async function signMagicToken(
  contactId: string,
  email: string,
): Promise<string> {
  return signPayload({
    contactId,
    email,
    iat: Date.now(),
    exp: Date.now() + MAGIC_TTL_MS,
  });
}

export async function verifyMagicToken(
  token: string,
): Promise<MagicLinkPayload | null> {
  const p = await verifyToken<MagicLinkPayload>(token);
  // A magic-link token must carry an email — reject a session token (no email)
  // reused here, since the two classes share PORTAL_AUTH_SECRET and verify alike.
  return p && typeof p.email === "string" && p.email ? p : null;
}

// ── Portal session ─────────────────────────────────────────────────────────────

export async function signPortalSession(
  contactId: string,
  organizationId: string,
): Promise<string> {
  return signPayload({
    contactId,
    organizationId,
    exp: Date.now() + SESSION_TTL_MS,
  });
}

export async function verifyPortalSession(
  token: string,
): Promise<PortalSessionPayload | null> {
  const p = await verifyToken<PortalSessionPayload>(token);
  // A session token must carry an organizationId — reject a magic-link token (which
  // has none) reused as a session cookie, so it can never be honored with org=undefined.
  return p && typeof p.organizationId === "string" && p.organizationId ? p : null;
}
