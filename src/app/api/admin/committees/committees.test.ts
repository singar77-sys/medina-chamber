import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.fn(async () => null as Response | null);
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const generateCommitteeSlug = vi.fn(async () => "finance");
vi.mock("@/lib/committees", () => ({ generateCommitteeSlug }));

let created: Record<string, unknown>;
const insReturning = vi.fn(async () => [created]);
const insValues = vi.fn((_v: Record<string, unknown>) => ({ returning: insReturning }));
const insert = vi.fn(() => ({ values: insValues }));
const selOrderBy = vi.fn(async () => [] as unknown[]);
const selGroupBy = vi.fn(() => ({ orderBy: selOrderBy }));
const selLeftJoin = vi.fn(() => ({ groupBy: selGroupBy }));
const selFrom = vi.fn(() => ({ leftJoin: selLeftJoin }));
const select = vi.fn(() => ({ from: selFrom }));
vi.mock("@/lib/db", () => ({ db: { insert, select } }));

let GET: (req: Request) => Promise<Response>;
let POST: (req: Request) => Promise<Response>;
beforeAll(async () => {
  ({ GET, POST } = await import("./route"));
});

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminSession.mockResolvedValue(null);
  created = { id: "c1", name: "Finance", slug: "finance" };
});

const post = (body: unknown) =>
  new Request("http://localhost/api/admin/committees", { method: "POST", body: JSON.stringify(body) });

describe("/api/admin/committees", () => {
  it("GET rejects an unauthorized caller before querying", async () => {
    requireAdminSession.mockResolvedValue(Response.json({ error: "no" }, { status: 401 }));
    const res = await GET(new Request("http://localhost/api/admin/committees"));
    expect(res.status).toBe(401);
    expect(select).not.toHaveBeenCalled();
  });

  it("POST creates a committee with an auto-generated slug + defaults", async () => {
    const res = await POST(post({ name: "Finance" }));
    expect(res.status).toBe(201);
    const values = insValues.mock.calls[0][0];
    expect(values.name).toBe("Finance");
    expect(values.slug).toBe("finance");
    expect(values.isPublic).toBe(true);
    expect(values.isActive).toBe(true);
  });

  it("POST 400s when the name is missing", async () => {
    expect((await POST(post({}))).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("GET returns the committee list", async () => {
    const res = await GET(new Request("http://localhost/api/admin/committees"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ committees: [] });
  });
});
