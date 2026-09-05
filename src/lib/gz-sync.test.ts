import { describe, it, expect } from "vitest";
import { shouldRetire, RETIREMENT_FLOOR } from "./gz-sync";

/**
 * gz-sync retires (soft-deletes) members that dropped out of the nightly
 * scrape. That is the only destructive thing the nightly cron does, so the
 * guard in front of it has to fail CLOSED: if the scrape looks collapsed, we
 * would rather keep a few ex-members listed for another day than empty the
 * public directory unattended.
 */
describe("shouldRetire — the guard in front of the only destructive sync step", () => {
  it("never retires on an empty scrape (the directory-wipe case)", () => {
    expect(shouldRetire(0, 503)).toBe(false);
    expect(shouldRetire(0, 0)).toBe(false);
  });

  it("blocks a collapsed scrape (GrowthZone outage / markup change)", () => {
    expect(shouldRetire(12, 503)).toBe(false);
    expect(shouldRetire(250, 503)).toBe(false);
    // Just under the floor.
    expect(shouldRetire(Math.floor(503 * RETIREMENT_FLOOR) - 1, 503)).toBe(false);
  });

  it("allows a normal run where a handful of members departed", () => {
    expect(shouldRetire(500, 503)).toBe(true);
    expect(shouldRetire(476, 503)).toBe(true); // ~5% churn
    expect(shouldRetire(503, 503)).toBe(true);
  });

  it("allows growth", () => {
    expect(shouldRetire(540, 503)).toBe(true);
  });

  it("allows the first run against an empty database", () => {
    expect(shouldRetire(503, 0)).toBe(true);
  });

  it("sits exactly at the documented floor", () => {
    expect(shouldRetire(Math.ceil(503 * RETIREMENT_FLOOR), 503)).toBe(true);
  });
});
