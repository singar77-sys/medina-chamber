import { describe, expect, it } from "vitest";
import {
  mapOrganizationRow,
  mapStatus,
  parseCategories,
} from "@/lib/migrate/map-organizations";

/**
 * Fixtures are real header-keyed rows as load.ts loadRows() would yield them
 * (footer junk already stripped). The two header-keyed shapes mirror the actual
 * "Contacts Report.xlsx" rows quoted in the task: a populated member-style row
 * and a sparse non-member row.
 */
const memberRow = {
  "Contact Membership Status": "Active",
  "Contact Name": "Acme Co",
  ContactId: 22966185,
  "Account Number": "",
  "Default Email": "hi@acme.com",
  "Default Phone": "(330) 555-1212",
  "Default Website": "https://acme.com",
  "Default Address 1": "123 Main St",
  "Default City": "Medina",
  "Default State Province": "OH",
  "Default Postal": "44256",
  "All Business Categories": "Retail; Services",
};

const sparseNonMemberRow = {
  "Contact Membership Status": "Non Member",
  "Contact Name": "21B Consulting",
  ContactId: 22966459,
  "Account Number": "",
  "Default Email": "",
  "Default Phone": "(843) 749-2227",
  "Default Website": "",
  "Default Address 1": "",
  "Default City": "",
  "Default State Province": "",
  "Default Postal": "",
  "All Business Categories": "",
};

describe("mapOrganizationRow — defensive null guard", () => {
  it("returns null for a footer-shaped row with blank ContactId", () => {
    // Org-export footer: ContactId="" / Contact Membership Status="Count\Average\Totals"
    const footerRow = {
      ContactId: "",
      "Contact Membership Status": "Count\\Average\\Totals",
      "Contact Name": "977",
    };
    expect(mapOrganizationRow(footerRow)).toBeNull();
  });

  it("returns null for a row with a non-numeric ContactId", () => {
    const junkRow = {
      ContactId: "Count\\Average\\Totals",
      "Contact Name": "",
    };
    expect(mapOrganizationRow(junkRow)).toBeNull();
  });
});

describe("mapOrganizationRow — member-style row", () => {
  it("maps every populated column to the schema's camelCase keys", () => {
    const org = mapOrganizationRow(memberRow);

    // ContactId is the GrowthZone join key → lands in the real gzId column,
    // coerced to a string (gz_id is text).
    expect(org.gzId).toBe("22966185");
    expect(typeof org.gzId).toBe("string");

    expect(org.name).toBe("Acme Co");
    expect(org.status).toBe("active");
    expect(org.email).toBe("hi@acme.com");
    expect(org.phone).toBe("(330) 555-1212");
    expect(org.websiteUrl).toBe("https://acme.com");
    expect(org.address1).toBe("123 Main St");
    expect(org.city).toBe("Medina");
    expect(org.state).toBe("OH");
    expect(org.zip).toBe("44256");
  });

  it("preserves the raw status for re-classification", () => {
    expect(mapOrganizationRow(memberRow).gzStatus).toBe("Active");
  });

  it("does not split a single category name on its internal semicolon", () => {
    // "Retail; Services" is ONE category name (semicolon is internal, not a
    // delimiter). The real delimiter is a comma, and there is none here.
    expect(mapOrganizationRow(memberRow).categories).toEqual([
      "Retail; Services",
    ]);
  });

  it("emits no organizations columns the schema does not have", () => {
    const org = mapOrganizationRow(memberRow);
    const allowedKeys = new Set([
      // organizations columns
      "gzId",
      "name",
      "status",
      "email",
      "phone",
      "websiteUrl",
      "address1",
      "city",
      "state",
      "zip",
      // carry-through (intentionally not columns)
      "categories",
      "gzStatus",
    ]);
    for (const key of Object.keys(org)) {
      expect(allowedKeys.has(key)).toBe(true);
    }
    // Account Number is ignored entirely.
    expect(org).not.toHaveProperty("accountNumber");
  });
});

describe("mapOrganizationRow — sparse non-member row", () => {
  it("nulls every blank optional field and keeps the populated phone", () => {
    const org = mapOrganizationRow(sparseNonMemberRow);

    expect(org.gzId).toBe("22966459");
    expect(org.name).toBe("21B Consulting");
    expect(org.status).toBe("non_member");
    expect(org.phone).toBe("(843) 749-2227");

    // Empty cells become null, not "".
    expect(org.email).toBeNull();
    expect(org.websiteUrl).toBeNull();
    expect(org.address1).toBeNull();
    expect(org.city).toBeNull();
    expect(org.state).toBeNull();
    expect(org.zip).toBeNull();
  });

  it("returns an empty category list for a blank categories cell", () => {
    expect(mapOrganizationRow(sparseNonMemberRow).categories).toEqual([]);
  });
});

describe("mapStatus", () => {
  it("maps the four real GrowthZone statuses to the enum", () => {
    expect(mapStatus("Active")).toBe("active");
    expect(mapStatus("Dropped")).toBe("inactive");
    expect(mapStatus("Non Member")).toBe("non_member");
    expect(mapStatus("Pending Approval")).toBe("prospect");
  });

  it("is case-insensitive", () => {
    expect(mapStatus("active")).toBe("active");
    expect(mapStatus("NON MEMBER")).toBe("non_member");
  });

  it("falls back to 'prospect' for blank or unknown values", () => {
    expect(mapStatus("")).toBe("prospect");
    expect(mapStatus(null)).toBe("prospect");
    expect(mapStatus("Some Future Status")).toBe("prospect");
  });
});

describe("parseCategories", () => {
  it("splits a comma-delimited list and trims each name", () => {
    expect(parseCategories("Manufacturing,Manufacturer Rep.")).toEqual([
      "Manufacturing",
      "Manufacturer Rep.",
    ]);
  });

  it("keeps a single category whose name contains a semicolon intact", () => {
    // Real source value: a lone name that contains a semicolon.
    expect(parseCategories("Manufacturing; Production & Wholesale")).toEqual([
      "Manufacturing; Production & Wholesale",
    ]);
    expect(parseCategories("Family; Community & Civic Organizations")).toEqual([
      "Family; Community & Civic Organizations",
    ]);
  });

  it("splits a mixed comma list that also contains a semicolon-bearing name", () => {
    // Real source value. The semicolon name survives as one element; only the
    // commas delimit. (See known limitation below for comma-in-name names.)
    expect(
      parseCategories(
        "Manufacturing,Manufacturing; Production & Wholesale,Manufacturer Rep.",
      ),
    ).toEqual([
      "Manufacturing",
      "Manufacturing; Production & Wholesale",
      "Manufacturer Rep.",
    ]);
  });

  it("KNOWN LIMITATION: over-splits a category name that contains a comma", () => {
    // "Contractor, General" is a single GrowthZone category, but the export
    // gives us no way to distinguish its internal comma from a delimiter, so it
    // fragments. This test documents the lossy behavior the orchestrator must
    // reconcile — if it ever changes, that change is intentional and must be
    // reviewed (a fixed-source export, or a smarter resolver).
    expect(
      parseCategories(
        "Construction Companies,Contractor, General",
      ),
    ).toEqual(["Construction Companies", "Contractor", "General"]);
  });

  it("dedupes repeated names and drops empty fragments", () => {
    expect(parseCategories("Retail,Retail,,Services")).toEqual([
      "Retail",
      "Services",
    ]);
  });

  it("returns [] for blank / null", () => {
    expect(parseCategories("")).toEqual([]);
    expect(parseCategories(null)).toEqual([]);
  });
});
