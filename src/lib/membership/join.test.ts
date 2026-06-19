import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { organizations, contacts, memberships, invoices } from "@/lib/db/schema";

// generateOrgSlug: db.select().from().where().limit() → existing or []
// generateOrgSlug probes each candidate slug via select().limit(); the first
// `slugTakenUpTo` probes report "taken" so we can exercise the -2 collision path.
let slugProbe = 0;
let slugTakenUpTo = 0;
const limit = vi.fn(async () => (slugProbe++ < slugTakenUpTo ? [{ id: "x" }] : []));
const selWhere = vi.fn(() => ({ limit }));
const selFrom = vi.fn(() => ({ where: selWhere }));
const select = vi.fn(() => ({ from: selFrom }));

// createPendingMember: db.transaction(tx => tx.insert(t).values(v).returning())
let lastInsertTable: unknown;
const insReturning = vi.fn(async () => {
  if (lastInsertTable === organizations) return [{ id: "org1" }];
  if (lastInsertTable === contacts) return [{ id: "c1" }];
  if (lastInsertTable === memberships) return [{ id: "m1" }];
  if (lastInsertTable === invoices) return [{ id: "inv1" }];
  return [{ id: "x" }];
});
const insValues = vi.fn((_v: Record<string, unknown>) => ({ returning: insReturning }));
const insert = vi.fn((t: unknown) => {
  lastInsertTable = t;
  return { values: insValues };
});
const transaction = vi.fn(async (fn: (tx: { insert: typeof insert }) => Promise<unknown>) => fn({ insert }));

// activateMembership: db.update().set().where().returning() (membership) + .where() awaited (org)
let flipRows: { id: string }[] = [{ id: "m1" }];
const updReturning = vi.fn(async () => flipRows);
const updWhere = vi.fn(() => ({
  returning: updReturning,
  then: (res: (v: undefined) => unknown) => Promise.resolve(undefined).then(res),
}));
const set = vi.fn(() => ({ where: updWhere }));
const update = vi.fn(() => ({ set }));

// join.ts takes `db` as a parameter (only imports the DB *type*), so we pass
// this mock object directly rather than mocking the module.
const mockDb = { select, transaction, update };

let mod: typeof import("./join");
beforeAll(async () => {
  mod = await import("./join");
});

afterEach(() => {
  vi.clearAllMocks();
  slugProbe = 0;
  slugTakenUpTo = 0;
  flipRows = [{ id: "m1" }];
  lastInsertTable = undefined;
});

describe("kebabCase", () => {
  it("slugifies names and never returns empty", () => {
    expect(mod.kebabCase("Acme Co.")).toBe("acme-co");
    expect(mod.kebabCase("  Bob & Sons, LLC  ")).toBe("bob-sons-llc");
    expect(mod.kebabCase("!!!")).toBe("member");
  });
});

describe("generateOrgSlug", () => {
  it("returns the base slug when free", async () => {
    slugTakenUpTo = 0;
    expect(await mod.generateOrgSlug(mockDb as never, "Acme Co")).toBe("acme-co");
  });
  it("appends -2 when the base slug is taken", async () => {
    slugTakenUpTo = 1; // first probe (acme-co) taken, second (acme-co-2) free
    expect(await mod.generateOrgSlug(mockDb as never, "Acme Co")).toBe("acme-co-2");
  });
});

describe("createPendingMember", () => {
  it("inserts org → contact → membership → invoice and returns their ids", async () => {
    const res = await mod.createPendingMember(mockDb as never, {
      businessName: "Acme Co",
      slug: "acme-co",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@acme.co",
      phone: "330",
      tierId: "tier_std",
      tierName: "Business Essentials",
      amountCents: 34500,
    });
    expect(res).toEqual({ organizationId: "org1", contactId: "c1", membershipId: "m1", invoiceId: "inv1" });

    // org inserted as prospect, membership pending, invoice pending with the dues amount
    expect(insert.mock.calls.map((c) => c[0])).toEqual([organizations, contacts, memberships, invoices]);
    const inserted = insValues.mock.calls.map((c) => c[0] as Record<string, unknown>);
    expect(inserted[0]).toMatchObject({ slug: "acme-co", status: "prospect" });
    expect(inserted[1]).toMatchObject({ firstName: "Jane", isPrimaryContact: true });
    expect(inserted[2]).toMatchObject({ tierId: "tier_std", status: "pending", billingCycle: "annual" });
    expect(inserted[3]).toMatchObject({ amountCents: 34500, status: "pending" });
  });
});

describe("activateMembership (idempotent)", () => {
  it("activates the org when the membership flips pending→active", async () => {
    flipRows = [{ id: "m1" }];
    expect(await mod.activateMembership(mockDb as never, "m1", "org1")).toBe(true);
    expect(update).toHaveBeenCalledTimes(2); // membership + org
  });

  it("is a no-op (no org update) when the membership was already active", async () => {
    flipRows = []; // guard eq(status,'pending') matched nothing
    expect(await mod.activateMembership(mockDb as never, "m1", "org1")).toBe(false);
    expect(update).toHaveBeenCalledTimes(1); // only the (no-op) membership update; org NOT touched
  });
});
