import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Admin session cookie signing/verification. The point of PR1 item 1 is that the
// LOGIN credential (CHAT_ADMIN_TOKEN) and the cookie SIGNING key
// (ADMIN_SESSION_SECRET) are now SEPARATE. These tests prove the separation:
// rotating the login credential must NOT invalidate live sessions, rotating the
// signing secret MUST, and production fails closed on a missing/short secret.

import { signSession, readSession, verifySession } from "./admin-session";

const SIGNING = "s".repeat(48); // dedicated signing secret, ≥32 chars
const OTHER_SIGNING = "z".repeat(48);
const LOGIN = "login-credential-abcdef123456"; // ≥16 chars

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("ADMIN_SESSION_SECRET", SIGNING);
  vi.stubEnv("CHAT_ADMIN_TOKEN", LOGIN);
  delete process.env.ADMIN_USERS;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("admin-session — credential/signing-key separation", () => {
  it("round-trips a session signed with ADMIN_SESSION_SECRET", async () => {
    const cookie = await signSession("Stephanie");
    expect(await readSession(cookie)).toMatchObject({ sub: "Stephanie" });
    expect(await verifySession(cookie)).toBe(true);
  });

  it("rotating the LOGIN credential does NOT invalidate an existing session", async () => {
    const cookie = await signSession("Admin");
    // Simulate rotating the human-typed login password. The signing key is
    // untouched, so the already-issued cookie must still verify.
    vi.stubEnv("CHAT_ADMIN_TOKEN", "a-completely-different-login-token-999");
    expect(await verifySession(cookie)).toBe(true);
    expect(await readSession(cookie)).toMatchObject({ sub: "Admin" });
  });

  it("rotating ADMIN_SESSION_SECRET DOES invalidate an existing session", async () => {
    const cookie = await signSession("Admin");
    vi.stubEnv("ADMIN_SESSION_SECRET", OTHER_SIGNING);
    expect(await verifySession(cookie)).toBe(false);
    expect(await readSession(cookie)).toBeNull();
  });

  it("rejects a tampered cookie", async () => {
    const cookie = await signSession();
    const tampered = `${cookie.slice(0, -3)}${cookie.endsWith("zzz") ? "aaa" : "zzz"}`;
    expect(await verifySession(tampered)).toBe(false);
  });

  it("rejects an expired session", async () => {
    const t0 = 1_700_000_000_000;
    const now = vi.spyOn(Date, "now").mockReturnValue(t0);
    const cookie = await signSession();
    now.mockReturnValue(t0 + 13 * 60 * 60 * 1000); // 13h later — past the 12h TTL
    expect(await verifySession(cookie)).toBe(false);
  });

  it("rejects malformed cookies", async () => {
    expect(await verifySession("")).toBe(false);
    expect(await verifySession("no-dot-here")).toBe(false);
  });
});

describe("admin-session — production fail-closed on the signing secret", () => {
  it("throws when ADMIN_SESSION_SECRET is unset in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    await expect(signSession()).rejects.toThrow(/ADMIN_SESSION_SECRET/);
  });

  it("throws when ADMIN_SESSION_SECRET is too short in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_SESSION_SECRET", "too-short"); // < 32 chars
    await expect(signSession()).rejects.toThrow(/too short/);
  });

  it("does NOT fall back to CHAT_ADMIN_TOKEN in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    vi.stubEnv("CHAT_ADMIN_TOKEN", LOGIN); // present, but must not be used as the signing key
    await expect(signSession()).rejects.toThrow(/ADMIN_SESSION_SECRET/);
  });

  it("readSession returns null (no throw) when the prod signing secret is missing", async () => {
    // A session cookie signed in a good config, read back under a broken prod
    // config, must cleanly fail to verify (guard 401s) rather than crash (500).
    const cookie = await signSession("Admin");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    expect(await readSession(cookie)).toBeNull();
  });

  it("dev falls back to CHAT_ADMIN_TOKEN when ADMIN_SESSION_SECRET is unset", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    vi.stubEnv("CHAT_ADMIN_TOKEN", LOGIN);
    const cookie = await signSession("Admin");
    expect(await verifySession(cookie)).toBe(true);
  });
});
