import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Redis is stubbed, not real. Default null, so the existing tests exercise the
// in-memory bucket — the same arithmetic, without needing an Upstash instance.
// The fail-safe tests below swap in a client that throws.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisStub: any = null;
vi.mock("@/lib/upstash", () => ({ getRedis: () => redisStub }));
vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn() }));

function throwingRedis() {
  const boom = async () => {
    throw new Error("upstash unreachable");
  };
  return { get: vi.fn(boom), incrby: vi.fn(boom), expire: vi.fn(boom), set: vi.fn(boom) };
}

async function loadWith(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v as string);
  return import("./spend-cap");
}

beforeEach(() => {
  redisStub = null;
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("daily cap", () => {
  it("trips exactly at the cap, not before", async () => {
    const cap = await loadWith({
      CHAT_DAILY_TOKEN_CAP: "100",
      CHAT_MONTHLY_TOKEN_CAP: "1000000",
    });
    await cap.recordTokenUsage(60, 39);
    expect(await cap.isOverDailyCap()).toBe(false);
    await cap.recordTokenUsage(1, 0);
    expect(await cap.isOverDailyCap()).toBe(true);
  });
});

describe("monthly cap", () => {
  it("trips exactly at the cap, not before", async () => {
    const cap = await loadWith({
      CHAT_DAILY_TOKEN_CAP: "1000000",
      CHAT_MONTHLY_TOKEN_CAP: "100",
    });
    await cap.recordTokenUsage(99, 0);
    expect(await cap.isOverMonthlyCap()).toBe(false);
    await cap.recordTokenUsage(0, 1);
    expect(await cap.isOverMonthlyCap()).toBe(true);
  });
});

describe("env parsing", () => {
  it("keeps the default cap when the env value is comma-formatted", async () => {
    // '15,000,000' -> NaN with a bare Number(), and `total >= NaN` is always
    // false, which would silently remove the budget ceiling entirely.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cap = await loadWith({
      CHAT_DAILY_TOKEN_CAP: "2,000,000",
      CHAT_MONTHLY_TOKEN_CAP: undefined,
    });
    await cap.recordTokenUsage(2_000_000, 0);
    expect(await cap.isOverDailyCap()).toBe(true);
  });

  it("keeps the default cap when the env value is blank", async () => {
    // '' -> 0 with a bare Number(), which would take the bot offline on the
    // very first request.
    const cap = await loadWith({
      CHAT_DAILY_TOKEN_CAP: "",
      CHAT_MONTHLY_TOKEN_CAP: "",
    });
    expect(await cap.isOverDailyCap()).toBe(false);
    expect(await cap.isOverMonthlyCap()).toBe(false);
  });
});

describe("recordTokenUsage", () => {
  it("ignores an empty usage report rather than counting it", async () => {
    const cap = await loadWith({ CHAT_DAILY_TOKEN_CAP: "1" });
    await cap.recordTokenUsage(undefined, undefined);
    expect(await cap.isOverDailyCap()).toBe(false);
  });
});

/**
 * These caps are the ONLY ceiling on an anonymous endpoint that spends real
 * money per request. The failure mode that matters is not "the cap is wrong",
 * it is "the cap silently stops existing" — which is exactly what the old
 * `catch { return false }` did: an Upstash outage skipped the Redis read AND
 * the in-memory bucket underneath it, while recordTokenUsage's own catch meant
 * nothing was being counted anywhere either. Unlimited paid generation, no
 * error, no alert. Fail safe means: keep counting locally, and once we have
 * lost Redis for long enough that we genuinely do not know the spend, treat
 * the budget as spent and let the route serve its offline fallback.
 */
describe("fail safe when Redis is unavailable", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("still trips the cap from the local count when the Redis read throws", async () => {
    const cap = await loadWith({
      CHAT_DAILY_TOKEN_CAP: "100",
      CHAT_MONTHLY_TOKEN_CAP: "1000000",
    });
    redisStub = throwingRedis();

    await cap.recordTokenUsage(60, 0);
    expect(await cap.isOverDailyCap()).toBe(false);
    await cap.recordTokenUsage(41, 0);
    // Redis never answered once; the in-memory bucket carried the ceiling.
    expect(await cap.isOverDailyCap()).toBe(true);
  });

  it("counts spend locally even while Redis is healthy, so the fallback is warm", async () => {
    // If the in-memory bucket only started counting once Redis broke, the
    // degraded read would see 0 and wave everything through for a full day.
    const cap = await loadWith({ CHAT_DAILY_TOKEN_CAP: "100" });
    redisStub = {
      get: vi.fn(async () => 0),
      incrby: vi.fn(async () => 1),
      expire: vi.fn(async () => 1),
      set: vi.fn(async () => null),
    };
    await cap.recordTokenUsage(150, 0);

    redisStub = throwingRedis();
    expect(await cap.isOverDailyCap()).toBe(true);
  });

  it("treats a sustained Redis outage as budget exhausted", async () => {
    // Nothing has been spent on this isolate, but after a run of failures we
    // cannot claim to know what the other isolates spent. Answering "under the
    // cap" there is a guess that costs money; answering "over" costs a canned
    // fallback message.
    const cap = await loadWith({ CHAT_DAILY_TOKEN_CAP: "1000000" });
    redisStub = throwingRedis();

    const answers: boolean[] = [];
    for (let i = 0; i < 6; i++) answers.push(await cap.isOverDailyCap());

    expect(answers[0]).toBe(false); // one blip must not take the bot offline
    expect(answers[5]).toBe(true); // a sustained outage must
  });

  it("comes back online as soon as Redis answers again", async () => {
    // The trip is a degradation, not a latch — a recovered Upstash must not
    // leave the chatbot serving fallback text until the next deploy.
    const cap = await loadWith({ CHAT_DAILY_TOKEN_CAP: "1000000" });
    redisStub = throwingRedis();
    for (let i = 0; i < 6; i++) await cap.isOverDailyCap();
    expect(await cap.isOverDailyCap()).toBe(true);

    redisStub = { get: vi.fn(async () => 5), incrby: vi.fn(), expire: vi.fn(), set: vi.fn() };
    expect(await cap.isOverDailyCap()).toBe(false);
  });

  it("never throws out of the cap checks or the recorder", async () => {
    // isOverDailyCap/isOverMonthlyCap run on the request path and
    // recordTokenUsage runs inside after(); a throw would 500 the route or
    // kill the post-stream accounting.
    const cap = await loadWith({});
    redisStub = throwingRedis();
    await expect(cap.isOverDailyCap()).resolves.toBeTypeOf("boolean");
    await expect(cap.isOverMonthlyCap()).resolves.toBeTypeOf("boolean");
    await expect(cap.recordTokenUsage(10, 10)).resolves.toBeUndefined();
  });
});
