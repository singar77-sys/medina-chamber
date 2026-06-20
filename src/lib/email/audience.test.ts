import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// The SQL-level filtering (unsubscribed / status / tier) lives in the WHERE and
// is exercised by a live staging check, not the mock. This unit pins the
// JS-level guarantees: null emails dropped, rows mapped to AudienceMember.
let rows: Array<Record<string, unknown>>;
const where = vi.fn(async () => rows);
const innerJoin = vi.fn(() => ({ where }));
const from = vi.fn(() => ({ innerJoin }));
const selectDistinct = vi.fn(() => ({ from }));
// the tier subquery builder — never executed, just handed to inArray()
const subWhere = vi.fn(() => ({}));
const subInnerJoin = vi.fn(() => ({ where: subWhere }));
const subFrom = vi.fn(() => ({ innerJoin: subInnerJoin }));
const select = vi.fn(() => ({ from: subFrom }));
const mockDb = { selectDistinct, select } as never;

let resolveAudience: typeof import("./audience").resolveAudience;
beforeAll(async () => {
  ({ resolveAudience } = await import("./audience"));
});

afterEach(() => {
  vi.clearAllMocks();
  rows = [];
});

describe("resolveAudience", () => {
  it("maps rows and drops null-email contacts", async () => {
    rows = [
      { contactId: "c1", email: "a@x.co", organizationId: "o1", firstName: "Ann" },
      { contactId: "c2", email: null, organizationId: "o2", firstName: "Bob" },
    ];
    const out = await resolveAudience(mockDb, {});
    expect(out).toEqual([{ contactId: "c1", email: "a@x.co", organizationId: "o1", firstName: "Ann" }]);
  });

  it("builds the tier subquery when tiers are requested", async () => {
    rows = [];
    await resolveAudience(mockDb, { tiers: ["standard"] });
    expect(select).toHaveBeenCalled(); // the tier-org subquery was constructed
  });
});
