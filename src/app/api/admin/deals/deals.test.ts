import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.fn(async () => null as Response | null);
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const getAdminDeals = vi.fn(async () => [] as unknown[]);
vi.mock("@/lib/deals", () => ({ getAdminDeals }));

const updReturning = vi.fn(async () => [{ id: "d1", isApproved: true }]);
const updWhere = vi.fn(() => ({ returning: updReturning }));
const updSet = vi.fn((_v: Record<string, unknown>) => ({ where: updWhere }));
const update = vi.fn(() => ({ set: updSet }));
vi.mock("@/lib/db", () => ({ db: { update } }));

let listGet: (req: Request) => Promise<Response>;
let patchId: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
beforeAll(async () => {
  listGet = (await import("./route")).GET;
  patchId = (await import("./[id]/route")).PATCH;
});

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminSession.mockResolvedValue(null);
});

const req = (body?: unknown) =>
  new Request("http://localhost/api/admin/deals/d1", {
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const ctx = { params: Promise.resolve({ id: "d1" }) };

describe("/api/admin/deals", () => {
  it("GET rejects an unauthorized caller before querying", async () => {
    requireAdminSession.mockResolvedValue(Response.json({ error: "no" }, { status: 401 }));
    const res = await listGet(new Request("http://localhost/api/admin/deals"));
    expect(res.status).toBe(401);
    expect(getAdminDeals).not.toHaveBeenCalled();
  });

  it("GET returns the moderation list", async () => {
    const res = await listGet(new Request("http://localhost/api/admin/deals"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deals: [] });
  });

  it("PATCH approves a deal (admin-only isApproved)", async () => {
    const res = await patchId(req({ isApproved: true }), ctx);
    expect(res.status).toBe(200);
    expect(updSet.mock.calls[0][0]).toMatchObject({ isApproved: true });
  });

  it("PATCH 401s when unauthorized", async () => {
    requireAdminSession.mockResolvedValue(Response.json({ error: "no" }, { status: 401 }));
    const res = await patchId(req({ isApproved: true }), ctx);
    expect(res.status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });
});
