import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const applyRateLimit = vi.fn(async () => null as Response | null);
vi.mock("@/lib/rate-limit", () => ({ applyRateLimit, formLimiter: {} }));

const logEngagement = vi.fn(async (_db: unknown, _i: Record<string, unknown>) => {});
vi.mock("@/lib/engagement", () => ({ logEngagement }));

let orgRow: Record<string, unknown> | null = null;
const limit = vi.fn(async () => (orgRow ? [orgRow] : []));
const where = vi.fn(() => ({ limit }));
const from = vi.fn(() => ({ where }));
const select = vi.fn(() => ({ from }));
vi.mock("@/lib/db", () => ({ db: { select } }));

let POST: (req: Request) => Promise<Response>;
beforeAll(async () => {
  POST = (await import("./route")).POST as unknown as (req: Request) => Promise<Response>;
});
beforeEach(() => {
  vi.clearAllMocks();
  orgRow = null;
  applyRateLimit.mockResolvedValue(null);
});

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/track/directory-view", { method: "POST", body: JSON.stringify(body) }));

describe("POST /api/track/directory-view", () => {
  it("400s without a slug, no log", async () => {
    expect((await post({})).status).toBe(400);
    expect(logEngagement).not.toHaveBeenCalled();
  });

  it("logs directory_view for a known active org", async () => {
    orgRow = { id: "o1" };
    const res = await post({ slug: "acme" });
    expect(res.status).toBe(200);
    expect(logEngagement.mock.calls[0][1]).toMatchObject({ eventType: "directory_view", organizationId: "o1" });
  });

  it("returns ok with no log for an unknown slug", async () => {
    orgRow = null;
    const res = await post({ slug: "ghost" });
    expect(res.status).toBe(200);
    expect(logEngagement).not.toHaveBeenCalled();
  });
});
