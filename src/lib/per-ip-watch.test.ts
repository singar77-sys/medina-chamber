import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * per-ip-watch is the guard that stops ONE IP from burning the whole
 * Anthropic budget while staying politely inside the 20 req/min rate limit.
 * It has exactly two ways to fail silently, and both are tested here:
 *
 *   1. A mis-typed env threshold. `Number("200,000")` is NaN, and every
 *      `total >= NaN` is false — the block AND its Sentry alert vanish with
 *      no error anywhere. `Number("")` is 0, which blocks every visitor from
 *      the first request. Neither shows up in a log; you find out from the
 *      bill or from a user complaint.
 *
 *   2. A Redis error. The old code answered `catch { return false }`, i.e.
 *      "not over the threshold" — so an Upstash outage removed the guard at
 *      exactly the moment an attacker would most want it gone.
 */

let redisStub: {
  get: ReturnType<typeof vi.fn>;
  incrby: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
} | null = null;

vi.mock("@/lib/upstash", () => ({ getRedis: () => redisStub }));
vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn() }));

function workingRedis(stored = 0) {
  return {
    get: vi.fn(async () => stored),
    incrby: vi.fn(async (_k: string, n: number) => (stored += n)),
    expire: vi.fn(async () => 1),
    set: vi.fn(async () => "OK"),
  };
}

function throwingRedis() {
  const boom = async () => {
    throw new Error("upstash unreachable");
  };
  return { get: vi.fn(boom), incrby: vi.fn(boom), expire: vi.fn(boom), set: vi.fn(boom) };
}

/** Fresh module per test: the in-memory buckets are module state. */
async function load(env: Record<string, string | undefined> = {}) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v as string);
  return import("./per-ip-watch");
}

beforeEach(() => {
  redisStub = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("threshold env parsing", () => {
  it("ignores a comma-formatted block threshold instead of disabling the block", async () => {
    // "200,000" -> NaN. With a bare Number() this test's IP would burn an
    // unbounded number of tokens and never trip, and the Sentry alert that
    // tells Mark it is happening would never fire either.
    const w = await load({ CHAT_PER_IP_BLOCK_TOKENS: "200,000" });
    await w.recordIpTokenUsage("1.2.3.4", 150_000, 60_000); // 210k > default 200k
    expect(await w.isIpOverBlockThreshold("1.2.3.4")).toBe(true);
  });

  it("ignores a blank threshold instead of blocking everyone", async () => {
    // "" -> 0, and `0 >= 0` is true, so the very first visitor of the hour
    // would be served the offline fallback forever.
    const w = await load({ CHAT_PER_IP_BLOCK_TOKENS: "" });
    expect(await w.isIpOverBlockThreshold("1.2.3.4")).toBe(false);
  });

  it.each([
    ["negative", "-5"],
    ["non-numeric", "abc"],
  ])("ignores a %s threshold and keeps the default", async (_label, raw) => {
    const w = await load({ CHAT_PER_IP_BLOCK_TOKENS: raw });
    await w.recordIpTokenUsage("1.2.3.4", 100, 100);
    // Would trip immediately against a negative or NaN threshold.
    expect(await w.isIpOverBlockThreshold("1.2.3.4")).toBe(false);
  });

  it("honours a valid threshold", async () => {
    const w = await load({ CHAT_PER_IP_BLOCK_TOKENS: "1000" });
    await w.recordIpTokenUsage("1.2.3.4", 600, 399);
    expect(await w.isIpOverBlockThreshold("1.2.3.4")).toBe(false);
    await w.recordIpTokenUsage("1.2.3.4", 1, 0);
    expect(await w.isIpOverBlockThreshold("1.2.3.4")).toBe(true);
  });
});

describe("Redis failure", () => {
  it("keeps blocking a hot IP when the Redis read throws", async () => {
    const w = await load({ CHAT_PER_IP_BLOCK_TOKENS: "1000" });

    // Usage is recorded while Redis is healthy...
    redisStub = workingRedis();
    await w.recordIpTokenUsage("9.9.9.9", 900, 200);

    // ...then Upstash falls over. The guard must not answer "under the
    // threshold" just because it could not ask.
    redisStub = throwingRedis();
    expect(await w.isIpOverBlockThreshold("9.9.9.9")).toBe(true);
  });

  it("does not punish an IP that has not burned anything during the outage", async () => {
    // Failing safe must not mean failing closed for everyone: the rest of the
    // chatbot has to keep working through an Upstash blip.
    const w = await load({ CHAT_PER_IP_BLOCK_TOKENS: "1000" });
    redisStub = throwingRedis();
    expect(await w.isIpOverBlockThreshold("5.5.5.5")).toBe(false);
  });

  it("keeps counting into the in-memory bucket while Redis is down", async () => {
    const w = await load({ CHAT_PER_IP_BLOCK_TOKENS: "1000" });
    redisStub = throwingRedis();
    await w.recordIpTokenUsage("7.7.7.7", 800, 0);
    expect(await w.isIpOverBlockThreshold("7.7.7.7")).toBe(false);
    await w.recordIpTokenUsage("7.7.7.7", 200, 0);
    expect(await w.isIpOverBlockThreshold("7.7.7.7")).toBe(true);
  });

  it("never throws out of either entry point", async () => {
    // Both are called on the request path (one before the model call, one in
    // onFinish). A throw here would 500 the chat route or kill the after() job.
    const w = await load();
    redisStub = throwingRedis();
    await expect(w.isIpOverBlockThreshold("1.1.1.1")).resolves.toBeTypeOf("boolean");
    await expect(w.recordIpTokenUsage("1.1.1.1", 10, 10)).resolves.toBeUndefined();
  });
});

describe("recordIpTokenUsage", () => {
  it("ignores an empty usage report rather than counting it", async () => {
    const w = await load({ CHAT_PER_IP_BLOCK_TOKENS: "1" });
    await w.recordIpTokenUsage("1.2.3.4", undefined, undefined);
    expect(await w.isIpOverBlockThreshold("1.2.3.4")).toBe(false);
  });

  it("counts each IP separately", async () => {
    const w = await load({ CHAT_PER_IP_BLOCK_TOKENS: "100" });
    await w.recordIpTokenUsage("1.1.1.1", 200, 0);
    expect(await w.isIpOverBlockThreshold("1.1.1.1")).toBe(true);
    expect(await w.isIpOverBlockThreshold("2.2.2.2")).toBe(false);
  });
});
