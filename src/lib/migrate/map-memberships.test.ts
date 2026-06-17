import { describe, expect, it } from "vitest";
import {
  deriveTiers,
  mapBillingCycle,
  mapMembership,
  mapMembershipStatus,
  slugifyTier,
} from "@/lib/migrate/map-memberships";
import type { Row } from "@/lib/migrate/load";

/** Real sample row (the one supplied with the task), as a header-keyed object. */
const SAMPLE_ROW: Row = {
  "Contact Name": "Elevate Business Advisors",
  ContactId: 22966185,
  "Account Number": "",
  "Default Email": "sandra@x.com",
  "Default Phone": "(330) 523-9790",
  Membership: "Business Essentials",
  Level: "",
  "Membership Start Date": 45927,
  "Membership Activation Type": "New",
  "Membership Status": "Active",
  "Renewal Month": "September",
  "Membership Expiration Date": 46291,
  "Scheduled Billing Amount": 86.25,
  Frequency: "Annually",
};

describe("slugifyTier", () => {
  it("kebab-cases the real GrowthZone tier names", () => {
    expect(slugifyTier("Business Essentials")).toBe("business-essentials");
    expect(slugifyTier("Visibility Plus")).toBe("visibility-plus");
    expect(slugifyTier("Insurance only")).toBe("insurance-only");
    expect(slugifyTier("Community Investor")).toBe("community-investor");
    expect(slugifyTier("Basic")).toBe("basic");
  });
});

describe("mapMembershipStatus", () => {
  it("maps the real GrowthZone status values to the enum", () => {
    expect(mapMembershipStatus("Active")).toBe("active");
    expect(mapMembershipStatus("Dropped")).toBe("cancelled"); // see mapper note
    expect(mapMembershipStatus("Pending Approval")).toBe("pending");
  });

  it("defaults unknown / blank status to pending (never drops)", () => {
    expect(mapMembershipStatus("")).toBe("pending");
    expect(mapMembershipStatus(null)).toBe("pending");
    expect(mapMembershipStatus("Something Else")).toBe("pending");
  });
});

describe("mapBillingCycle", () => {
  it("maps Frequency to the billing_cycle enum", () => {
    expect(mapBillingCycle("Annually")).toBe("annual");
    expect(mapBillingCycle("Monthly")).toBe("monthly");
    expect(mapBillingCycle("")).toBe("annual"); // default
    expect(mapBillingCycle(null)).toBe("annual");
  });
});

describe("mapMembership", () => {
  it("maps the real sample row into a memberships insert + dedupe signals", () => {
    const result = mapMembership(SAMPLE_ROW);

    expect(result.gzContactId).toBe("22966185");
    expect(result.tierSlug).toBe("business-essentials");
    expect(result.gzStatus).toBe("Active");
    expect(result.gzExpirationSerial).toBe(46291);

    const m = result.membership;
    expect(m.status).toBe("active");
    expect(m.billingCycle).toBe("annual");
    // 45927 -> 2025-09-27 ; 46291 -> 2026-09-26 (Excel-serial conversion)
    expect(m.startDate).toBe("2025-09-27");
    expect(m.renewalDate).toBe("2026-09-26");
    // gzId convenience pre-fill = the org ContactId string.
    expect(m.gzId).toBe("22966185");
    // dues are NOT stored on memberships — no amount field present.
    expect(m).not.toHaveProperty("amountCents");
    expect(m).not.toHaveProperty("scheduledBillingAmount");
  });

  it("maps a Dropped row's status to cancelled", () => {
    const dropped: Row = { ...SAMPLE_ROW, "Membership Status": "Dropped" };
    expect(mapMembership(dropped).membership.status).toBe("cancelled");
  });

  it("emits empty-string dates when GrowthZone left them blank (loud, not null)", () => {
    const blankDates: Row = {
      ...SAMPLE_ROW,
      "Membership Start Date": "",
      "Membership Expiration Date": "",
    };
    const m = mapMembership(blankDates).membership;
    expect(m.startDate).toBe("");
    expect(m.renewalDate).toBe("");
  });
});

describe("deriveTiers", () => {
  // A small fixture exercising the modal-price rule and blank handling.
  const rows: Row[] = [
    { ...SAMPLE_ROW }, // Business Essentials, 86.25
    { ...SAMPLE_ROW, "Scheduled Billing Amount": 345 },
    { ...SAMPLE_ROW, "Scheduled Billing Amount": 345 },
    { ...SAMPLE_ROW, "Scheduled Billing Amount": "" }, // blank ignored
    { ...SAMPLE_ROW, Membership: "Visibility Plus", "Scheduled Billing Amount": 575 },
    { ...SAMPLE_ROW, Membership: "Executive", "Scheduled Billing Amount": "" },
    { ...SAMPLE_ROW, Membership: "Executive", "Scheduled Billing Amount": "" },
    { ...SAMPLE_ROW, Membership: "", "Scheduled Billing Amount": 999 }, // no tier
  ];

  it("produces one tier per distinct (non-blank) Membership name", () => {
    const tiers = deriveTiers(rows);
    const names = tiers.map((t) => t.name).sort();
    expect(names).toEqual(["Business Essentials", "Executive", "Visibility Plus"]);
  });

  it("prices each tier at its modal non-blank billing amount (cents), else 0", () => {
    const tiers = deriveTiers(rows);
    const byName = Object.fromEntries(tiers.map((t) => [t.name, t]));

    // Business Essentials: 345 appears twice (modal) -> 34500 cents.
    expect(byName["Business Essentials"].annualPriceCents).toBe(34500);
    // Visibility Plus: only 575 -> 57500 cents.
    expect(byName["Visibility Plus"].annualPriceCents).toBe(57500);
    // Executive: all blank -> 0.
    expect(byName["Executive"].annualPriceCents).toBe(0);
  });

  it("emits kebab slugs, isActive true, and stable sortOrder", () => {
    const tiers = deriveTiers(rows);
    const be = tiers.find((t) => t.name === "Business Essentials")!;
    expect(be.slug).toBe("business-essentials");
    expect(be.isActive).toBe(true);
    expect(typeof be.sortOrder).toBe("number");
  });
});
