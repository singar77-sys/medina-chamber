import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const logEngagement = vi.fn(async (_db: unknown, _input: Record<string, unknown>) => {});
vi.mock("@/lib/engagement", () => ({ logEngagement }));

let dealRow: Record<string, unknown> | null = null;
const limit = vi.fn(async () => (dealRow ? [dealRow] : []));
const where = vi.fn(() => ({ limit }));
const innerJoin = vi.fn(() => ({ where }));
const from = vi.fn(() => ({ innerJoin }));
const select = vi.fn(() => ({ from }));
vi.mock("@/lib/db", () => ({ db: { select } }));

let GET: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
beforeAll(async () => {
  GET = (await import("./route")).GET;
});
beforeEach(() => {
  vi.clearAllMocks();
  dealRow = null;
});

const VALID = "11111111-1111-1111-1111-111111111111";
const call = (id: string) =>
  GET(new Request(`http://localhost/go/deal/${id}`), { params: Promise.resolve({ id }) });

describe("GET /go/deal/[id]", () => {
  it("rejects a non-uuid id and never queries the DB", async () => {
    const res = await call("not-a-uuid");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/deals");
    expect(select).not.toHaveBeenCalled();
    expect(logEngagement).not.toHaveBeenCalled();
  });

  it("logs hot_deal_view and redirects to the deal's http(s) url", async () => {
    dealRow = { organizationId: "o1", dealUrl: "https://acme.test/deal", orgWebsite: "https://acme.test" };
    const res = await call(VALID);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://acme.test/deal");
    expect(logEngagement).toHaveBeenCalledTimes(1);
    expect(logEngagement.mock.calls[0][1]).toMatchObject({ eventType: "hot_deal_view", organizationId: "o1" });
  });

  it("falls back to the org website when the deal has no dealUrl", async () => {
    dealRow = { organizationId: "o1", dealUrl: null, orgWebsite: "https://acme.test/biz" };
    const res = await call(VALID);
    expect(res.headers.get("location")).toBe("https://acme.test/biz");
  });

  it("refuses a non-http(s) destination (open-redirect defense) → /deals, no log", async () => {
    dealRow = { organizationId: "o1", dealUrl: "javascript:alert(1)", orgWebsite: null };
    const res = await call(VALID);
    expect(res.headers.get("location")).toContain("/deals");
    expect(logEngagement).not.toHaveBeenCalled();
  });

  it("falls back when the deal does not exist", async () => {
    dealRow = null;
    const res = await call(VALID);
    expect(res.headers.get("location")).toContain("/deals");
    expect(logEngagement).not.toHaveBeenCalled();
  });
});
