import { beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";
import type { DB } from "@/lib/db";
import { resolveAudience } from "./audience";

/**
 * resolveAudience picks who a campaign actually reaches. Getting it wrong is a
 * real-money, real-reputation failure: mailing an unsubscribed contact is a
 * CAN-SPAM violation, mailing a repeat hard-bouncer burns the sending domain's
 * reputation for every later send, and a broken tier filter blasts a
 * Community-Investor-only announcement to all 500+ members.
 *
 * A mock that only records "the builder was called" cannot catch any of that,
 * so these tests drive the REAL drizzle query builder through the pg-proxy
 * driver and assert on the exact SQL + bound parameters that would reach
 * Postgres. Flip a predicate, drop a condition, or change a default and the
 * comparisons below fail.
 */

/** Captured `{ sql, params }` for every statement the last call issued. */
let issued: Array<{ sql: string; params: unknown[] }> = [];
/** Rows the fake driver hands back, as positional column arrays. */
let driverRows: unknown[][] = [];

function makeDb(): DB {
  return drizzle(async (sql, params) => {
    issued.push({ sql, params });
    return { rows: driverRows };
  }) as unknown as DB;
}

/** The WHERE clause of the single statement resolveAudience issued. */
function whereOf(): string {
  expect(issued).toHaveLength(1);
  const i = issued[0].sql.indexOf(" where ");
  expect(i).toBeGreaterThan(-1);
  return issued[0].sql.slice(i + " where ".length);
}

beforeEach(() => {
  issued = [];
  driverRows = [];
});

// The four shapes the composer can produce. Suppression must hold for all of them.
const EVERY_SEGMENT_SHAPE = [
  {},
  { statuses: ["active", "courtesy"] },
  { organizationIds: ["org-a"] },
  { tiers: ["community-investor"] },
];

// -- Hard rules: true for every segment, overridable by none -------------------

describe("resolveAudience - suppression rules no segment can override", () => {
  it.each(EVERY_SEGMENT_SHAPE)("never selects an unsubscribed contact (%o)", async (segment) => {
    await resolveAudience(makeDb(), segment);
    // Dropping this predicate mails people who explicitly opted out - CAN-SPAM.
    expect(whereOf()).toContain(`"contacts"."unsubscribed_at" is null`);
  });

  it.each(EVERY_SEGMENT_SHAPE)("never selects a contact with no email (%o)", async (segment) => {
    await resolveAudience(makeDb(), segment);
    expect(whereOf()).toContain(`"contacts"."email" is not null`);
  });

  it.each(EVERY_SEGMENT_SHAPE)("never selects a repeat hard-bouncer (%o)", async (segment) => {
    await resolveAudience(makeDb(), segment);
    // Re-sending to known-bad addresses is what gets a sending domain blocklisted.
    expect(whereOf()).toContain(`"contacts"."bounce_count" < $1`);
    expect(issued[0].params[0]).toBe(3);
  });
});

// -- Organization status ------------------------------------------------------

describe("resolveAudience - organization status", () => {
  it("defaults to active-only when the segment names no statuses", async () => {
    await resolveAudience(makeDb(), {});
    // Whole-clause equality: any added, removed, or reordered predicate fails.
    expect(whereOf()).toBe(
      `("contacts"."email" is not null and "contacts"."unsubscribed_at" is null ` +
        `and "contacts"."bounce_count" < $1 and "organizations"."status" in ($2))`,
    );
    expect(issued[0].params).toEqual([3, "active"]);
  });

  it("treats an empty statuses array as unset and still defaults to active", async () => {
    await resolveAudience(makeDb(), { statuses: [] });
    expect(issued[0].params).toEqual([3, "active"]);
  });

  it("REPLACES the active default rather than adding to it", async () => {
    await resolveAudience(makeDb(), { statuses: ["prospect"] });
    // A prospect-recruitment blast must not also reach every paying member.
    expect(issued[0].params).toEqual([3, "prospect"]);
    expect(issued[0].params).not.toContain("active");
  });

  it("binds every requested status, in order", async () => {
    await resolveAudience(makeDb(), { statuses: ["active", "courtesy"] });
    expect(whereOf()).toContain(`"organizations"."status" in ($2, $3)`);
    expect(issued[0].params).toEqual([3, "active", "courtesy"]);
  });

  it("excludes inactive/deleted/non_member orgs from the default audience", async () => {
    await resolveAudience(makeDb(), {});
    for (const status of ["inactive", "deleted", "non_member", "prospect", "courtesy"]) {
      expect(issued[0].params).not.toContain(status);
    }
  });
});

// -- Explicit organization ids ------------------------------------------------

describe("resolveAudience - organizationIds", () => {
  it("ANDs the id filter with the status filter (it does NOT override it)", async () => {
    // The CampaignSegment doc-comment in src/lib/db/schema/email.ts calls
    // organizationIds an "override"; the implementation intersects. Pinning the
    // real behavior: naming a deleted org's id does NOT resurrect it into the
    // audience, because the status predicate still applies.
    await resolveAudience(makeDb(), { organizationIds: ["org-a", "org-b"] });
    const where = whereOf();
    expect(where).toContain(`"organizations"."status" in ($2)`);
    expect(where).toContain(`"organizations"."id" in ($3, $4)`);
    expect(issued[0].params).toEqual([3, "active", "org-a", "org-b"]);
  });

  it("omits the id filter entirely when the array is empty", async () => {
    await resolveAudience(makeDb(), { organizationIds: [] });
    expect(whereOf()).not.toContain(`"organizations"."id" in`);
  });
});

// -- Membership tier ----------------------------------------------------------

describe("resolveAudience - tiers", () => {
  it("restricts to orgs holding a membership in the requested tier", async () => {
    await resolveAudience(makeDb(), { tiers: ["community-investor"] });
    const where = whereOf();
    expect(where).toContain(
      `"organizations"."id" in (select "memberships"."organization_id" from "memberships" ` +
        `inner join "membership_tiers" on "memberships"."tier_id" = "membership_tiers"."id"`,
    );
    expect(where).toContain(`"membership_tiers"."slug" in ($5)`);
    expect(issued[0].params).toEqual([3, "active", "active", "past_due", "community-investor"]);
  });

  it("INCLUDES in-grace past_due members in a tier send", async () => {
    // The regression this guards: an active-only membership predicate silently
    // dropped every member inside the 30-day grace window from tier comms.
    await resolveAudience(makeDb(), { tiers: ["visibility-plus"] });
    expect(whereOf()).toContain(`"memberships"."status" in ($3, $4)`);
    expect(issued[0].params).toContain("past_due");
  });

  it("EXCLUDES lapsed, cancelled, pending and trial memberships from a tier send", async () => {
    // Mailing a paid-tier benefit to someone who cancelled is a support ticket
    // at best and a billing dispute at worst.
    await resolveAudience(makeDb(), { tiers: ["community-investor"] });
    for (const status of ["lapsed", "cancelled", "pending", "trial"]) {
      expect(issued[0].params).not.toContain(status);
    }
  });

  it("binds every requested tier slug", async () => {
    await resolveAudience(makeDb(), { tiers: ["community-investor", "visibility-plus"] });
    expect(whereOf()).toContain(`"membership_tiers"."slug" in ($5, $6)`);
    expect(issued[0].params).toEqual([
      3,
      "active",
      "active",
      "past_due",
      "community-investor",
      "visibility-plus",
    ]);
  });

  it("does not join memberships at all when no tier is requested", async () => {
    await resolveAudience(makeDb(), {});
    expect(whereOf()).not.toContain("memberships");
    expect(whereOf()).not.toContain("membership_tiers");
  });

  it("treats an empty tiers array as all-tiers (no membership join)", async () => {
    await resolveAudience(makeDb(), { tiers: [] });
    expect(whereOf()).not.toContain("memberships");
  });
});

// -- Segment fields the query deliberately ignores -----------------------------

describe("resolveAudience - fields the composer offers but the query ignores", () => {
  it("does not filter on categories or excludeInactiveDays", async () => {
    // Documented as unwired in the module header. If someone wires them, this
    // test fails and the header comment gets corrected along with it.
    await resolveAudience(makeDb(), { categories: ["restaurants"], excludeInactiveDays: 90 });
    expect(issued[0].params).toEqual([3, "active"]);
    expect(whereOf()).not.toContain("categor");
    expect(whereOf()).not.toContain("opened");
  });
});

// -- Row mapping --------------------------------------------------------------

describe("resolveAudience - result mapping", () => {
  it("maps selected columns onto AudienceMember", async () => {
    // Column order matches the selectDistinct() projection.
    driverRows = [["c1", "ann@acme.co", "o1", "Ann"]];
    const out = await resolveAudience(makeDb(), {});
    expect(out).toEqual([
      { contactId: "c1", email: "ann@acme.co", organizationId: "o1", firstName: "Ann" },
    ]);
  });

  it("drops a null-email row instead of handing Resend a null recipient", async () => {
    // Belt-and-braces behind the SQL is-not-null: one `to: null` fails the whole
    // Resend batch, not just that recipient.
    driverRows = [
      ["c1", "ann@acme.co", "o1", "Ann"],
      ["c2", null, "o2", "Bob"],
    ];
    const out = await resolveAudience(makeDb(), {});
    expect(out.map((r) => r.contactId)).toEqual(["c1"]);
  });

  it("returns an empty list rather than throwing when nothing matches", async () => {
    driverRows = [];
    expect(await resolveAudience(makeDb(), { tiers: ["nonexistent-tier"] })).toEqual([]);
  });
});
