import { beforeEach, describe, expect, it, vi } from "vitest";
import { joinCommittee, leaveCommittee } from "./committees";

let selectQueue: unknown[][];
let leaveRows: { id: string }[];

const selLimit = vi.fn(async () => selectQueue.shift() ?? []);
const selWhere = vi.fn(() => ({ limit: selLimit }));
const selFrom = vi.fn(() => ({ where: selWhere }));
const select = vi.fn(() => ({ from: selFrom }));

const updReturning = vi.fn(async () => leaveRows);
const updWhere = vi.fn(() => ({
  returning: updReturning,
  then: (res: (v: undefined) => unknown) => Promise.resolve(undefined).then(res),
}));
const updSet = vi.fn((_v: Record<string, unknown>) => ({ where: updWhere }));
const update = vi.fn(() => ({ set: updSet }));

const insValues = vi.fn(async (_v: unknown) => undefined);
const insert = vi.fn(() => ({ values: insValues }));

const mockDb = { select, update, insert } as never;

beforeEach(() => {
  vi.clearAllMocks();
  selectQueue = [];
  leaveRows = [];
});

describe("joinCommittee", () => {
  it("inserts a new membership when the org isn't on the committee", async () => {
    selectQueue = [[], []]; // no active row, no prior row
    const changed = await joinCommittee(mockDb, "c1", "o1", "ct1");
    expect(changed).toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when the org is already an active member", async () => {
    selectQueue = [[{ id: "m1" }]]; // active row exists
    const changed = await joinCommittee(mockDb, "c1", "o1", "ct1");
    expect(changed).toBe(false);
    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("reactivates a prior (left) row instead of stacking a duplicate", async () => {
    selectQueue = [[], [{ id: "m1" }]]; // no active row, but a left row exists
    const changed = await joinCommittee(mockDb, "c1", "o1", "ct1");
    expect(changed).toBe(true);
    expect(insert).not.toHaveBeenCalled();
    // reactivation clears leftAt
    expect(updSet.mock.calls[0][0]).toMatchObject({ leftAt: null });
  });
});

describe("leaveCommittee", () => {
  it("returns true when an active membership was stamped left", async () => {
    leaveRows = [{ id: "m1" }];
    expect(await leaveCommittee(mockDb, "c1", "o1")).toBe(true);
  });

  it("returns false when the org wasn't an active member", async () => {
    leaveRows = [];
    expect(await leaveCommittee(mockDb, "c1", "o1")).toBe(false);
  });
});
