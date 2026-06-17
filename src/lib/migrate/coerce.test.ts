import { describe, expect, it } from "vitest";
import { cleanStr, excelDateToISO, parseCents } from "@/lib/migrate/coerce";

describe("excelDateToISO", () => {
  it("maps a whole Excel serial to its UTC ISO date", () => {
    // 45927 with offset 25569 -> 2025-09-27 (verified against the formula).
    expect(excelDateToISO(45927)).toBe("2025-09-27");
  });

  it("ignores the fractional time component (same day as the whole serial)", () => {
    expect(excelDateToISO(45859)).toBe("2025-07-21");
    expect(excelDateToISO(45859.395833)).toBe("2025-07-21");
    expect(excelDateToISO(45859.395833)).toBe(excelDateToISO(45859));
  });

  it("accepts a numeric string serial", () => {
    expect(excelDateToISO("45927")).toBe("2025-09-27");
  });

  it("returns null for blank / null / undefined", () => {
    expect(excelDateToISO("")).toBeNull();
    expect(excelDateToISO("   ")).toBeNull();
    expect(excelDateToISO(null)).toBeNull();
    expect(excelDateToISO(undefined)).toBeNull();
  });

  it("returns null for non-numeric or out-of-range values", () => {
    expect(excelDateToISO("not a date")).toBeNull();
    expect(excelDateToISO(0)).toBeNull();
    expect(excelDateToISO(-5)).toBeNull();
    expect(excelDateToISO(99999999)).toBeNull();
  });
});

describe("parseCents", () => {
  it("parses a plain dollar string to integer cents", () => {
    expect(parseCents("295")).toBe(29500);
  });

  it("strips '$' and comma separators", () => {
    expect(parseCents("$1,118.50")).toBe(111850);
  });

  it("accepts a numeric dollar amount", () => {
    expect(parseCents(12)).toBe(1200);
  });

  it("rounds to the nearest cent without floating-point drift", () => {
    expect(parseCents("19.99")).toBe(1999);
    expect(parseCents("0.1")).toBe(10);
  });

  it("returns null for blank / null / undefined / non-numeric", () => {
    expect(parseCents("")).toBeNull();
    expect(parseCents("   ")).toBeNull();
    expect(parseCents(null)).toBeNull();
    expect(parseCents(undefined)).toBeNull();
    expect(parseCents("abc")).toBeNull();
    expect(parseCents("$")).toBeNull();
  });
});

describe("cleanStr", () => {
  it("trims surrounding whitespace", () => {
    expect(cleanStr("  Medina  ")).toBe("Medina");
  });

  it("returns null for empty / whitespace-only / null / undefined", () => {
    expect(cleanStr("")).toBeNull();
    expect(cleanStr("   ")).toBeNull();
    expect(cleanStr(null)).toBeNull();
    expect(cleanStr(undefined)).toBeNull();
  });
});
