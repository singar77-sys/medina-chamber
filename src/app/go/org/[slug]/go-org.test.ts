import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const logEngagement = vi.fn(async (_db: unknown, _input: Record<string, unknown>) => {});
vi.mock("@/lib/engagement", () => ({ logEngagement }));

let orgRow: Record<string, unknown> | null = null;
const limit = vi.fn(async () => (orgRow ? [orgRow] : []));
const where = vi.fn(() => ({ limit }));
const from = vi.fn(() => ({ where }));
const select = vi.fn(() => ({ from }));
vi.mock("@/lib/db", () => ({ db: { select } }));

let GET: (req: Request, ctx: { params: Promise<{ slug: string }> }) => Promise<Response>;
beforeAll(async () => {
  GET = (await import("./route")).GET;
});
beforeEach(() => {
  vi.clearAllMocks();
  orgRow = null;
});

const call = (slug: string) =>
  GET(new Request(`http://localhost/go/org/${slug}`), { params: Promise.resolve({ slug }) });

describe("GET /go/org/[slug]", () => {
  it("redirects to the directory when the org is not found, no log", async () => {
    const res = await call("nope");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/membership/directory");
    expect(logEngagement).not.toHaveBeenCalled();
  });

  it("logs referral_click and redirects to the org website", async () => {
    orgRow = { id: "o1", websiteUrl: "https://acme.test/biz" };
    const res = await call("acme");
    expect(res.headers.get("location")).toBe("https://acme.test/biz");
    expect(logEngagement.mock.calls[0][1]).toMatchObject({ eventType: "referral_click", organizationId: "o1" });
  });

  it("refuses a non-http(s) website (open-redirect defense) → directory, no log", async () => {
    orgRow = { id: "o1", websiteUrl: "javascript:alert(1)" };
    const res = await call("acme");
    expect(res.headers.get("location")).toContain("/membership/directory");
    expect(logEngagement).not.toHaveBeenCalled();
  });
});
