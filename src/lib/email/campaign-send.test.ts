import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let campaignRow: Record<string, unknown> | undefined;
let claimRows: { id: string }[] = [{ id: "camp1" }];
let insertedIds: { id: string }[] = [{ id: "s1" }, { id: "s2" }];

const selLimit = vi.fn(async () => (campaignRow ? [campaignRow] : []));
const selWhere = vi.fn(() => ({ limit: selLimit }));
const selFrom = vi.fn(() => ({ where: selWhere }));
const select = vi.fn(() => ({ from: selFrom }));

const updReturning = vi.fn(async () => claimRows);
const updWhere = vi.fn(() => ({
  returning: updReturning,
  then: (res: (v: undefined) => unknown) => Promise.resolve(undefined).then(res),
}));
const updSet = vi.fn((_v: Record<string, unknown>) => ({ where: updWhere }));
const update = vi.fn(() => ({ set: updSet }));

const insReturning = vi.fn(async () => insertedIds);
const insValues = vi.fn((_v: unknown) => ({ returning: insReturning }));
const insert = vi.fn(() => ({ values: insValues }));

const mockDb = { select, update, insert } as never;

const resolveAudience = vi.fn(async () => [
  { contactId: "c1", email: "a@x.co", organizationId: "o1", firstName: "Ann" },
  { contactId: "c2", email: "b@x.co", organizationId: "o2", firstName: "Bob" },
]);
vi.mock("./audience", () => ({ resolveAudience }));
vi.mock("./unsubscribe-token", () => ({ signUnsubscribeToken: () => "tok" }));

interface BatchPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
  headers: Record<string, string>;
}
type BatchResult = { data: { data: { id: string }[] } | null; error: { message: string } | null };
const batchSend = vi.fn<(p: BatchPayload[]) => Promise<BatchResult>>(async () => ({
  data: { data: [{ id: "msg1" }, { id: "msg2" }] },
  error: null,
}));
vi.mock("@/lib/email", () => ({ resend: { batch: { send: batchSend } } }));

let sendCampaign: typeof import("./campaign-send").sendCampaign;
beforeAll(async () => {
  ({ sendCampaign } = await import("./campaign-send"));
});

const CAMPAIGN = {
  id: "camp1",
  subject: "May Newsletter",
  fromName: "Medina Chamber",
  fromEmail: "news@medinaohchamber.com",
  replyTo: null,
  htmlBody: "<p>Hello members</p>",
  status: "draft",
  segmentFilter: {},
};

beforeEach(() => {
  vi.clearAllMocks();
  campaignRow = { ...CAMPAIGN };
  claimRows = [{ id: "camp1" }];
  insertedIds = [{ id: "s1" }, { id: "s2" }];
  resolveAudience.mockResolvedValue([
    { contactId: "c1", email: "a@x.co", organizationId: "o1", firstName: "Ann" },
    { contactId: "c2", email: "b@x.co", organizationId: "o2", firstName: "Bob" },
  ]);
});

describe("sendCampaign", () => {
  it("claims, sends a batch with unsubscribe footer + header, and records sends", async () => {
    const res = await sendCampaign(mockDb, "camp1");
    expect(res).toEqual({ sent: 2, recipients: 2 });

    expect(batchSend).toHaveBeenCalledTimes(1);
    const payloads = batchSend.mock.calls[0][0];
    expect(payloads).toHaveLength(2);
    expect(payloads[0].subject).toBe("May Newsletter");
    expect(payloads[0].html).toContain("Hello members");
    expect(payloads[0].html).toContain("Unsubscribe");
    expect(payloads[0].headers["List-Unsubscribe"]).toContain("/api/email/unsubscribe?token=tok");
    expect(insert).toHaveBeenCalledTimes(1); // one batch of email_sends
  });

  it("is an idempotent no-op when the campaign is already sent", async () => {
    campaignRow = { ...CAMPAIGN, status: "sent" };
    const res = await sendCampaign(mockDb, "camp1");
    expect(res.skipped).toBeTruthy();
    expect(batchSend).not.toHaveBeenCalled();
  });

  it("skips (no send) when the claim is lost to a concurrent sender", async () => {
    claimRows = []; // someone else flipped draft→sending first
    const res = await sendCampaign(mockDb, "camp1");
    expect(res.skipped).toBe("already sending");
    expect(resolveAudience).not.toHaveBeenCalled();
    expect(batchSend).not.toHaveBeenCalled();
  });

  it("skips a campaign with no body", async () => {
    campaignRow = { ...CAMPAIGN, htmlBody: null };
    const res = await sendCampaign(mockDb, "camp1");
    expect(res.skipped).toBe("campaign has no body");
    expect(batchSend).not.toHaveBeenCalled();
  });

  it("marks a batch failed (not sent) when Resend resolves with an error", async () => {
    batchSend.mockResolvedValueOnce({ data: null, error: { message: "rate limited" } });
    const res = await sendCampaign(mockDb, "camp1");
    expect(res.sent).toBe(0); // never counted as sent
    expect(updSet.mock.calls.some((c) => c[0].status === "failed")).toBe(true);
  });

  it("marks a batch failed when Resend returns fewer ids than recipients", async () => {
    batchSend.mockResolvedValueOnce({ data: { data: [{ id: "msg1" }] }, error: null }); // 1 id for 2
    const res = await sendCampaign(mockDb, "camp1");
    expect(res.sent).toBe(0);
    expect(updSet.mock.calls.some((c) => c[0].status === "failed")).toBe(true);
  });
});
