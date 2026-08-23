/**
 * Per-admin login credentials.
 *
 * The optional ADMIN_USERS env var maps named admins to personal access
 * tokens, so the admin area can attribute a login to a person and revoke one
 * person without rotating everyone's access.
 *
 * Format: comma-separated `Name:token` pairs. Tokens must be URL-safe
 * (hex or base64url — no ',' characters) and at least MIN_ADMIN_USER_TOKEN_LEN
 * characters — generate with `openssl rand -hex 32`. Example:
 *   ADMIN_USERS="Stephanie:3f9a…,Jaclyn:b71c…"
 *
 * Three states (see getAdminUsersConfig):
 *   - UNSET/blank        → "shared": the shared CHAT_ADMIN_TOKEN is the sole
 *                          login credential (recorded as "Admin"), as before.
 *   - all entries valid  → "named": ONLY these per-person tokens may log in
 *                          (CHAT_ADMIN_TOKEN is ignored and can be removed),
 *                          and the session records which admin authenticated.
 *                          Revoke a person by deleting their entry.
 *   - anything malformed → "invalid": admin auth FAILS CLOSED — no login, and
 *     or a weak token      live sessions are rejected — until the value is
 *                          fixed or unset. A typo'd ADMIN_USERS must never
 *                          silently re-enable the shared token or un-revoke a
 *                          removed admin, and silently dropping one weak entry
 *                          would just hide the mistake; refusing everything is
 *                          the only state an operator will actually notice.
 *
 * The session cookie is signed with the dedicated ADMIN_SESSION_SECRET (see
 * admin-session.ts), independent of both CHAT_ADMIN_TOKEN and ADMIN_USERS —
 * rotating a login credential never invalidates live sessions, and vice versa.
 */

import { getAdminSecret } from "@/lib/admin-session";
import { constantTimeEqual } from "@/lib/constant-time";

export interface AdminUser {
  name: string;
  token: string;
}

/**
 * Minimum length for an individual ADMIN_USERS token. 32 chars of hex is 128
 * bits — these are machine-generated secrets, not human passwords, so there is
 * no reason to permit anything guessable.
 */
export const MIN_ADMIN_USER_TOKEN_LEN = 32;

export type AdminUsersConfig =
  | { mode: "shared" }
  | { mode: "named"; users: AdminUser[] }
  | { mode: "invalid"; reason: string };

// Log each distinct misconfiguration once per process, not once per request.
let warnedInvalidReason: string | null = null;

function invalid(reason: string): AdminUsersConfig {
  if (warnedInvalidReason !== reason) {
    warnedInvalidReason = reason;
    console.error(
      `[admin-users] ADMIN_USERS is misconfigured (${reason}) — admin auth is disabled (fail closed) until the value is fixed or unset.`,
    );
  }
  return { mode: "invalid", reason };
}

/**
 * Classify the ADMIN_USERS value. Entries split on the FIRST colon (name
 * before, token after); blank entries from a trailing/double comma are
 * tolerated, but a malformed pair or an under-length token invalidates the
 * whole value — see the module doc for why partial acceptance is worse.
 * The reason string never includes token material.
 */
export function getAdminUsersConfig(): AdminUsersConfig {
  const raw = process.env.ADMIN_USERS;
  if (!raw || !raw.trim()) return { mode: "shared" };

  const users: AdminUser[] = [];
  const entries = raw.split(",");
  for (let i = 0; i < entries.length; i++) {
    const trimmed = entries[i].trim();
    if (!trimmed) continue;
    const sep = trimmed.indexOf(":");
    const name = sep > 0 ? trimmed.slice(0, sep).trim() : "";
    const token = sep > 0 ? trimmed.slice(sep + 1).trim() : "";
    if (!name || !token) return invalid(`entry ${i + 1} is not a Name:token pair`);
    if (token.length < MIN_ADMIN_USER_TOKEN_LEN) {
      return invalid(
        `token for "${name}" is shorter than ${MIN_ADMIN_USER_TOKEN_LEN} chars — generate with: openssl rand -hex 32`,
      );
    }
    users.push({ name, token });
  }
  if (users.length === 0) return invalid("no Name:token entries");
  return { mode: "named", users };
}

/**
 * Authenticate a submitted token. Returns the admin's display name on success,
 * else null. Every candidate is checked (no short-circuit) so timing never
 * reveals how many admins exist or which token matched.
 *
 * Named mode accepts ONLY the per-admin tokens; shared mode (ADMIN_USERS
 * unset) accepts ONLY CHAT_ADMIN_TOKEN; a misconfigured ADMIN_USERS accepts
 * nothing (fail closed — never fall back to the shared token).
 */
export async function authenticateAdmin(submitted: string): Promise<string | null> {
  if (!submitted) return null;

  const cfg = getAdminUsersConfig();
  if (cfg.mode === "invalid") return null;

  let candidates: AdminUser[];
  if (cfg.mode === "named") {
    candidates = cfg.users;
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
 *   - Shared-token mode: accept-all — there is no per-person identity to revoke.
 *   - Named mode: the session must carry a `sub` that is a current admin.
 *     (Sessions have carried `sub` since named accounts shipped, so a missing
 *     `sub` means a forged or ancient token — reject it.)
 *   - Misconfigured ADMIN_USERS: reject-all, matching the disabled login.
 */
export function isCurrentAdmin(sub: string | undefined): boolean {
  const cfg = getAdminUsersConfig();
  if (cfg.mode === "shared") return true;
  if (cfg.mode === "invalid") return false;
  if (!sub) return false;
  return cfg.users.some((u) => u.name === sub);
}

/**
 * Whether admin login is currently possible, and why not when it isn't.
 * Shared by the login route and the API guard so both agree on what
 * "configured" means:
 *   - "misconfigured" → ADMIN_USERS is set but invalid (fail closed).
 *   - "unconfigured"  → shared mode without a usable CHAT_ADMIN_TOKEN.
 * Named mode needs NO CHAT_ADMIN_TOKEN — once per-admin tokens are live the
 * legacy shared credential can be deleted from the environment.
 */
export function getAdminAuthStatus(): "ok" | "unconfigured" | "misconfigured" {
  const cfg = getAdminUsersConfig();
  if (cfg.mode === "invalid") return "misconfigured";
  if (cfg.mode === "named") return "ok";
  return getAdminSecret() ? "ok" : "unconfigured";
}
