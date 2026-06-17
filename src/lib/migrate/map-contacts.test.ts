import { describe, expect, it } from "vitest";
import { mapContact, mapContacts } from "@/lib/migrate/map-contacts";
import type { Row } from "@/lib/migrate/load";

/**
 * Build a header-keyed row the way load.loadRows() does (sheet_to_json with
 * defval ""). The .xlsx stores ContactId / Primary Business Id as numbers, so
 * the fixtures use real numeric ids, matching the export.
 */
function row(overrides: Partial<Record<string, unknown>> = {}): Row {
  return {
    "Contact First Name": "",
    "Contact Last Name": "",
    "Contact Title": "",
    "Contact Membership Status": "",
    "Contact Name": "",
    ContactId: "",
    "Account Number": "",
    "Default Email": "",
    "Default Phone": "",
    "Default Website": "",
    "Default Address 1": "",
    "Default City": "",
    "Default State Province": "",
    "Default Postal": "",
    "All Business Categories": "",
    "Primary Business": "",
    "Primary Business Account Number": "",
    "Primary Business Id": "",
    "Contact Names for Parent Org": "",
    "Contact Relationship Type": "",
    ...overrides,
  };
}

describe("mapContact", () => {
  it("maps a fully-populated affiliated contact (real-shaped row)", () => {
    const out = mapContact(
      row({
        "Contact First Name": "Aaron",
        "Contact Last Name": "Tester",
        "Contact Title": "Owner",
        "Contact Membership Status": "Active",
        "Contact Name": "Aaron Tester",
        ContactId: 22531582, // numeric, as stored in the .xlsx
        "Default Email": "aaron@rctlogistics.com",
        "Default Phone": "(330) 555-0000",
        "Primary Business": "RCT Logistics",
        "Primary Business Id": 22530054, // numeric
      }),
    );

    expect(out.firstName).toBe("Aaron");
    expect(out.lastName).toBe("Tester");
    expect(out.title).toBe("Owner");
    expect(out.email).toBe("aaron@rctlogistics.com");
    expect(out.phone).toBe("(330) 555-0000");
    // numeric ids are stringified to the text gz keys
    expect(out.gzId).toBe("22531582");
    expect(out.gzContactId).toBe("22531582");
    expect(out.gzOrgId).toBe("22530054");
  });

  it("gzId mirrors gzContactId (same idempotency key)", () => {
    const out = mapContact(row({ ContactId: 25583331 }));
    expect(out.gzId).toBe(out.gzContactId);
    expect(out.gzId).toBe("25583331");
  });

  it("emits null gzOrgId for an unaffiliated individual (blank Primary Business Id)", () => {
    const out = mapContact(
      row({
        "Contact First Name": "Jane",
        "Contact Last Name": "Doe",
        ContactId: 25583331,
        "Default Email": "brittanydsoto@yahoo.com",
        "Primary Business Id": "", // 149 such rows in the export
      }),
    );
    expect(out.gzOrgId).toBeNull();
    expect(out.gzContactId).toBe("25583331");
  });

  it("coerces blank notNull names to empty string, not null (id/email-only stub)", () => {
    // Real row: ContactId 25583331 has no first/last name, only an email.
    const out = mapContact(
      row({
        ContactId: 25583331,
        "Contact First Name": "",
        "Contact Last Name": "",
        "Default Email": "brittanydsoto@yahoo.com",
      }),
    );
    expect(out.firstName).toBe("");
    expect(out.lastName).toBe("");
    // never null for the notNull columns
    expect(out.firstName).not.toBeNull();
    expect(out.lastName).not.toBeNull();
  });

  it("nulls blank optional fields (email/phone/title)", () => {
    const out = mapContact(
      row({
        "Contact First Name": "Accounting",
        ContactId: 22531602,
        "Default Email": "",
        "Default Phone": "",
        "Contact Title": "",
      }),
    );
    expect(out.email).toBeNull();
    expect(out.phone).toBeNull();
    expect(out.title).toBeNull();
    expect(out.firstName).toBe("Accounting");
  });

  it("trims surrounding whitespace on string cells", () => {
    const out = mapContact(
      row({
        "Contact First Name": "  Jane  ",
        "Contact Last Name": "  Doe  ",
        ContactId: 100,
        "Default Email": "  jane@x.com  ",
      }),
    );
    expect(out.firstName).toBe("Jane");
    expect(out.lastName).toBe("Doe");
    expect(out.email).toBe("jane@x.com");
  });

  it("does NOT emit any column the contacts table lacks (address/status/organizationId/isPrimaryContact)", () => {
    const out = mapContact(
      row({
        ContactId: 1,
        "Contact Membership Status": "Active",
        "Default Address 1": "123 Main St",
        "Default City": "Medina",
        "Primary Business Id": 9,
      }),
    );
    const keys = Object.keys(out).sort();
    expect(keys).toEqual(
      ["email", "firstName", "gzContactId", "gzId", "gzOrgId", "lastName", "phone", "title"].sort(),
    );
    // belt-and-suspenders: no invented FK / status / address keys
    expect(out).not.toHaveProperty("organizationId");
    expect(out).not.toHaveProperty("isPrimaryContact");
    expect(out).not.toHaveProperty("status");
    expect(out).not.toHaveProperty("address1");
  });
});

describe("mapContacts", () => {
  it("maps an array of rows", () => {
    const out = mapContacts([
      row({ "Contact First Name": "A", "Contact Last Name": "One", ContactId: 1, "Primary Business Id": 10 }),
      row({ "Contact First Name": "B", "Contact Last Name": "Two", ContactId: 2, "Primary Business Id": "" }),
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].gzContactId).toBe("1");
    expect(out[0].gzOrgId).toBe("10");
    expect(out[1].gzContactId).toBe("2");
    expect(out[1].gzOrgId).toBeNull();
  });
});
