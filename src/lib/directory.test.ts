import { describe, expect, it } from "vitest";
import { topIndustries } from "./directory";
import type { Member } from "@/data/members";

const m = (categories: string[]): Member =>
  ({ name: "x", chamberSlug: "x", gzSlug: "", gzUrl: "", address: "", phone: "", website: "", logoUrl: "", description: "", categories, social: {}, membershipTier: 20 });

describe("topIndustries", () => {
  it("counts members per category, sorted descending", () => {
    const out = topIndustries([m(["A", "B"]), m(["A"]), m(["A", "C"])]);
    expect(out[0]).toEqual({ category: "A", count: 3 });
    expect(out).toHaveLength(3);
    expect(out.find((x) => x.category === "B")!.count).toBe(1);
    expect(out.find((x) => x.category === "C")!.count).toBe(1);
  });

  it("applies a positive limit, ignores 0/undefined (returns all)", () => {
    const members = [m(["A"]), m(["B"]), m(["C"])];
    expect(topIndustries(members, 2)).toHaveLength(2);
    expect(topIndustries(members)).toHaveLength(3);
    expect(topIndustries(members, 0)).toHaveLength(3);
  });
});
