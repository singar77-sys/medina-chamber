import { describe, expect, it, vi } from "vitest";
import type { Member } from "@/data/members";

/**
 * The chamber's directory rule tells the model to quote TOTAL_MATCHING_COUNT
 * verbatim when someone asks "how many X?". That makes this number a published
 * fact, not a debug field — so the block has to say three separate things and
 * keep them separate:
 *
 *   how many members MATCH   (the census, before display limits)
 *   how many are LISTED here (the display, after them)
 *   whether the census is a real census or only a floor
 *
 * The regression that motivated the split: the route folded fresh semantic
 * results into the tier buckets and then computed the total as
 * buckets + fresh, counting every new vector hit twice. One unique match came
 * out as "2 members match", and the bot said so.
 */

// Ratings and scraped-website enrichment are separate concerns with their own
// data files; this file is about the counting header.
vi.mock("@/lib/website-search", () => ({
  formatEnrichedMember: (m: Member) => `**${m.name}**`,
  getWebData: () => null,
  sanitizeField: (s: string) => s,
}));

const { formatMembersGroupedForPrompt } = await import("./chat-search");

function member(name: string): Member {
  return {
    name,
    chamberSlug: name.toLowerCase().replace(/\s+/g, "-"),
    gzSlug: "",
    gzUrl: "",
    address: "",
    phone: "",
    website: "",
    logoUrl: "",
    description: "",
    categories: [],
    social: {},
    membershipTier: 9,
  } as unknown as Member;
}

function countLine(out: string): string {
  return out.split("\n").find((l) => l.startsWith("TOTAL_MATCHING_COUNT:"))!;
}

describe("formatMembersGroupedForPrompt counting", () => {
  it("reports one unique match as one", () => {
    // The exact double-count: zero keyword hits, one semantic hit.
    const out = formatMembersGroupedForPrompt([], [], [member("Acme Roofing")], {
      total: 1,
      approximate: true,
    });
    expect(countLine(out)).toContain("TOTAL_MATCHING_COUNT: 1 members match");
    expect(countLine(out)).toContain("all 1 are listed below");
  });

  it("keeps the census and the displayed count as separate numbers", () => {
    // 40 match, the tier limits print 12. Claiming 12 understates the
    // directory; claiming the 12 are all of them is the other wrong answer.
    const ci = Array.from({ length: 12 }, (_, i) => member(`CI ${i}`));
    const out = formatMembersGroupedForPrompt(ci, [], [], { total: 40 });
    expect(countLine(out)).toContain("TOTAL_MATCHING_COUNT: 40 members match");
    expect(countLine(out)).toContain("DISPLAYED_BELOW: only 12 of them");
    expect(countLine(out)).toContain("do not describe the list as complete");
  });

  it("says so plainly when every match is on screen", () => {
    const out = formatMembersGroupedForPrompt(
      [member("A")],
      [member("B")],
      [member("C")],
      { total: 3 },
    );
    expect(countLine(out)).toContain("DISPLAYED_BELOW: all 3 are listed below");
    expect(countLine(out)).toContain('Use this exact number');
  });

  it("marks a semantic top-K count as a floor, never a census", () => {
    // A similarity search returns its closest K and stops. It can tell you
    // these matched; it can never tell you nothing else would have.
    const out = formatMembersGroupedForPrompt([], [], [member("Acme")], {
      total: 4,
      approximate: true,
    });
    expect(countLine(out)).toContain("MINIMUM, not a full count");
    expect(countLine(out)).toContain('answer count questions with "at least 4"');
    expect(countLine(out)).not.toContain("Use this exact number");
  });

  it("never reports fewer matches than it prints", () => {
    // Defensive: a caller that miscounts downward would otherwise produce
    // "2 members match" above a list of five.
    const five = Array.from({ length: 5 }, (_, i) => member(`M ${i}`));
    const out = formatMembersGroupedForPrompt(five, [], [], { total: 2 });
    expect(countLine(out)).toContain("TOTAL_MATCHING_COUNT: 5 members match");
    expect(countLine(out)).toContain("all 5 are listed below");
  });

  it("returns nothing at all when no bucket has a member", () => {
    expect(formatMembersGroupedForPrompt([], [], [], { total: 0 })).toBe("");
  });

  it("omits the count header entirely when no counts are supplied", () => {
    const out = formatMembersGroupedForPrompt([member("A")], [], []);
    expect(out).not.toContain("TOTAL_MATCHING_COUNT");
    expect(out).toContain("**A**");
  });
});
