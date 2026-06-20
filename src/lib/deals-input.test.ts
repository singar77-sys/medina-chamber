import { describe, expect, it } from "vitest";
import { buildDealValues } from "./deals-input";

describe("buildDealValues", () => {
  it("requires title + description when requireCore", () => {
    expect("error" in buildDealValues({}, { requireCore: true })).toBe(true);
    expect("error" in buildDealValues({ title: "20% off" }, { requireCore: true })).toBe(true);
    const ok = buildDealValues({ title: "20% off", description: "A great deal" }, { requireCore: true });
    expect("values" in ok).toBe(true);
  });

  it("allows a partial update without the core fields", () => {
    const r = buildDealValues({ isActive: false }, { requireCore: false });
    expect("values" in r && r.values).toMatchObject({ isActive: false });
  });

  it("rejects a javascript: deal URL (stored-XSS guard) but accepts http(s)", () => {
    expect("error" in buildDealValues({ dealUrl: "javascript:alert(1)" }, { requireCore: false })).toBe(true);
    expect("error" in buildDealValues({ dealUrl: "data:text/html,x" }, { requireCore: false })).toBe(true);
    const ok = buildDealValues({ dealUrl: "https://acme.com/deal" }, { requireCore: false });
    expect("values" in ok && ok.values.dealUrl).toContain("acme.com");
  });

  it("rejects an invalid date and an end-before-start range", () => {
    expect("error" in buildDealValues({ startsAt: "not-a-date" }, { requireCore: false })).toBe(true);
    expect(
      "error" in buildDealValues({ startsAt: "2026-07-10", endsAt: "2026-07-01" }, { requireCore: false }),
    ).toBe(true);
    expect(
      "values" in buildDealValues({ startsAt: "2026-07-01", endsAt: "2026-07-10" }, { requireCore: false }),
    ).toBe(true);
  });

  it("clears an optional field sent as empty string to null", () => {
    const r = buildDealValues({ terms: "" }, { requireCore: false });
    expect("values" in r && r.values.terms).toBeNull();
  });

  it("rejects an over-long title", () => {
    expect(
      "error" in buildDealValues({ title: "x".repeat(121), description: "d" }, { requireCore: true }),
    ).toBe(true);
  });
});
