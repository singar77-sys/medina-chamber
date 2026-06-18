/**
 * PURE unit tests for the GrowthZone import orchestrator.
 *
 * These exercise ONLY the pure helpers — dedupeMemberships, assignUniqueSlugs,
 * planContacts, buildGzIdMap, kebabCase, chunk. The DB-apply layer (runImport)
 * is imported transitively but never executed here, so no database is needed.
 *
 * Fixtures are small and inline, mirroring the real mapper output shapes.
 */

import { describe, expect, it } from "vitest";
import {
  assignUniqueSlugs,
  buildGzIdMap,
  chunk,
  dedupeByKey,
  dedupeMemberships,
  kebabCase,
  planContacts,
} from "@/lib/migrate/orchestrate";
import type { MappedMembership } from "@/lib/migrate/map-memberships";
import type { MappedContact } from "@/lib/migrate/map-contacts";
import type { MappedOrganization } from "@/lib/migrate/map-organizations";

// ── fixture builders ─────────────────────────────────────────────────────────

/** Build a MappedMembership with sensible defaults for dedupe tests. */
function membership(
  gzContactId: string,
  opts: {
    status?: string;
    renewalDate?: string;
    expirationSerial?: unknown;
    tierSlug?: string;
    tag?: string; // identity marker so we can assert which row won
  } = {},
): MappedMembership {
  return {
    membership: {
      organizationId: undefined as unknown as string,
      tierId: undefined as unknown as string,
      status: "active",
      billingCycle: "annual",
      startDate: "2025-01-01",
      renewalDate: opts.renewalDate ?? "2026-01-01",
      gzId: opts.tag ?? gzContactId, // tag rides on gzId so winner is identifiable
    },
    gzContactId,
    tierSlug: opts.tierSlug ?? "basic",
    gzStatus: opts.status ?? "Active",
    gzExpirationSerial: opts.expirationSerial ?? "",
  };
}

function contact(
  gzId: string,
  gzOrgId: string | null,
  email: string | null,
): MappedContact {
  return {
    firstName: "First",
    lastName: "Last",
    email,
    phone: null,
    title: null,
    gzId,
    gzContactId: gzId,
    gzOrgId,
  };
}

function org(name: string, gzId: string): MappedOrganization {
  return {
    gzId,
    name,
    status: "active",
    email: null,
    phone: null,
    websiteUrl: null,
    address1: null,
    city: null,
    state: null,
    zip: null,
    categories: [],
    gzStatus: "Active",
  };
}

// ── kebabCase / chunk / buildGzIdMap (generic helpers) ───────────────────────

describe("kebabCase", () => {
  it("lowercases and hyphenates", () => {
    expect(kebabCase("Acme Widgets, LLC")).toBe("acme-widgets-llc");
    expect(kebabCase("  Trailing & Leading  ")).toBe("trailing-leading");
  });
});

describe("chunk", () => {
  it("splits into fixed-size chunks with a short tail", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
});

describe("buildGzIdMap", () => {
  it("maps gzId → id and skips null gzIds", () => {
    const map = buildGzIdMap([
      { gzId: "100", id: "uuid-a" },
      { gzId: null, id: "uuid-b" },
      { gzId: "200", id: "uuid-c" },
    ]);
    expect(map.get("100")).toBe("uuid-a");
    expect(map.get("200")).toBe("uuid-c");
    expect(map.size).toBe(2);
  });
});

// ── dedupeMemberships ─────────────────────────────────────────────────────────

describe("dedupeMemberships", () => {
  it("returns one membership per org and counts zero drops when unique", () => {
    const result = dedupeMemberships([
      membership("1"),
      membership("2"),
      membership("3"),
    ]);
    expect(result.winners).toHaveLength(3);
    expect(result.dropped).toBe(0);
  });

  it("keeps the ACTIVE row when an org has a mix of statuses", () => {
    const result = dedupeMemberships([
      membership("1", { status: "Dropped", tag: "dropped-row" }),
      membership("1", { status: "Active", tag: "active-row" }),
    ]);
    expect(result.winners).toHaveLength(1);
    expect(result.dropped).toBe(1);
    expect(result.winners[0].membership.gzId).toBe("active-row");
  });

  it("among multiple ACTIVE rows keeps the latest by renewalDate", () => {
    const result = dedupeMemberships([
      membership("1", { status: "Active", renewalDate: "2025-06-01", tag: "older" }),
      membership("1", { status: "Active", renewalDate: "2027-06-01", tag: "newer" }),
    ]);
    expect(result.winners[0].membership.gzId).toBe("newer");
    expect(result.dropped).toBe(1);
  });

  it("with NO active rows keeps the latest by renewalDate", () => {
    const result = dedupeMemberships([
      membership("1", { status: "Dropped", renewalDate: "2024-01-01", tag: "old" }),
      membership("1", { status: "Dropped", renewalDate: "2025-01-01", tag: "recent" }),
    ]);
    expect(result.winners[0].gzStatus).toBe("Dropped");
    expect(result.winners[0].membership.gzId).toBe("recent");
    expect(result.dropped).toBe(1);
  });

  it("breaks a renewalDate tie by gzExpirationSerial (higher wins)", () => {
    const result = dedupeMemberships([
      membership("1", {
        status: "Dropped",
        renewalDate: "2025-01-01",
        expirationSerial: 45000,
        tag: "low-serial",
      }),
      membership("1", {
        status: "Dropped",
        renewalDate: "2025-01-01",
        expirationSerial: 46000,
        tag: "high-serial",
      }),
    ]);
    expect(result.winners[0].membership.gzId).toBe("high-serial");
    expect(result.dropped).toBe(1);
  });

  it("counts drops across several multi-row orgs", () => {
    const result = dedupeMemberships([
      membership("1", { status: "Active", tag: "a1" }),
      membership("1", { status: "Dropped", tag: "a2" }),
      membership("1", { status: "Dropped", tag: "a3" }),
      membership("2", { status: "Active", tag: "b1" }),
      membership("2", { status: "Active", renewalDate: "2030-01-01", tag: "b2" }),
    ]);
    expect(result.winners).toHaveLength(2);
    expect(result.dropped).toBe(3);
  });
});

// ── assignUniqueSlugs ─────────────────────────────────────────────────────────

describe("assignUniqueSlugs", () => {
  it("kebab-cases names and leaves unique names un-suffixed", () => {
    const out = assignUniqueSlugs([org("Acme Widgets", "1"), org("Beta Corp", "2")]);
    expect(out.map((o) => o.slug)).toEqual(["acme-widgets", "beta-corp"]);
  });

  it("resolves duplicate names deterministically with -2 / -3 suffixes", () => {
    const out = assignUniqueSlugs([
      org("Smith Insurance", "1"),
      org("Smith Insurance", "2"),
      org("Smith Insurance", "3"),
    ]);
    expect(out.map((o) => o.slug)).toEqual([
      "smith-insurance",
      "smith-insurance-2",
      "smith-insurance-3",
    ]);
  });

  it("is order-deterministic: first occurrence keeps the bare slug", () => {
    const out = assignUniqueSlugs([
      org("Dup Name", "first"),
      org("Other", "x"),
      org("Dup Name", "second"),
    ]);
    const bySlug = Object.fromEntries(out.map((o) => [o.slug, o.gzId]));
    expect(bySlug["dup-name"]).toBe("first");
    expect(bySlug["dup-name-2"]).toBe("second");
  });

  it("falls back to a non-empty base for punctuation-only names", () => {
    const out = assignUniqueSlugs([org("!!!", "1"), org("???", "2")]);
    // both kebab to "" → base "org", second collides → "org-2"
    expect(out.map((o) => o.slug)).toEqual(["org", "org-2"]);
  });

  it("does not mutate the input objects", () => {
    const input = org("Acme", "1");
    const out = assignUniqueSlugs([input]);
    expect(input).not.toHaveProperty("slug");
    expect(out[0].slug).toBe("acme");
  });
});

// ── planContacts ──────────────────────────────────────────────────────────────

describe("planContacts", () => {
  it("drops and counts contacts with a null gzOrgId", () => {
    const result = planContacts([
      contact("1", "org-a", "a@x.com"),
      contact("2", null, "b@x.com"), // unaffiliated → dropped
      contact("3", "org-b", "c@x.com"),
    ]);
    expect(result.kept).toHaveLength(2);
    expect(result.skippedUnaffiliated).toBe(1);
    expect(result.kept.map((c) => c.gzId)).toEqual(["1", "3"]);
  });

  it("keeps the first occurrence of a duplicate email, nulls the rest, counts", () => {
    const result = planContacts([
      contact("1", "org-a", "dup@x.com"),
      contact("2", "org-b", "dup@x.com"),
      contact("3", "org-c", "dup@x.com"),
    ]);
    expect(result.kept).toHaveLength(3);
    expect(result.deDupedEmails).toBe(2);
    expect(result.kept[0].email).toBe("dup@x.com");
    expect(result.kept[1].email).toBeNull();
    expect(result.kept[2].email).toBeNull();
  });

  it("treats emails case-insensitively when de-duplicating", () => {
    const result = planContacts([
      contact("1", "org-a", "Person@X.com"),
      contact("2", "org-b", "person@x.com"),
    ]);
    expect(result.deDupedEmails).toBe(1);
    expect(result.kept[0].email).toBe("Person@X.com");
    expect(result.kept[1].email).toBeNull();
  });

  it("keeps null-email contacts as-is and does not count them as dupes", () => {
    const result = planContacts([
      contact("1", "org-a", null),
      contact("2", "org-b", null),
      contact("3", "org-c", "real@x.com"),
    ]);
    expect(result.kept).toHaveLength(3);
    expect(result.deDupedEmails).toBe(0);
    expect(result.kept[0].email).toBeNull();
    expect(result.kept[1].email).toBeNull();
  });

  it("does not mutate the first-seen contact when nulling a later duplicate", () => {
    const first = contact("1", "org-a", "dup@x.com");
    const second = contact("2", "org-b", "dup@x.com");
    planContacts([first, second]);
    expect(first.email).toBe("dup@x.com"); // untouched
    expect(second.email).toBe("dup@x.com"); // original object untouched (copy nulled)
  });
});

// ── dedupeByKey ───────────────────────────────────────────────────────────────

describe("dedupeByKey", () => {
  type Row = { id: string; val: string };

  it("returns all rows and dropped=0 when all keys are unique", () => {
    const rows: Row[] = [
      { id: "a", val: "1" },
      { id: "b", val: "2" },
      { id: "c", val: "3" },
    ];
    const result = dedupeByKey(rows, (r) => r.id);
    expect(result.rows).toHaveLength(3);
    expect(result.dropped).toBe(0);
    expect(result.rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps the LAST occurrence's data for duplicate keys", () => {
    const rows: Row[] = [
      { id: "dup", val: "first" },
      { id: "other", val: "x" },
      { id: "dup", val: "second" },
      { id: "dup", val: "third" },
    ];
    const result = dedupeByKey(rows, (r) => r.id);
    expect(result.dropped).toBe(2);
    expect(result.rows).toHaveLength(2);
    // "dup" appears at first-seen position (index 0) but carries last-seen data
    const dupRow = result.rows.find((r) => r.id === "dup");
    expect(dupRow?.val).toBe("third");
  });

  it("preserves first-appearance insertion order", () => {
    const rows: Row[] = [
      { id: "b", val: "b1" },
      { id: "a", val: "a1" },
      { id: "b", val: "b2" },
      { id: "c", val: "c1" },
      { id: "a", val: "a2" },
    ];
    const result = dedupeByKey(rows, (r) => r.id);
    expect(result.rows.map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(result.rows.map((r) => r.val)).toEqual(["b2", "a2", "c1"]);
    expect(result.dropped).toBe(2);
  });

  it("passes through rows with null key unchanged, dropped=0 for them", () => {
    const rows: Row[] = [
      { id: "a", val: "1" },
      { id: "", val: "empty-key" },
      { id: "a", val: "2" },
    ];
    const result = dedupeByKey(rows, (r) => r.id || null);
    // "a" deduped to 1, empty-key passes through → 2 rows total, 1 dropped
    expect(result.dropped).toBe(1);
    expect(result.rows).toHaveLength(2);
    const emptyRow = result.rows.find((r) => r.val === "empty-key");
    expect(emptyRow).toBeDefined();
  });

  it("treats null, undefined, and empty string as empty keys (all pass through)", () => {
    const mixed = [
      { k: null as string | null | undefined, v: "null-key" },
      { k: undefined as string | null | undefined, v: "undef-key" },
      { k: "" as string | null | undefined, v: "empty-key" },
      { k: "real", v: "keyed" },
    ];
    const result = dedupeByKey(mixed, (r) => r.k);
    expect(result.dropped).toBe(0);
    expect(result.rows).toHaveLength(4);
  });

  it("returns empty array and dropped=0 for empty input", () => {
    const result = dedupeByKey([] as Row[], (r) => r.id);
    expect(result.rows).toHaveLength(0);
    expect(result.dropped).toBe(0);
  });
});
