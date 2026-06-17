import { describe, expect, it } from "vitest";
import { stripFooterRows } from "@/lib/migrate/load";

describe("stripFooterRows", () => {
  it("keeps the numeric data row and the blank-id data row, drops the 3 junk rows", () => {
    const rows = [
      { ContactId: "22966185", Name: "Acme Co", Amount: "295" },
      { ContactId: "Count\\Average\\Totals", Name: "", Amount: "" },
      { ContactId: "Generated 6/17/2026 by Mark Hunter", Name: "", Amount: "" },
      { ContactId: "736", Name: "", Amount: "" },
      { ContactId: "", Name: "Walk-in Guest", Amount: "12" },
    ];

    const kept = stripFooterRows(rows);

    expect(kept).toHaveLength(2);
    expect(kept.map((r) => r.ContactId)).toEqual(["22966185", ""]);
    expect(kept[0].Name).toBe("Acme Co");
    expect(kept[1].Name).toBe("Walk-in Guest");
  });

  it("drops fully-empty rows", () => {
    const rows = [
      { ContactId: "100", Name: "Real" },
      { ContactId: "", Name: "" },
      { ContactId: "   ", Name: "   " },
    ];
    const kept = stripFooterRows(rows);
    expect(kept).toHaveLength(1);
    expect(kept[0].ContactId).toBe("100");
  });

  it("drops a lone numeric ContactId with no accompanying data (stray footer cell)", () => {
    const rows = [{ ContactId: "736" }];
    expect(stripFooterRows(rows)).toHaveLength(0);
  });

  it("keeps a numeric ContactId that has other populated fields", () => {
    const rows = [{ ContactId: "736", Name: "Legit Member" }];
    expect(stripFooterRows(rows)).toHaveLength(1);
  });

  it("drops a present non-numeric ContactId even when other fields are populated", () => {
    const rows = [{ ContactId: "Totals", Name: "summary text" }];
    expect(stripFooterRows(rows)).toHaveLength(0);
  });

  it("keeps rows that have no ContactId key at all", () => {
    const rows = [{ Name: "No id column here", Amount: "5" }];
    expect(stripFooterRows(rows)).toHaveLength(1);
  });

  it("does not mutate the input array", () => {
    const rows = [
      { ContactId: "1", Name: "a" },
      { ContactId: "Totals" },
    ];
    const before = rows.length;
    stripFooterRows(rows);
    expect(rows).toHaveLength(before);
  });

  // ── GrowthZone footer signatures in non-ContactId columns ────────────────────
  // These shapes appear in the orgs export ("Contacts Report.xlsx") and the
  // events export ("Event Attendees Report.xlsx"), where the footer marker lands
  // in a different column while ContactId is blank.

  it("drops an org-style footer row: marker in 'Contact Membership Status', blank ContactId", () => {
    // Shape produced by the Contacts Report footer:
    //   ContactId="" / Contact Membership Status="Count\Average\Totals" / Contact Name="977"
    const row = {
      ContactId: "",
      "Contact Membership Status": "Count\\Average\\Totals",
      "Contact Name": "977",
    };
    expect(stripFooterRows([row])).toHaveLength(0);
  });

  it("drops an events-style footer row: marker in 'Event Name', blank ContactId", () => {
    // Shape produced by the Event Attendees Report footer:
    //   ContactId="" / Event Name="Generated 6/17/2026 5:52:05 PM by Mark Hunter" / Attendee Name="8112"
    const row = {
      ContactId: "",
      "Event Name": "Generated 6/17/2026 5:52:05 PM by Mark Hunter",
      "Attendee Name": "8112",
    };
    expect(stripFooterRows([row])).toHaveLength(0);
  });

  it("keeps a legitimate blank-ContactId data row (no footer signature)", () => {
    // Real walk-in guest: ContactId blank, other fields populated, no marker.
    const row = {
      ContactId: "",
      "Contact Name": "Walk-in Guest",
      "Default Email": "guest@example.com",
    };
    const kept = stripFooterRows([row]);
    expect(kept).toHaveLength(1);
    expect(kept[0]["Contact Name"]).toBe("Walk-in Guest");
  });

  it("keeps a numeric-ContactId data row alongside the new footer-signature checks", () => {
    const row = { ContactId: "22966185", "Contact Name": "Acme Co" };
    expect(stripFooterRows([row])).toHaveLength(1);
  });
});
