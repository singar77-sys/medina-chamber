import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const applyRateLimit = vi.fn(async () => null as Response | null);
vi.mock("@/lib/rate-limit", () => ({ applyRateLimit, formLimiter: {} }));
vi.mock("@/lib/email", () => ({ EMAIL_RE: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ }));

let insertThrows = false;
const insValues = vi.fn(async (_v: Record<string, unknown>) => {
  if (insertThrows) throw new Error("relation does not exist");
});
const insert = vi.fn(() => ({ values: insValues }));
vi.mock("@/lib/db", () => ({ db: { insert } }));

let notifyResult = true;
const notifyStaffSponsorship = vi.fn(async () => notifyResult);
vi.mock("@/lib/sponsorships", () => ({ notifyStaffSponsorship }));

let POST: (req: Request) => Promise<Response>;
beforeAll(async () => {
  ({ POST } = (await import("./route")) as unknown as { POST: (req: Request) => Promise<Response> });
});

beforeEach(() => {
  vi.clearAllMocks();
  applyRateLimit.mockResolvedValue(null);
  insertThrows = false;
  notifyResult = true;
});

const post = (body: Record<string, unknown>) =>
  new Request("http://localhost/api/sponsorship", {
    method: "POST",
    body: JSON.stringify(body),
  }) as never;

const valid = {
  businessName: "Acme Co",
  contactName: "Ann",
  email: "ann@acme.co",
  formLoadedAt: Date.now() - 5000, // filled over MIN_FILL_MS ago
};

describe("POST /api/sponsorship", () => {
  it("silently 200s a honeypot hit without saving", async () => {
    const res = await POST(post({ ...valid, website_confirm: "spam" }));
    expect(res.status).toBe(200);
    expect(insert).not.toHaveBeenCalled();
    expect(notifyStaffSponsorship).not.toHaveBeenCalled();
  });

  it("silently 200s an instant (bot) submission", async () => {
    const res = await POST(post({ ...valid, formLoadedAt: Date.now() }));
    expect(res.status).toBe(200);
    expect(insert).not.toHaveBeenCalled();
  });

  it("400s on missing required fields or a bad email", async () => {
    expect((await POST(post({ ...valid, businessName: "" }))).status).toBe(400);
    expect((await POST(post({ ...valid, email: "not-an-email" }))).status).toBe(400);
  });

  it("persists + notifies on a valid inquiry", async () => {
    const res = await POST(post(valid));
    expect(res.status).toBe(200);
    const values = insValues.mock.calls[0][0];
    expect(values.businessName).toBe("Acme Co");
    expect(values.email).toBe("ann@acme.co");
    expect(notifyStaffSponsorship).toHaveBeenCalledTimes(1);
  });

  it("still succeeds (email fallback) when the insert fails but notify works", async () => {
    insertThrows = true;
    const res = await POST(post(valid));
    expect(res.status).toBe(200);
    expect(notifyStaffSponsorship).toHaveBeenCalledTimes(1);
  });

  it("500s only when BOTH the save and the email fail", async () => {
    insertThrows = true;
    notifyResult = false;
    const res = await POST(post(valid));
    expect(res.status).toBe(500);
  });
});
