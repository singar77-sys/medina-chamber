import { describe, expect, it } from "vitest";
import { buildTypeBars, buildMemberRoiCards, MEMBER_ROI_TYPES } from "./engagement-stats";

describe("buildTypeBars", () => {
  it("labels and sorts by count descending", () => {
    const bars = buildTypeBars([
      { eventType: "event_attended", n: 2 },
      { eventType: "hot_deal_view", n: 5 },
    ]);
    expect(bars.map((b) => b.type)).toEqual(["hot_deal_view", "event_attended"]);
    expect(bars[0]).toMatchObject({ label: "Deal click-throughs", count: 5 });
  });

  it("falls back to the raw type for an unlabeled event type", () => {
    const bars = buildTypeBars([{ eventType: "weird_type", n: 1 }]);
    expect(bars[0].label).toBe("weird_type");
  });
});

describe("buildMemberRoiCards", () => {
  it("returns the fixed ROI set in order, filling 0 for missing types", () => {
    const cards = buildMemberRoiCards([{ eventType: "hot_deal_view", n: 3 }]);
    expect(cards.map((c) => c.type)).toEqual([...MEMBER_ROI_TYPES]);
    expect(cards.find((c) => c.type === "hot_deal_view")!.count).toBe(3);
    expect(cards.find((c) => c.type === "event_attended")!.count).toBe(0);
  });

  it("ignores event types outside the ROI set (e.g. portal_login)", () => {
    const cards = buildMemberRoiCards([{ eventType: "portal_login", n: 9 }]);
    expect(cards.every((c) => c.type !== "portal_login")).toBe(true);
  });
});
