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

// Degrading from a distributed ceiling to a per-isolate one is an incident, so
// it reports to Sentry like every other degradation in this codebase. Stubbed
// so the assertions below can read what was actually reported.
const captureMessage = vi.fn();
vi.mock("@sentry/nextjs", () => ({ captureMessage }));

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
  captureMessage.mockReset();
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

/**
 * chatLimiter and friends are built eagerly at module load, and applyRateLimit
 * has no try/catch of its own. Before this, a throwing Upstash meant the
 * exception propagated straight out of the route handler: /api/chat answered
 * 500 during an Upstash blip, taking the chatbot down entirely rather than
 * degrading it. The eager limiters now degrade the same way the lazy portal
 * ones do — a per-isolate in-memory window, never "no limiter" and never a 500.
 */
describe("eager limiters (chat/form/track) — degrade instead of 500", () => {
  it("does not throw out of applyRateLimit when Upstash throws", async () => {
    redisStub = {}; // select the Upstash path
    upstashLimit.mockRejectedValue(new Error("redis unreachable"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { chatLimiter, applyRateLimit } = await freshModule();

    // The first request through a dead Upstash is allowed (the in-memory
    // window is fresh), but crucially it resolves rather than rejecting.
    await expect(applyRateLimit(req(), chatLimiter)).resolves.toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("still enforces a ceiling from memory while Upstash is down", async () => {
    // Degrading must not mean "unlimited": /api/chat is the one route that
    // spends money per request, so a guardrail has to survive the outage.
    redisStub = {};
    upstashLimit.mockRejectedValue(new Error("redis unreachable"));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const { chatLimiter, applyRateLimit } = await freshModule();
    const ip = "198.51.100.7";

    // chat is 20/min.
    for (let i = 0; i < 20; i++) {
      expect(await applyRateLimit(req(ip), chatLimiter)).toBeNull();
    }
    const blocked = await applyRateLimit(req(ip), chatLimiter);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });

  it("honors a real 429 from a healthy Upstash", async () => {
    redisStub = {};
    upstashLimit.mockResolvedValue({ success: false });
    const { chatLimiter, applyRateLimit } = await freshModule();

    const blocked = await applyRateLimit(req(), chatLimiter);
    expect(blocked!.status).toBe(429);
  });
});

/**
 * Degrading swaps ONE shared 20/min ceiling for N per-isolate ones, so the
 * effective limit silently multiplies by however many isolates are warm. That
 * is precisely the condition someone needs to hear about, and console.warn on a
 * serverless isolate is not somebody hearing about it.
 *
 * The two failure modes are opposites and both are real: reporting on every
 * request buries the incident in its own noise, and a latch that is set once
 * and never cleared means the SECOND outage in an isolate's life reports
 * nothing at all — silence exactly when someone is looking at the graph.
 */
describe("degradation is reported once per episode, and re-armed on recovery", () => {
  it("reports to Sentry, not just the console, when Upstash starts throwing", async () => {
    redisStub = {};
    upstashLimit.mockRejectedValue(new Error("redis unreachable"));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const { chatLimiter, applyRateLimit } = await freshModule();
    await applyRateLimit(req(), chatLimiter);

    expect(captureMessage).toHaveBeenCalledTimes(1);
    const [message, options] = captureMessage.mock.calls[0] as [
      string,
      { level: string; tags: Record<string, string> },
    ];
    // The message has to name the limiter, or the alert is unactionable.
    expect(message).toContain("rl:chat");
    expect(options.level).toBe("warning");
    expect(options.tags.phase).toBe("rate-limit-degraded");
  });

  it("does not re-report on every request during the same outage", async () => {
    redisStub = {};
    upstashLimit.mockRejectedValue(new Error("redis unreachable"));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const { chatLimiter, applyRateLimit } = await freshModule();
    for (let i = 0; i < 10; i++) await applyRateLimit(req(), chatLimiter);

    expect(captureMessage).toHaveBeenCalledTimes(1);
  });

  it("reports AGAIN on a second outage after Upstash recovers", async () => {
    // The bug this encodes: a `warned` flag that is set and never reset. The
    // first outage alerts, Upstash comes back, and the next outage in that
    // isolate is completely silent.
    redisStub = {};
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { chatLimiter, applyRateLimit } = await freshModule();

    upstashLimit.mockRejectedValue(new Error("outage one"));
    await applyRateLimit(req(), chatLimiter);
    expect(captureMessage).toHaveBeenCalledTimes(1);

    // Recovery: a successful check ends the episode.
    upstashLimit.mockResolvedValue({ success: true });
    await applyRateLimit(req(), chatLimiter);
    expect(captureMessage).toHaveBeenCalledTimes(1);

    // Second outage — this is the one the old flag swallowed.
    upstashLimit.mockRejectedValue(new Error("outage two"));
    await applyRateLimit(req(), chatLimiter);
    expect(captureMessage).toHaveBeenCalledTimes(2);
  });

  it("reports nothing at all while Upstash is healthy", async () => {
    redisStub = {};
    upstashLimit.mockResolvedValue({ success: true });
    const { chatLimiter, applyRateLimit } = await freshModule();

    for (let i = 0; i < 5; i++) await applyRateLimit(req(), chatLimiter);
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it("also reports for the lazy portal limiters", async () => {
    // Same defect lived in makeLazyFailOpenLimiter and makeLazyWindowLimiter;
    // they share one reporter now, so they must share the behavior too.
    redisStub = {};
    upstashLimit.mockRejectedValue(new Error("redis unreachable"));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const { limitPortalAuth } = await freshModule();
    await limitPortalAuth(req());
    await limitPortalAuth(req());

    expect(captureMessage).toHaveBeenCalledTimes(1);
    expect(captureMessage.mock.calls[0][0]).toContain("rl:portal-auth");
  });
});
