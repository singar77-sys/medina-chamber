import { describe, expect, it, vi } from "vitest";
import { logEngagement } from "./engagement";
import type { DB } from "@/lib/db";

function mockDb(valuesImpl: (v: Record<string, unknown>) => unknown) {
  const values = vi.fn(valuesImpl);
  const insert = vi.fn(() => ({ values }));
  return { db: { insert } as unknown as DB, values, insert };
}

describe("logEngagement", () => {
  it("inserts the event with the given fields", async () => {
    const { db, values } = mockDb(async () => {});
    await logEngagement(db, {
      eventType: "event_attended",
      organizationId: "o1",
      contactId: "c1",
      metadata: { eventId: "e1" },
    });
    expect(values).toHaveBeenCalledWith({
      eventType: "event_attended",
      organizationId: "o1",
      contactId: "c1",
      metadata: { eventId: "e1" },
    });
  });

  it("defaults org/contact/metadata to null when omitted", async () => {
    const { db, values } = mockDb(async () => {});
    await logEngagement(db, { eventType: "portal_login" });
    expect(values).toHaveBeenCalledWith({
      eventType: "portal_login",
      organizationId: null,
      contactId: null,
      metadata: null,
    });
  });

  it("never throws — analytics must not break the user action", async () => {
    const { db } = mockDb(async () => {
      throw new Error("db down");
    });
    await expect(logEngagement(db, { eventType: "hot_deal_view" })).resolves.toBeUndefined();
  });
});
