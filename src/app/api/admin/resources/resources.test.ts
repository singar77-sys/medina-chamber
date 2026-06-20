import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.fn(async () => null as Response | null);
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const getAdminResources = vi.fn(async () => [] as unknown[]);
vi.mock("@/lib/resources", () => ({ getAdminResources }));

const insReturning = vi.fn(async () => [{ id: "r1" }]);
const insValues = vi.fn((_v: Record<string, unknown>) => ({ returning: insReturning }));
const insert = vi.fn(() => ({ values: insValues }));
const updReturning = vi.fn(async () => [{ id: "r1" }]);
const updWhere = vi.fn(() => ({ returning: updReturning }));
const updSet = vi.fn((_v: Record<string, unknown>) => ({ where: updWhere }));
const update = vi.fn(() => ({ set: updSet }));
vi.mock("@/lib/db", () => ({ db: { insert, update } }));

let listGet: (req: Request) => Promise<Response>;
let listPost: (req: Request) => Promise<Response>;
let patchId: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
beforeAll(async () => {
  ({ GET: listGet, POST: listPost } = await import("./route"));
  patchId = (await import("./[id]/route")).PATCH;
});

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminSession.mockResolvedValue(null);
});

const json = (url: string, method: string, body: unknown) =>
  new Request(url, { method, body: JSON.stringify(body) });
const ctx = { params: Promise.resolve({ id: "r1" }) };
const valid = { title: "SBA Loans", category: "Funding", url: "https://sba.gov" };

describe("/api/admin/resources", () => {
  it("GET rejects an unauthorized caller", async () => {
    requireAdminSession.mockResolvedValue(Response.json({ error: "no" }, { status: 401 }));
    const res = await listGet(new Request("http://localhost/api/admin/resources"));
    expect(res.status).toBe(401);
    expect(getAdminResources).not.toHaveBeenCalled();
  });

  it("GET returns the resource list", async () => {
    const res = await listGet(new Request("http://localhost/api/admin/resources"));
    expect(await res.json()).toEqual({ resources: [] });
  });

  it("POST creates a valid resource (201)", async () => {
    const res = await listPost(json("http://localhost/api/admin/resources", "POST", valid));
    expect(res.status).toBe(201);
    expect(insValues.mock.calls[0][0]).toMatchObject(valid);
  });

  it("POST 400s a javascript: URL without inserting", async () => {
    const res = await listPost(
      json("http://localhost/api/admin/resources", "POST", { ...valid, url: "javascript:alert(1)" }),
    );
    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("PATCH updates an editable field", async () => {
    const res = await patchId(
      json("http://localhost/api/admin/resources/r1", "PATCH", { isPublished: false }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(updSet.mock.calls[0][0]).toMatchObject({ isPublished: false });
  });

  it("PATCH 400s when no editable fields are provided", async () => {
    const res = await patchId(json("http://localhost/api/admin/resources/r1", "PATCH", {}), ctx);
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});
