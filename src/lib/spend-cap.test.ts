import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// No Redis in tests, so spend-cap uses its in-memory bucket — the same
// arithmetic, without needing an Upstash instance.
vi.mock("@/lib/upstash", () => ({ getRedis: () => null }));
vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn() }));

async function loadWith(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v as string);
  return import("./spend-cap");
}

beforeEach(() => {
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
