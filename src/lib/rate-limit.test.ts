import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Controllable mocks ─────────────────────────────────────────────────────
//
// limitPortalAuth / limitPortalCheckout build their limiter lazily on first
// call. The limiter is Upstash when getRedis() returns a client, in-memory
// otherwise. We drive both paths here:
//
//   • redisStub = null  → in-memory limiter (deterministic, drive over limit)
//   • redisStub = {}     → Upstash path; Ratelimit.limit is our mock and can
//                          be made to throw, exercising the fail-open branch.

let redisStub: unknown = null;
vi.mock("@/lib/upstash", () => ({
  getRedis: () => redisStub,
}));

// Mock the Upstash Ratelimit class. Its .limit() delegates to `upstashLimit`
// so each test controls success/throw. slidingWindow is a no-op static.
const upstashLimit = vi.fn();
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() {
      return {};
    }
    async limit(key: string) {
      return upstashLimit(key);
    }
  },
}));

// Re-import fresh between tests so each gets its own lazy-init state (the
// limiter memoizes per module instance, and the in-memory window is per
// module instance too).
async function freshModule() {
  vi.resetModules();
  return import("./rate-limit");
}

function req(ip = "1.2.3.4"): Request {
  return new Request("http://localhost/api/portal/x", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

afterEach(() => {
  upstashLimit.mockReset();
  redisStub = null;
});

describe("limitPortalAuth — in-memory limiter (no Upstash)", () => {
  beforeEach(() => {
    redisStub = null; // force in-memory path
  });

  it("allows requests under the limit (null) and 429s once over (~5/min)", async () => {
    const { limitPortalAuth } = await freshModule();
    const ip = "10.0.0.1";

    // First 5 in the window are allowed.
    for (let i = 0; i < 5; i++) {
      expect(await limitPortalAuth(req(ip))).toBeNull();
    }
    // 6th exceeds the window → 429.
    const blocked = await limitPortalAuth(req(ip));
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });

  it("keys per IP — a different IP has its own fresh budget", async () => {
    const { limitPortalAuth } = await freshModule();
    for (let i = 0; i < 6; i++) await limitPortalAuth(req("10.0.0.2"));
    // Different IP, untouched budget → allowed.
    expect(await limitPortalAuth(req("10.0.0.99"))).toBeNull();
  });
});

describe("limitPortalCheckout — higher limit (~10/min)", () => {
  it("allows up to 10 then 429s the 11th", async () => {
    redisStub = null;
    const { limitPortalCheckout } = await freshModule();
    const ip = "10.0.1.1";
    for (let i = 0; i < 10; i++) {
      expect(await limitPortalCheckout(req(ip))).toBeNull();
    }
    const blocked = await limitPortalCheckout(req(ip));
    expect(blocked!.status).toBe(429);
  });
});

describe("fail-open behavior", () => {
  it("proceeds (null) when the limiter check throws", async () => {
    redisStub = {}; // select the Upstash path
    upstashLimit.mockRejectedValue(new Error("redis unreachable"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { limitPortalAuth } = await freshModule();

    // Limiter throws → request is ALLOWED, never a 429/500.
    expect(await limitPortalAuth(req())).toBeNull();
    // And it warns (once) so the operator knows it's failing open.
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });

  it("honors a real 429 from Upstash when the limiter is healthy", async () => {
    redisStub = {};
    upstashLimit.mockResolvedValue({ success: false });
    const { limitPortalCheckout } = await freshModule();

    const blocked = await limitPortalCheckout(req());
    expect(blocked!.status).toBe(429);
  });

  it("allows when Upstash reports success", async () => {
    redisStub = {};
    upstashLimit.mockResolvedValue({ success: true });
    const { limitPortalAuth } = await freshModule();

    expect(await limitPortalAuth(req())).toBeNull();
  });
});
