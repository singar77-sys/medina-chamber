import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * seed-event-photos.mjs writes Redis metadata for the static event galleries.
 * It cannot be imported (top-level env validation, then it runs), and it needs
 * a live Blob token and a live Upstash instance to do anything, so this gates
 * the one thing that silently broke: the KEY SHAPE it writes.
 *
 * media-store.ts moved photo metadata off a single JSON array per key onto
 * `<base>:items` (hash of bodies) + `<base>:order` (sorted set), and it DELETES
 * the legacy array the first time an admin write migrates an event. A seeder
 * still writing the old shape then fails twice over, both silently:
 *
 *   • its "already seeded" guard reads the legacy key, which is gone, so it
 *     re-uploads every blob on every run;
 *   • its metadata lands on a key readList never consults once the sorted set
 *     is non-empty, so seeding appears to succeed and changes nothing.
 *
 * Neither shows up as an error. Hence a test on the source.
 */
const SOURCE = readFileSync(
  join(process.cwd(), "scripts", "seed-event-photos.mjs"),
  "utf8",
);

describe("seed-event-photos writes the indexed shape media-store reads", () => {
  it("writes bodies to the :items hash and ordering to the :order sorted set", () => {
    expect(SOURCE).toMatch(/itemsKey\s*=\s*\(base\)\s*=>\s*`\$\{base\}:items`/);
    expect(SOURCE).toMatch(/orderKey\s*=\s*\(base\)\s*=>\s*`\$\{base\}:order`/);
    expect(SOURCE).toMatch(/redis\.hset\(itemsKey\(/);
    expect(SOURCE).toMatch(/redis\.zadd\(orderKey\(/);
  });

  it("never SETs a bare list key as a JSON array again", () => {
    // `redis.set("cms:media:recent", …)` / `redis.set(redisKey, items, …)` were
    // the legacy writes. Any redis.set on a media key is the regression.
    const sets = [...SOURCE.matchAll(/redis\.set\(([^,)]+)/g)].map((m) => m[1].trim());
    expect(sets).toEqual([]);
  });

  it("checks BOTH shapes before deciding an event is already seeded", () => {
    expect(SOURCE).toMatch(/redis\.zcard\(orderKey\(/);
    expect(SOURCE).toContain("existingCount");
  });

  it("carries an unmigrated legacy array across instead of hiding it", () => {
    // readList prefers the sorted set whenever it is non-empty, so seeding into
    // the new keys while an old array still exists would make that array
    // unreachable.
    expect(SOURCE).toContain("migrateLegacy");
    expect(SOURCE).toMatch(/redis\.del\(base\)/);
  });

  it("sets no TTL — a seeded gallery must not expire a year later", () => {
    expect(SOURCE).not.toMatch(/\{\s*ex:\s*/);
    expect(SOURCE).not.toContain("const TTL");
  });

  it("trims the shared recent feed to the same cap media-store enforces", () => {
    expect(SOURCE).toContain("RECENT_CAP = 50");
    expect(SOURCE).toMatch(/trimList\(RECENT_BASE, RECENT_CAP\)/);
  });
});
