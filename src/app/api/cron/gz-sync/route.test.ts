import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Two contracts nothing pinned: the bearer gate (this cron rewrites the member
// directory in Supabase) and "errors > 0 must be a 500" — a partial sync that
// answered 200 would leave a half-synced directory looking healthy in Vercel's
// cron monitoring.

const { runGzSync } = vi.hoisted(() => ({
  runGzSync: vi.fn(async () => ({ synced: 500, errors: 0 }) as Record<string, unknown>),
}));
vi.mock("@/lib/gz-sync", () => ({ runGzSync }));
// The route busts the directory cache tag after a successful sync.
// revalidateTag needs Next's request store, which does not exist under
// vitest, so an unmocked call throws and the route's catch turns a clean
// sync into a 500 — a test-environment artifact, not real behaviour.
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

const SECRET = "s".repeat(32);

let GET: (req: Request) => Promise<Response>;
beforeAll(async () => {
  GET = (await import("./route")).GET;
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", SECRET);
  runGzSync.mockResolvedValue({ synced: 500, errors: 0 });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const call = (auth?: string) =>
  GET(
    new Request("https://medinaohchamber.com/api/cron/gz-sync", {
      headers: auth ? { authorization: auth } : {},
    }),
  );

describe("GET /api/cron/gz-sync", () => {
  it("401s without a bearer and never runs the sync", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(runGzSync).not.toHaveBeenCalled();
  });

  it("200s on a clean sync", async () => {
    const res = await call(`Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, synced: 500 });
  });

  it("500s when the sync reports any errors", async () => {
    runGzSync.mockResolvedValue({ synced: 100, errors: 400 });
    const res = await call(`Bearer ${SECRET}`);
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ ok: false, errors: 400 });
  });

  it("500s (without leaking a stack) when the sync throws", async () => {
    runGzSync.mockRejectedValue(new Error("connection refused"));
    const res = await call(`Bearer ${SECRET}`);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "connection refused" });
  });
});
