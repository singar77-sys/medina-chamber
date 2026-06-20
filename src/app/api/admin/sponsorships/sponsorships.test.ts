import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.fn(async () => null as Response | null);
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const getSponsorships = vi.fn(async () => [] as unknown[]);
vi.mock("@/lib/sponsorships", () => ({ getSponsorships }));

const updReturning = vi.fn(async () => [{ id: "s1", status: "contacted" }]);
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

const patch = (body: unknown) =>
  new Request("http://localhost/api/admin/sponsorships/s1", { method: "PATCH", body: JSON.stringify(body) });
const ctx = { params: Promise.resolve({ id: "s1" }) };

describe("/api/admin/sponsorships", () => {
  it("GET rejects an unauthorized caller", async () => {
    requireAdminSession.mockResolvedValue(Response.json({ error: "no" }, { status: 401 }));
    const res = await listGet(new Request("http://localhost/api/admin/sponsorships"));
    expect(res.status).toBe(401);
    expect(getSponsorships).not.toHaveBeenCalled();
  });

  it("GET returns the inquiry queue", async () => {
    const res = await listGet(new Request("http://localhost/api/admin/sponsorships"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ inquiries: [] });
  });

  it("PATCH updates a valid status", async () => {
    const res = await patchId(patch({ status: "contacted" }), ctx);
    expect(res.status).toBe(200);
    expect(updSet.mock.calls[0][0]).toMatchObject({ status: "contacted" });
  });

  it("PATCH 400s an invalid status", async () => {
    const res = await patchId(patch({ status: "bogus" }), ctx);
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});
