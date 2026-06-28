import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let sendRow: Record<string, unknown> | undefined;
let flipRows: { id: string }[] = [{ id: "send-1" }];

const selLimit = vi.fn(async () => (sendRow ? [sendRow] : []));
const selWhere = vi.fn(() => ({ limit: selLimit }));
const selLeftJoin = vi.fn(() => ({ where: selWhere }));
const selFrom = vi.fn(() => ({ leftJoin: selLeftJoin }));
const select = vi.fn(() => ({ from: selFrom }));

const updReturning = vi.fn(async () => flipRows);
const updWhere = vi.fn(() => ({
  returning: updReturning,
  then: (res: (v: undefined) => unknown) => Promise.resolve(undefined).then(res),
}));
const updSet = vi.fn(() => ({ where: updWhere }));
const update = vi.fn(() => ({ set: updSet }));

const insValues = vi.fn(async (_v: unknown) => undefined);
const insert = vi.fn(() => ({ values: insValues }));

const mockDb = { select, update, insert } as never;

let recordResendEvent: typeof import("./track-resend-event").recordResendEvent;
beforeAll(async () => {
  ({ recordResendEvent } = await import("./track-resend-event"));
});

beforeEach(() => {
  vi.clearAllMocks();
  sendRow = { id: "send-1", campaignId: "camp-1", contactId: "contact-1", organizationId: "org-1" };
  flipRows = [{ id: "send-1" }];
});

describe("recordResendEvent", () => {
  it("ignores an event for a message we never sent", async () => {
    sendRow = undefined;
    await recordResendEvent(mockDb, "email.opened", "unknown");
    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("records a first open: flips the send, bumps openCount, logs engagement", async () => {
    await recordResendEvent(mockDb, "email.opened", "m1");
    expect(update).toHaveBeenCalledTimes(2); // send flip + campaign openCount
    expect(insert).toHaveBeenCalledTimes(1); // engagement_event
  });

  it("is idempotent on a redelivered open (guard returns no row)", async () => {
    flipRows = []; // openedAt was already set
    await recordResendEvent(mockDb, "email.opened", "m1");
    expect(update).toHaveBeenCalledTimes(1); // only the no-op flip attempt
    expect(insert).not.toHaveBeenCalled();
  });

  it("permanent bounce: flips send, bumps campaign + contact suppression, no engagement", async () => {
    await recordResendEvent(mockDb, "email.bounced", "m1", "Permanent");
    expect(update).toHaveBeenCalledTimes(3); // send flip + campaign + contact suppression
    expect(insert).not.toHaveBeenCalled();
  });

  it("temporary bounce: flips send + campaign but does NOT touch contact suppression", async () => {
    await recordResendEvent(mockDb, "email.bounced", "m1", "Temporary");
    expect(update).toHaveBeenCalledTimes(2); // send flip + campaign only — no contact bump
  });

  it("spam complaint hard-unsubscribes the contact", async () => {
    await recordResendEvent(mockDb, "email.complained", "m1");
    expect(update).toHaveBeenCalledTimes(3); // send→spam + contact unsubscribe + campaign count
  });

  it("no-ops on a delivery-only event type", async () => {
    await recordResendEvent(mockDb, "email.delivered", "m1");
    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});
