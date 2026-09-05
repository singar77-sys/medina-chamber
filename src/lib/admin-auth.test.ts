import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_COOKIE, signSession } from "./admin-session";
import { requireAdminSession } from "./admin-auth";

// The gate on every /api/admin/* route. Its four fail-closed branches (CSRF,
// unusable ADMIN_USERS, bad/absent cookie, revoked subject) were only covered
// indirectly by a single route test, so three of them could be deleted without
// turning the suite red. Real HMAC end to end — no mock of admin-session.

const TOKEN_A = "a".repeat(32); // ADMIN_USERS tokens must be >= 32 chars
const TOKEN_B = "b".repeat(32);

beforeEach(() => {
  vi.stubEnv("ADMIN_SESSION_SECRET", "s".repeat(48));
  vi.stubEnv("ADMIN_USERS", `Stephanie:${TOKEN_A},Jaclyn:${TOKEN_B}`);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function post(cookie?: string, headers: Record<string, string> = {}): Request {
  return new Request("https://medinaohchamber.com/api/admin/blog", {
    method: "POST",
    headers: {
      host: "medinaohchamber.com",
      origin: "https://medinaohchamber.com",
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
  });
}

describe("requireAdminSession", () => {
  it("passes a same-origin POST carrying a valid session for a current admin", async () => {
    const token = await signSession("Stephanie");
    expect(await requireAdminSession(post(`${ADMIN_COOKIE}=${token}`))).toBeNull();
  });

  it("finds the session cookie alongside other cookies", async () => {
    const token = await signSession("Stephanie");
    const cookie = `theme=dark; ${ADMIN_COOKIE}=${token}; _vercel_jwt=x`;
    expect(await requireAdminSession(post(cookie))).toBeNull();
  });

  it("401s when no admin_session cookie is present", async () => {
    expect((await requireAdminSession(post("theme=dark")))?.status).toBe(401);
    expect((await requireAdminSession(post()))?.status).toBe(401);
  });

  it("401s a tampered cookie (payload edited, signature no longer matches)", async () => {
    const token = await signSession("Stephanie");
    const [payload, sig] = token.split(".");
    const forged = `${btoa(JSON.stringify({ sub: "Stephanie", iat: Date.now(), exp: Date.now() + 6e5 }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")}.${sig}`;
    expect(forged).not.toBe(`${payload}.${sig}`);
    expect((await requireAdminSession(post(`${ADMIN_COOKIE}=${forged}`)))?.status).toBe(401);
  });

  it("401s a still-signed session whose subject was removed from ADMIN_USERS", async () => {
    // Per-admin revocation: deleting Stephanie's entry must lock out her live
    // session on the next request, not 12 hours later when the cookie expires.
    const token = await signSession("Stephanie");
    vi.stubEnv("ADMIN_USERS", `Jaclyn:${TOKEN_B}`);
    expect((await requireAdminSession(post(`${ADMIN_COOKIE}=${token}`)))?.status).toBe(401);
  });

  it("503s on a malformed ADMIN_USERS even with a valid cookie (fail closed)", async () => {
    const token = await signSession("Stephanie");
    vi.stubEnv("ADMIN_USERS", "nocolon");
    vi.stubEnv("CHAT_ADMIN_TOKEN", "c".repeat(32)); // must NOT rescue the bad value
    expect((await requireAdminSession(post(`${ADMIN_COOKIE}=${token}`)))?.status).toBe(503);
  });

  it("403s a cross-site POST before looking at the cookie at all", async () => {
    const token = await signSession("Stephanie");
    const res = await requireAdminSession(
      post(`${ADMIN_COOKIE}=${token}`, { origin: "https://evil.example" }),
    );
    expect(res?.status).toBe(403);
  });
});
