import { describe, expect, it } from "vitest";
import { applyMemberOverrides } from "./lib-member-overrides.mjs";

/**
 * The weekly member scrape overwrites src/data/members.json wholesale, so
 * hand-edits to that file do NOT survive - a fact learned the hard way when the
 * same member's category fix kept silently reverting after every run.
 * src/data/member-overrides.json plus this function is the durable replacement:
 * scrape-members.mjs calls it after every scrape and apply-member-overrides.mjs
 * re-applies it standalone.
 *
 * If it ever no-ops, the enrichment vanishes on the next Sunday scrape and
 * nobody finds out until a member complains they are in the wrong category.
 */

interface Member {
  chamberSlug: string;
  categories?: string[];
  description?: string;
}

const roofer = (): Member => ({
  chamberSlug: "medwick-construction",
  categories: ["Construction"],
  description: "General contractor.",
});

describe("applyMemberOverrides - categories", () => {
  it("appends the override's categories after the scraped ones", () => {
    const members = [roofer()];
    applyMemberOverrides(members, {
      "medwick-construction": { addCategories: ["Roofing", "Siding"] },
    });
    // Order matters: the scraped categories stay first so the primary listing
    // category on the directory card does not change.
    expect(members[0].categories).toEqual(["Construction", "Roofing", "Siding"]);
  });

  it("dedupes a category the scrape already returned", () => {
    const members = [roofer()];
    const report = applyMemberOverrides(members, {
      "medwick-construction": { addCategories: ["Construction"] },
    });
    expect(members[0].categories).toEqual(["Construction"]);
    // Nothing changed, so nothing is reported - the report is what the operator
    // reads to confirm the override still applies.
    expect(report).toEqual([]);
  });

  it("adds only the missing ones from a partly-overlapping list", () => {
    const members = [roofer()];
    const report = applyMemberOverrides(members, {
      "medwick-construction": { addCategories: ["Construction", "Roofing"] },
    });
    expect(members[0].categories).toEqual(["Construction", "Roofing"]);
    expect(report).toEqual([`medwick-construction: +categories ["Roofing"]`]);
  });

  it("creates the array for a member the scrape returned with no categories", () => {
    const members: Member[] = [{ chamberSlug: "new-co" }];
    applyMemberOverrides(members, { "new-co": { addCategories: ["Roofing"] } });
    expect(members[0].categories).toEqual(["Roofing"]);
  });

  it("ignores a malformed or empty addCategories value", () => {
    const members = [roofer(), roofer(), roofer()];
    applyMemberOverrides(members, {
      "medwick-construction": { addCategories: [] },
    });
    expect(members[0].categories).toEqual(["Construction"]);

    // A hand-edited overrides file with a string instead of an array must not
    // spread it into 8 single-letter categories.
    applyMemberOverrides(members, {
      "medwick-construction": { addCategories: "Roofing" as unknown as string[] },
    });
    expect(members[0].categories).toEqual(["Construction"]);
  });
});

describe("applyMemberOverrides - description", () => {
  it("replaces the scraped description", () => {
    const members = [roofer()];
    const report = applyMemberOverrides(members, {
      "medwick-construction": { description: "Roofing and exteriors since 1978." },
    });
    expect(members[0].description).toBe("Roofing and exteriors since 1978.");
    expect(report).toEqual(["medwick-construction: description set"]);
  });

  it("does NOT blank a real description with an empty or whitespace override", () => {
    // An accidentally-cleared field in member-overrides.json must be inert, not
    // destructive - this runs unattended against the live data file.
    for (const description of ["", "   ", "\n"]) {
      const members = [roofer()];
      applyMemberOverrides(members, { "medwick-construction": { description } });
      expect(members[0].description).toBe("General contractor.");
    }
  });

  it("ignores a non-string description", () => {
    const members = [roofer()];
    applyMemberOverrides(members, {
      "medwick-construction": { description: 42 as unknown as string },
    });
    expect(members[0].description).toBe("General contractor.");
  });
});

describe("applyMemberOverrides - contract with the scrapers", () => {
  it("mutates in place (the scraper writes the same array it passed in)", () => {
    const member = roofer();
    const members = [member];
    applyMemberOverrides(members, {
      "medwick-construction": { addCategories: ["Roofing"], description: "New." },
    });
    // Returning a copy instead would make the scraper serialize the unenriched
    // array and the override would silently do nothing.
    expect(members[0]).toBe(member);
    expect(member.description).toBe("New.");
  });

  it("leaves members with no override entry completely untouched", () => {
    const other: Member = { chamberSlug: "someone-else", categories: ["Retail"] };
    const members = [roofer(), other];
    const report = applyMemberOverrides(members, {
      "medwick-construction": { addCategories: ["Roofing"] },
    });
    expect(other).toEqual({ chamberSlug: "someone-else", categories: ["Retail"] });
    expect(report).toHaveLength(1);
  });

  it("is idempotent - a second pass changes nothing and reports nothing", () => {
    // It runs after EVERY scrape and again on demand; a non-idempotent version
    // would keep appending duplicate categories week over week.
    const members = [roofer()];
    const overrides = {
      "medwick-construction": {
        addCategories: ["Roofing"],
        description: "Roofing and exteriors since 1978.",
      },
    };
    const first = applyMemberOverrides(members, overrides);
    const snapshot = structuredClone(members);
    const second = applyMemberOverrides(members, overrides);

    expect(first).toHaveLength(1);
    expect(second).toEqual([]);
    expect(members).toEqual(snapshot);
  });

  it("does not throw on an empty member list or an empty overrides map", () => {
    expect(applyMemberOverrides([], {})).toEqual([]);
    expect(applyMemberOverrides([roofer()], {})).toEqual([]);
  });
});
