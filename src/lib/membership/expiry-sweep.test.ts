import { describe, expect, it } from "vitest";
import {
  sweepAbandonedJoins,
  DEFAULT_ABANDONED_JOIN_TTL_HOURS,
} from "./expiry-sweep";
import { organizations, invoices } from "@/lib/db/schema";

/**
 * The sweep's correctness lives in one SQL predicate (untestable without a live
 * Postgres) plus orchestration we CAN pin down with a fake client: the SELECT
 * runs, and when it returns rows the deletes happen in the right order, scoped to
 * the right ids, inside a single transaction. These tests guard the regressions
 * most likely to slip in — reordering the FK-sensitive deletes, breaking the
 * empty-case no-op, or miscounting.
 */

interface DeleteOp {
  table: unknown;
  whereCalled: boolean;
}

/**
 * Minimal stand-in for the Drizzle client surface sweepAbandonedJoins touches:
 * `.execute(sql)` (candidate SELECT) and `.transaction(fn)` whose tx exposes
 * `.delete(table).where(...)[.returning(...)]`.
 */
function makeFakeDb(
  candidateIds: string[],
  opts: { deletedIds?: string[] } = {},
) {
  const executed: unknown[] = [];
  const deleteOps: DeleteOp[] = [];
  let txCount = 0;

  const tx = {
    delete(table: unknown) {
      const op: DeleteOp = { table, whereCalled: false };
      deleteOps.push(op);
      return {
        where() {
          op.whereCalled = true;
          // Awaitable (invoice delete: `await ...where(...)`) AND chainable with
          // .returning() (org delete: `...where(...).returning(...)`).
          return {
            returning: async () =>
              (opts.deletedIds ?? candidateIds).map((id) => ({ id })),
            then: (onFulfilled: (value: unknown) => unknown) =>
              Promise.resolve().then(() => onFulfilled(undefined)),
          };
        },
      };
    },
  };

  const db = {
    async execute(query: unknown) {
      executed.push(query);
      return candidateIds.map((id) => ({ id }));
    },
    async transaction<T>(fn: (t: typeof tx) => Promise<T>): Promise<T> {
      txCount += 1;
      return fn(tx);
    },
  };

  return {
    // Cast through unknown — the fake implements only the slice the engine uses.
    db: db as unknown as Parameters<typeof sweepAbandonedJoins>[0],
    executed,
    deleteOps,
    txCount: () => txCount,
  };
}

describe("sweepAbandonedJoins", () => {
  it("no-ops without opening a transaction when nothing qualifies", async () => {
    const fake = makeFakeDb([]);

    const result = await sweepAbandonedJoins(fake.db);

    expect(result.candidates).toBe(0);
    expect(result.orgsDeleted).toBe(0);
    expect(fake.txCount()).toBe(0);
    expect(fake.deleteOps).toHaveLength(0);
    expect(fake.executed).toHaveLength(1); // the candidate SELECT still runs
  });

  it("deletes invoices BEFORE organizations, in one transaction", async () => {
    const fake = makeFakeDb(["org-a", "org-b"]);

    const result = await sweepAbandonedJoins(fake.db);

    expect(fake.txCount()).toBe(1);
    expect(fake.deleteOps).toHaveLength(2);
    // FK safety: invoices reference organizations with no cascade, so they must
    // be removed first. A reorder here would throw a FK violation in prod.
    expect(fake.deleteOps[0].table).toBe(invoices);
    expect(fake.deleteOps[1].table).toBe(organizations);
    expect(fake.deleteOps.every((op) => op.whereCalled)).toBe(true);
    expect(result.candidates).toBe(2);
    expect(result.orgsDeleted).toBe(2);
  });

  it("reports orgsDeleted from the delete's RETURNING, not the candidate count", async () => {
    // A row flipped out from under us (TOCTOU): 2 candidates, only 1 deleted.
    const fake = makeFakeDb(["org-a", "org-b"], { deletedIds: ["org-a"] });

    const result = await sweepAbandonedJoins(fake.db);

    expect(result.candidates).toBe(2);
    expect(result.orgsDeleted).toBe(1);
  });

  it("defaults the cutoff to 48h and honors an override", async () => {
    const def = await sweepAbandonedJoins(makeFakeDb([]).db);
    expect(def.cutoffHours).toBe(DEFAULT_ABANDONED_JOIN_TTL_HOURS);
    expect(def.cutoffHours).toBe(48);

    const custom = await sweepAbandonedJoins(makeFakeDb([]).db, {
      olderThanHours: 24,
    });
    expect(custom.cutoffHours).toBe(24);
  });
});
