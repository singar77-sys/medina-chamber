import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Integration test for the admin login route: the dedicated limiter (5/min +
// 20/hour per IP) must 429 a brute-force flood BEFORE the credential check, and a
// good login must still succeed for an IP outside the window. We drive the REAL
// rate-limit module over its in-memory path (no Upstash) so the window is
// deterministic, and re-import the route fresh per test so limiter state resets.

// No Upstash → in-memory limiter (deterministic, per-isolate window).
vi.mock("@/lib/upstash", () => ({ getRedis: () => null }));

const LOGIN = "correct-horse-battery-staple-token"; // ≥16 chars

async function freshRoute() {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("CHAT_ADMIN_TOKEN", LOGIN);
  vi.stubEnv("ADMIN_SESSION_SECRET", "s".repeat(48));
  delete process.env.ADMIN_USERS;
  return (await import("./route")).POST;
}

function loginReq(password: string, ip: string): Request {
  return new Request("http://localhost/api/admin/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
      "user-agent": "vitest-agent/1.0",
    },
    body: JSON.stringify({ password }),
  });
}

beforeEach(() => {
  // Silence the structured failed-login logs during the flood.
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("POST /api/admin/auth/login — rate limiting", () => {
  it("429s after 5 bad attempts in the minute window from one IP", async () => {
    const POST = await freshRoute();
    const ip = "203.0.113.10";

    // First 5 bad attempts are processed (401), not rate-limited.
    for (let i = 0; i < 5; i++) {
      const res = await POST(loginReq("wrong-password", ip));
      expect(res.status).toBe(401);
    }
    // 6th trips the per-minute cap → fast 429, no credential check.
    const blocked = await POST(loginReq("wrong-password", ip));
    expect(blocked.status).toBe(429);
  });

  it("a good login still works for a fresh IP (outside the flooded window)", async () => {
    const POST = await freshRoute();

    // Flood one IP until it's blocked.
    const badIp = "203.0.113.20";
    for (let i = 0; i < 6; i++) await POST(loginReq("wrong", badIp));
    expect((await POST(loginReq("wrong", badIp))).status).toBe(429);

    // A different IP has its own budget → the correct credential logs in (200)
    // and a session cookie is set.
    const res = await POST(loginReq(LOGIN, "198.51.100.5"));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/admin_session=/);
  });

  it("the 429 short-circuits before the credential check (even a valid password is blocked)", async () => {
    const POST = await freshRoute();
    const ip = "203.0.113.30";

    // Burn the minute budget with bad attempts.
    for (let i = 0; i < 5; i++) await POST(loginReq("wrong", ip));
    // Now even the CORRECT password is 429'd — proof the limiter runs first.
    const res = await POST(loginReq(LOGIN, ip));
    expect(res.status).toBe(429);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("logs a failed attempt without leaking the submitted password", async () => {
    const POST = await freshRoute();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const secret = "super-secret-guess-value";

    await POST(loginReq(secret, "203.0.113.40"));

    const logged = warn.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(logged).toMatch(/failed login/);
    expect(logged).toMatch(/reason=bad_credential/);
    expect(logged).toMatch(/ipHash=/);
    // The submitted password must never appear in the logs.
    expect(logged).not.toContain(secret);
  });
});
