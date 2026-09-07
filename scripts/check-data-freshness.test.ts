import { describe, expect, it } from "vitest";
import {
  FRESHNESS_POLICY,
  STALE_AFTER_DAYS,
  ageInDays,
  assess,
  assessAll,
  formatReport,
} from "./check-data-freshness.mjs";

const NOW = new Date("2026-09-07T00:00:00.000Z");
const entry = { file: "member-ratings.json", maxAgeDays: 21, source: "pnpm scrape:ratings" };

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}

describe("ageInDays", () => {
  it("counts whole days since the stamp", () => {
    expect(ageInDays(daysAgo(30), NOW)).toBe(30);
  });

  it("returns null for a missing or unparseable stamp", () => {
    expect(ageInDays(undefined, NOW)).toBeNull();
    expect(ageInDays("not a date", NOW)).toBeNull();
  });
});

describe("assess", () => {
  it("passes a file written by the latest weekly run", () => {
    expect(assess(entry, daysAgo(1), NOW).status).toBe("fresh");
  });

  it("tolerates two consecutive missed weekly runs", () => {
    // One blip should not turn the pipeline red.
    expect(assess(entry, daysAgo(14), NOW).status).toBe("fresh");
  });

  it("fails on the third consecutive miss", () => {
    expect(assess(entry, daysAgo(22), NOW).status).toBe("stale");
  });

  it("names the file, its age, and the command that refreshes it", () => {
    const result = assess(entry, daysAgo(85), NOW);
    expect(result.message).toContain("member-ratings.json");
    expect(result.message).toContain("85 days old");
    expect(result.message).toContain("pnpm scrape:ratings");
  });

  it("catches the real regression: ratings frozen at 2026-06-14", () => {
    // The exact state this gate exists to surface — generated in June, still
    // being served in September with nothing saying so.
    const result = assess(entry, "2026-06-14T13:02:48.190Z", NOW);
    expect(result.status).toBe("stale");
    expect(result.ageDays).toBeGreaterThan(80);
  });

  it("treats an unreadable timestamp as a failure, not as fresh", () => {
    // "Can't tell" must never be reported as "current".
    expect(assess(entry, undefined, NOW).status).toBe("unreadable");
  });
});

describe("the policy itself", () => {
  it("covers every dataset the weekly refresh writes", () => {
    expect(FRESHNESS_POLICY.map((e) => e.file).sort()).toEqual([
      "blog.json",
      "member-ratings.json",
      "member-websites.json",
      "members.json",
    ]);
  });

  it("allows three missed weekly runs before failing", () => {
    expect(STALE_AFTER_DAYS).toBe(21);
    expect(FRESHNESS_POLICY.every((e) => e.maxAgeDays === STALE_AFTER_DAYS)).toBe(true);
  });
});

describe("formatReport", () => {
  it("reports every stale dataset, not just the first", () => {
    const results = assessAll(
      FRESHNESS_POLICY,
      {
        "members.json": daysAgo(1),
        "member-websites.json": daysAgo(1),
        "member-ratings.json": daysAgo(85),
        "blog.json": daysAgo(40),
      },
      NOW,
    );
    const report = formatReport(results);
    expect(report).toContain("member-ratings.json");
    expect(report).toContain("blog.json");
    expect(report).toContain("2 dataset(s) have stopped refreshing");
  });

  it("says nothing alarming when everything is current", () => {
    const results = assessAll(
      FRESHNESS_POLICY,
      Object.fromEntries(FRESHNESS_POLICY.map((e) => [e.file, daysAgo(2)])),
      NOW,
    );
    expect(formatReport(results)).not.toContain("❌");
  });
});
