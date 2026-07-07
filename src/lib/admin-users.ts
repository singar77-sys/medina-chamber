/**
 * Per-admin login credentials.
 *
 * The optional ADMIN_USERS env var maps named admins to personal access
 * tokens, so the admin area can attribute a login to a person and revoke one
 * person without rotating everyone's access.
 *
 * Format: comma-separated `Name:token` pairs. The token must be URL-safe
 * (hex or base64url — no ':' or ',' characters). Example:
 *   ADMIN_USERS="Stephanie:3f9a…,Jaclyn:b71c…"
 *
 * Behaviour:
 *   - ADMIN_USERS SET   → only these per-person tokens may log in, and the
 *                         session records which admin authenticated. Revoke a
 *                         person by deleting their entry.
 *   - ADMIN_USERS UNSET → the shared CHAT_ADMIN_TOKEN is the sole login
 *                         credential (recorded as "Admin"), exactly as before.
 *
 * The session cookie is signed with the dedicated ADMIN_SESSION_SECRET (see
 * admin-session.ts), independent of both CHAT_ADMIN_TOKEN and ADMIN_USERS —
 * rotating a login credential never invalidates live sessions, and vice versa.
 */

import { getAdminSecret } from "@/lib/admin-session";

export interface AdminUser {
  name: string;
  token: string;
}

/** Parse ADMIN_USERS into a list of {name, token}. Malformed entries are skipped. */
export function parseAdminUsers(): AdminUser[] {
  const raw = process.env.ADMIN_USERS;
  if (!raw || !raw.trim()) return [];

  const users: AdminUser[] = [];
  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    // Split on the FIRST colon: name before, token after. Tokens are expected
    // to be url-safe (hex/base64url) so they contain no ':' or ','.
    const i = trimmed.indexOf(":");
    if (i <= 0) continue; // need both a non-empty name and a token
    const name = trimmed.slice(0, i).trim();
    const token = trimmed.slice(i + 1).trim();
    if (name && token) users.push({ name, token });
  }
  return users;
}

/**
 * Constant-time string equality. Hashes both inputs to a fixed 32 bytes and
 * compares those, so neither the boolean result nor the input lengths leak
 * via timing. Uses Web Crypto (runs in both Node and Edge runtimes).
 */
async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const va = new Uint8Array(da);
  const vb = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

/**
 * Authenticate a submitted token. Returns the admin's display name on success,
 * else null. Every candidate is checked (no short-circuit) so timing never
 * reveals how many admins exist or which token matched.
 *
 * Falls back to the shared CHAT_ADMIN_TOKEN when ADMIN_USERS is unset OR
 * malformed (empty parse), so a bad ADMIN_USERS value can never lock admins out.
 */
export async function authenticateAdmin(submitted: string): Promise<string | null> {
  if (!submitted) return null;

  const users = parseAdminUsers();
  let candidates: AdminUser[];
  if (users.length > 0) {
    candidates = users;
  } else {
    const shared = getAdminSecret();
    candidates = shared ? [{ name: "Admin", token: shared }] : [];
  }

  let matched: string | null = null;
  for (const c of candidates) {
    if (await constantTimeEqual(submitted, c.token)) matched = c.name;
  }
  return matched;
}

/**
 * Whether a session's subject (the admin's name, stored as `sub`) is still a
 * currently-valid admin. Enables PER-ADMIN revocation: with named accounts
 * (ADMIN_USERS set), a session whose `sub` is no longer in ADMIN_USERS is
 * rejected on its next request — without waiting out the 12h expiry or rotating
 * the shared signing secret (which logs everyone out).
 *
 * Two accept-all cases keep this safe and backward-compatible:
 *   - Shared-token mode (ADMIN_USERS unset): there is no per-person identity to
 *     revoke, so any validly-signed session is accepted.
 *   - A session with no `sub` (minted before named accounts existed): grandfathered
 *     in. Such tokens can only be produced by our own server and expire within 12h
 *     of this code shipping, so the window is bounded.
 */
export function isCurrentAdmin(sub: string | undefined): boolean {
  const users = parseAdminUsers();
  if (users.length === 0) return true; // shared-token mode — nothing to revoke
  if (!sub) return true;               // legacy pre-named-account session (expires <12h)
  return users.some((u) => u.name === sub);
}
