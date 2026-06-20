import { describe, expect, it } from "vitest";
import { buildResourceValues } from "./resources-input";

const core = { title: "SBA Loans", category: "Funding", url: "https://sba.gov" };

describe("buildResourceValues", () => {
  it("requires title, category, and url when requireCore", () => {
    for (const drop of ["title", "category", "url"]) {
      const body = { ...core, [drop]: "" };
      const r = buildResourceValues(body, { requireCore: true });
      expect("error" in r).toBe(true);
    }
  });

  it("blocks a javascript: URL (stored-XSS guard)", () => {
    const r = buildResourceValues({ ...core, url: "javascript:alert(1)" }, { requireCore: true });
    expect("error" in r && r.error).toMatch(/http/i);
  });

  it("blocks a non-http(s) scheme", () => {
    const r = buildResourceValues({ ...core, url: "ftp://x.test/f" }, { requireCore: true });
    expect("error" in r).toBe(true);
  });

  it("rejects an over-long title", () => {
    const r = buildResourceValues({ ...core, title: "x".repeat(200) }, { requireCore: true });
    expect("error" in r).toBe(true);
  });

  it("accepts a valid full resource", () => {
    const r = buildResourceValues(
      { ...core, description: "Federal loans", linkLabel: "Visit site", isMemberOnly: true, isPublished: false, sortOrder: 3 },
      { requireCore: true },
    );
    expect("values" in r).toBe(true);
    if ("values" in r) {
      expect(r.values).toMatchObject({
        title: "SBA Loans",
        category: "Funding",
        url: "https://sba.gov",
        description: "Federal loans",
        linkLabel: "Visit site",
        isMemberOnly: true,
        isPublished: false,
        sortOrder: 3,
      });
    }
  });

  it("PATCH mode (requireCore:false) takes only provided fields and nulls blank optionals", () => {
    const r = buildResourceValues({ description: "" }, { requireCore: false });
    expect("values" in r).toBe(true);
    if ("values" in r) {
      expect(r.values).toEqual({ description: null });
    }
  });

  it("validates sortOrder and boolean flags", () => {
    expect("error" in buildResourceValues({ sortOrder: 1.5 }, { requireCore: false })).toBe(true);
    expect("error" in buildResourceValues({ isPublished: "yes" }, { requireCore: false })).toBe(true);
  });
});
