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
  return {
    get: vi.fn(boom),
    mget: vi.fn(boom),
    incrby: vi.fn(boom),
    decrby: vi.fn(boom),
    del: vi.fn(boom),
    expire: vi.fn(boom),
    set: vi.fn(boom),
  };
}

/**
 * A Redis stand-in that models the one property the reservation design leans
 * on: INCRBY is ATOMIC and returns the post-increment total. Every command
 * yields the event loop first, so concurrent callers really do interleave —
 * a check-then-act implementation cannot pass by accident here.
 */
function fakeRedis(seed: Record<string, number> = {}) {
  const store: Record<string, number> = { ...seed };
  const tick = () => new Promise((r) => setTimeout(r, 0));
  return {
    store,
    get: vi.fn(async (k: string) => { await tick(); return store[k] ?? null; }),
    mget: vi.fn(async (keys: string[]) => {
      await tick();
      return keys.map((k) => (k in store ? store[k] : null));
    }),
    incrby: vi.fn(async (k: string, n: number) => {
      await tick();
      store[k] = (store[k] ?? 0) + n;
      return store[k];
    }),
    decrby: vi.fn(async (k: string, n: number) => {
      await tick();
      store[k] = (store[k] ?? 0) - n;
      return store[k];
    }),
    del: vi.fn(async (k: string) => { await tick(); delete store[k]; return 1; }),
    expire: vi.fn(async () => { await tick(); return 1; }),
    set: vi.fn(async () => { await tick(); return null; }),
  };
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
    redisStub = fakeRedis();
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

    redisStub = fakeRedis({ [`chat:tokens:${new Date().toISOString().slice(0, 10)}`]: 5 });
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

/**
 * The caps used to be enforced by READING a counter before the model call and
 * INCREMENTING it after. That is check-then-act, and it bounds nothing under
 * concurrency: with the counter at 99 and a cap of 100, twenty simultaneous
 * requests all read 99, all decide they fit, and all run. The code even
 * claimed otherwise in a comment ("worst-case over-run is one in-flight
 * request"), which is the kind of comment that makes a reviewer stop looking.
 *
 * Admission now RESERVES: the claim is an atomic INCRBY whose return value
 * decides the request, so the twenty-at-once case admits exactly as many as
 * the budget has room for.
 */
const DAY_KEY = `chat:tokens:${new Date().toISOString().slice(0, 10)}`;
const MONTH_KEY = `chat:tokens:monthly:${new Date().toISOString().slice(0, 7)}`;
const bucketKeyAt = (ms: number) => `chat:reserved:${Math.floor(ms / 60_000)}`;

describe("concurrent admission", () => {
  it("admits at most what the budget has room for when twenty requests arrive at once", async () => {
    const cap = await loadWith({
      CHAT_DAILY_TOKEN_CAP: "100",
      CHAT_MONTHLY_TOKEN_CAP: "1000000",
    });
    const redis = fakeRedis({ [DAY_KEY]: 99, [MONTH_KEY]: 99 });
    redisStub = redis;

    // Twenty requests, one token of allowance each, against the last token of
    // the budget. Fired without awaiting between them, so every claim is in
    // flight before any of them has looked at the counter.
    const results = await Promise.all(
      Array.from({ length: 20 }, () => cap.reserveTokens(1)),
    );
    const admitted = results.filter((r) => r.admitted);

    // The whole point: 99 already spent + everything admitted must still fit.
    expect(99 + admitted.length * 1).toBeLessThanOrEqual(100);
    expect(admitted).toHaveLength(1);
    // And the nineteen refusals gave their claims back rather than parking
    // them on the ledger for the next three minutes.
    expect(redis.store[bucketKeyAt(Date.now())]).toBe(1);
  });

  it("admits none when a single realistic allowance no longer fits", async () => {
    const cap = await loadWith({
      CHAT_DAILY_TOKEN_CAP: "100",
      CHAT_MONTHLY_TOKEN_CAP: "1000000",
    });
    redisStub = fakeRedis({ [DAY_KEY]: 99, [MONTH_KEY]: 99 });

    const results = await Promise.all(
      Array.from({ length: 20 }, () => cap.reserveTokens(4_000)),
    );
    expect(results.every((r) => !r.admitted)).toBe(true);
  });

  it("bounds admission the same way on the per-isolate in-memory ledger", async () => {
    // No Redis at all. The ceiling is per instance (see the module header),
    // but within an instance it still has to hold.
    const cap = await loadWith({
      CHAT_DAILY_TOKEN_CAP: "100",
      CHAT_MONTHLY_TOKEN_CAP: "1000000",
    });
    await cap.recordTokenUsage(99, 0);

    const results = await Promise.all(
      Array.from({ length: 20 }, () => cap.reserveTokens(1)),
    );
    expect(results.filter((r) => r.admitted)).toHaveLength(1);
  });
});

describe("reservation lifecycle", () => {
  it("hands the allowance back at settle, so only real usage is kept", async () => {
    const cap = await loadWith({
      CHAT_DAILY_TOKEN_CAP: "100",
      CHAT_MONTHLY_TOKEN_CAP: "1000000",
    });
    const redis = fakeRedis();
    redisStub = redis;

    const first = await cap.reserveTokens(80);
    expect(first.admitted).toBe(true);
    // 80 of 100 is claimed, so a second 80 cannot fit.
    expect((await cap.reserveTokens(80)).admitted).toBe(false);

    if (!first.admitted) throw new Error("unreachable");
    await cap.settleReservation(first.reservation, 5, 5);

    // The allowance is gone from the ledger and only the 10 real tokens stayed.
    expect(redis.store[bucketKeyAt(Date.now())] ?? 0).toBe(0);
    expect(redis.store[DAY_KEY]).toBe(10);
    expect((await cap.reserveTokens(80)).admitted).toBe(true);
  });

  it("settles exactly once no matter how many exit paths call it", async () => {
    // The route settles from three places — the model finished, the client
    // disconnected, the provider aborted. Counting the spend twice would
    // double-charge the budget AND release an allowance that is no longer
    // held, which hands the difference to the next request for free.
    const cap = await loadWith({ CHAT_DAILY_TOKEN_CAP: "1000" });
    const redis = fakeRedis();
    redisStub = redis;

    const r = await cap.reserveTokens(100);
    if (!r.admitted) throw new Error("unreachable");

    await cap.settleReservation(r.reservation, 40, 10);
    await cap.settleReservation(r.reservation, 40, 10);
    await cap.settleReservation(r.reservation, 999, 999);

    expect(redis.store[DAY_KEY]).toBe(50);
    expect(redis.store[bucketKeyAt(Date.now())] ?? 0).toBe(0);
  });

  it("reclaims an abandoned reservation once its bucket ages out", async () => {
    // A request whose isolate is torn down mid-stream never settles. Without
    // expiry its allowance would hold budget hostage until the period rolled
    // over; a few of those a day and the cap quietly shrinks to nothing.
    const cap = await loadWith({
      CHAT_DAILY_TOKEN_CAP: "100",
      CHAT_MONTHLY_TOKEN_CAP: "1000000",
    });
    const base = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(base);

    const abandoned = await cap.reserveTokens(80);
    expect(abandoned.admitted).toBe(true);
    expect((await cap.reserveTokens(80)).admitted).toBe(false);

    // Four minutes later — well past any chat generation — the bucket has
    // fallen out of the counted window.
    clock.mockReturnValue(base + 4 * 60_000);
    expect((await cap.reserveTokens(80)).admitted).toBe(true);
  });

  it("stops counting an aged-out reservation on the Redis ledger too", async () => {
    const cap = await loadWith({
      CHAT_DAILY_TOKEN_CAP: "100",
      CHAT_MONTHLY_TOKEN_CAP: "1000000",
    });
    const redis = fakeRedis();
    redisStub = redis;
    const base = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(base);

    expect((await cap.reserveTokens(80)).admitted).toBe(true);
    expect((await cap.reserveTokens(80)).admitted).toBe(false);

    clock.mockReturnValue(base + 4 * 60_000);
    // The old key is still sitting in the store (its TTL is Redis's own job);
    // what matters is that we no longer count it.
    expect(redis.store[bucketKeyAt(base)]).toBe(80);
    expect((await cap.reserveTokens(80)).admitted).toBe(true);
  });

  it("never leaves a negative bucket when the key expired before the release", async () => {
    // DECRBY on an expired key RECREATES it at a negative value, and a
    // negative bucket subtracts from every concurrent reserver's projection —
    // free budget, handed out by the cleanup path.
    const cap = await loadWith({ CHAT_DAILY_TOKEN_CAP: "1000" });
    const redis = fakeRedis();
    redisStub = redis;

    const r = await cap.reserveTokens(100);
    if (!r.admitted) throw new Error("unreachable");
    delete redis.store[r.reservation.key]; // TTL fired mid-request

    await cap.settleReservation(r.reservation, 10, 0);

    // Zero or gone, never negative. (It is now corrected back to zero rather
    // than DELeted — see the concurrent-claim case below for why.)
    expect(redis.store[r.reservation.key] ?? 0).toBe(0);
  });

  it("corrects a negative bucket without wiping a claim that landed meanwhile", async () => {
    // The old correction was DEL, which throws the whole bucket away — every
    // reservation any other request placed in that minute goes with it, and
    // the next reserver sees an empty minute and free budget. The overshoot
    // is ours alone, so undo exactly the overshoot.
    const cap = await loadWith({ CHAT_DAILY_TOKEN_CAP: "1000000" });
    const redis = fakeRedis();
    // A concurrent claim lands in the window between our DECRBY and whatever
    // we do about its negative result. Modelled deterministically rather than
    // raced, so the test states the ordering it is about.
    redisStub = {
      ...redis,
      decrby: vi.fn(async (k: string, n: number) => {
        const left = await redis.decrby(k, n);
        await redis.incrby(k, 400);
        return left;
      }),
    };

    const r = await cap.reserveTokens(100);
    if (!r.admitted) throw new Error("unreachable");
    const bucket = r.reservation.key;
    delete redis.store[bucket]; // TTL fired mid-request

    await cap.settleReservation(r.reservation, 10, 0);

    // -100 from our release, +400 from the concurrent claim, +100 correction:
    // our overshoot is undone and their live claim is untouched.
    expect(redis.store[bucket]).toBe(400);
  });

  it("settles a memory-held claim against memory, never against Redis", async () => {
    // A reservation that fell back to the in-memory ledger (Redis threw on
    // the INCRBY) used to be indistinguishable from a Redis-backed one, so it
    // DECRBYd a bucket it had never contributed to — releasing a DIFFERENT
    // request's live claim. Measured: a real 500-token claim went 500 -> 0.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cap = await loadWith({
      CHAT_DAILY_TOKEN_CAP: "1000000",
      CHAT_MONTHLY_TOKEN_CAP: "1000000",
    });
    const base = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(base); // one bucket for the whole test
    const redis = fakeRedis();

    // Request 1: Redis is down at claim time, so its claim lands in memory.
    redisStub = {
      ...redis,
      incrby: vi.fn(async () => {
        throw new Error("upstash unreachable");
      }),
    };
    const fellBack = await cap.reserveTokens(500);
    if (!fellBack.admitted) throw new Error("unreachable");

    // Redis recovers. Request 2 places a real claim in the same bucket.
    redisStub = redis;
    const live = await cap.reserveTokens(500);
    if (!live.admitted) throw new Error("unreachable");
    expect(redis.store[live.reservation.key]).toBe(500);

    // Request 1 finishes.
    await cap.settleReservation(fellBack.reservation, 5, 5);

    // Request 2's claim is still standing. Nothing request 1 did touched it.
    expect(redis.store[live.reservation.key]).toBe(500);
  });

  it("counts a claim placed on the far side of the minute tick", async () => {
    // activeReserveKeys used to read only the current bucket and the two
    // older ones, so a request whose keys were computed in bucket b never saw
    // a claim placed in b+1 microseconds later and both could take the last
    // slot. Sub-millisecond window, one allowance of over-run, one extra key
    // in an MGET we were issuing anyway.
    const cap = await loadWith({
      CHAT_DAILY_TOKEN_CAP: "100",
      CHAT_MONTHLY_TOKEN_CAP: "1000000",
    });
    redisStub = fakeRedis();
    const base = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(base);

    // The request that arrived just after the tick claims in the next bucket.
    clock.mockReturnValue(base + 60_000);
    expect((await cap.reserveTokens(80)).admitted).toBe(true);

    // The one still on the old side of the tick has to see it anyway.
    clock.mockReturnValue(base);
    expect((await cap.reserveTokens(80)).admitted).toBe(false);
  });
});

describe("a refusal is final", () => {
  it("stays refused when handing the refused claim back fails", async () => {
    // The release used to sit inside the same try as the claim, so a Redis
    // error while RETURNING a refused claim was caught by the reserve
    // handler, which fell through to the in-memory ledger and ADMITTED the
    // request it had just refused. It could not self-limit either: the
    // successful read above calls noteRedisOk(), so the consecutive-failure
    // counter reset every request and the "unknown" trip never fired.
    //
    // Measured on the old code with exactly this setup: 10 of 10 admitted.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cap = await loadWith({
      CHAT_MONTHLY_TOKEN_CAP: "100",
      CHAT_DAILY_TOKEN_CAP: "1000000",
    });
    const redis = fakeRedis({ [MONTH_KEY]: 100_000 });
    redisStub = {
      ...redis,
      decrby: vi.fn(async () => {
        throw new Error("upstash unreachable");
      }),
    };

    const outcomes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = await cap.reserveTokens(10);
      outcomes.push(r.admitted ? "admitted" : r.reason);
    }

    expect(outcomes).toEqual(Array.from({ length: 10 }, () => "monthly"));
  });

  it("still refuses when the claim cannot be returned on the in-memory ledger either", async () => {
    // Same property one tier down: no Redis at all, refusal still refuses.
    const cap = await loadWith({
      CHAT_MONTHLY_TOKEN_CAP: "100",
      CHAT_DAILY_TOKEN_CAP: "1000000",
    });
    await cap.recordTokenUsage(100, 0);
    const r = await cap.reserveTokens(10);
    expect(r).toEqual({ admitted: false, reason: "monthly" });
  });
});

describe("refusal reasons", () => {
  it("names the monthly ceiling first when both ceilings are blown", async () => {
    // Both are over, which is the normal state once the month runs out: the
    // day's counter is a subset of the month's. The operator needs to hear the
    // one that takes the bot offline for weeks, not the one that clears at UTC
    // midnight and would have them wait for a recovery that never comes.
    const cap = await loadWith({
      CHAT_DAILY_TOKEN_CAP: "100",
      CHAT_MONTHLY_TOKEN_CAP: "100",
    });
    redisStub = fakeRedis({ [DAY_KEY]: 100, [MONTH_KEY]: 100 });
    const r = await cap.reserveTokens(10);
    expect(r).toEqual({ admitted: false, reason: "monthly" });
  });

  it("names the daily tripwire when the month still has room", async () => {
    const cap = await loadWith({
      CHAT_DAILY_TOKEN_CAP: "100",
      CHAT_MONTHLY_TOKEN_CAP: "1000000",
    });
    redisStub = fakeRedis({ [DAY_KEY]: 100 });
    const r = await cap.reserveTokens(10);
    expect(r).toEqual({ admitted: false, reason: "daily" });
  });

  it("says the budget is unknown during a sustained Redis outage, not that it is spent", async () => {
    // Same fail-safe as the read path: refuse, but tell the on-call it is
    // Upstash that is broken and not the Anthropic budget that is gone.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cap = await loadWith({ CHAT_DAILY_TOKEN_CAP: "1000000" });
    redisStub = throwingRedis();

    const outcomes: string[] = [];
    for (let i = 0; i < 7; i++) {
      const r = await cap.reserveTokens(10);
      outcomes.push(r.admitted ? "admitted" : r.reason);
    }
    // The first blips degrade to the per-isolate ledger and still admit — one
    // Upstash hiccup must not take the bot offline. Only a sustained outage
    // refuses, and it says WHY: the budget is unreadable, not exhausted.
    expect(outcomes).toEqual([
      "admitted",
      "admitted",
      "admitted",
      "admitted",
      "unknown",
      "unknown",
      "unknown",
    ]);
  });

  it("never throws out of reserveTokens or settleReservation", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cap = await loadWith({});
    const r = await cap.reserveTokens(10);
    if (!r.admitted) throw new Error("unreachable");
    redisStub = throwingRedis();
    await expect(cap.reserveTokens(10)).resolves.toBeTypeOf("object");
    await expect(cap.settleReservation(r.reservation, 1, 1)).resolves.toBeUndefined();
  });
});

describe("read-only cap views", () => {
  it("counts outstanding reservations, not just settled spend", async () => {
    // The observation view has to agree with admission. If it only saw settled
    // tokens it would report a budget with room while every token of it was
    // already claimed.
    const cap = await loadWith({
      CHAT_DAILY_TOKEN_CAP: "100",
      CHAT_MONTHLY_TOKEN_CAP: "1000000",
    });
    redisStub = fakeRedis();

    expect(await cap.isOverDailyCap()).toBe(false);
    expect((await cap.reserveTokens(100)).admitted).toBe(true);
    expect(await cap.isOverDailyCap()).toBe(true);
  });
});
