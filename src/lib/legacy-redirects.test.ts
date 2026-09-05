import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import blogData from "@/data/blog.json";

/**
 * The /businessblog wildcard redirect (next.config.ts) maps every legacy
 * Squarespace blog URL 1:1 onto its new post page:
 *
 *   /businessblog/:slug  ->  /news/blog/:slug
 *
 * That is only safe while the legacy slug and the current slug are identical
 * for every post. blog.json carries the original URL in `sourceUrl`, so the
 * invariant is machine-checkable. If a future scrape ever renames a slug, this
 * test fails and the wildcard has to become an explicit map for the drift.
 */
describe("legacy /businessblog redirect", () => {
  const posts = (blogData as { posts: Array<{ slug: string; sourceUrl?: string }> }).posts;

  it("has posts to check", () => {
    expect(posts.length).toBeGreaterThan(100);
  });

  it("every post slug matches its legacy /businessblog slug 1:1", () => {
    const drift = posts
      .filter((p) => p.sourceUrl?.includes("/businessblog/"))
      .map((p) => ({ slug: p.slug, legacy: p.sourceUrl!.split("/businessblog/")[1] }))
      .filter((p) => p.slug !== p.legacy);

    expect(drift).toEqual([]);
  });

  it("every post carries a legacy sourceUrl (so none is silently uncovered)", () => {
    const missing = posts.filter((p) => !p.sourceUrl?.includes("/businessblog/"));
    expect(missing.map((p) => p.slug)).toEqual([]);
  });
});

/**
 * Redirect-table guards. These lock in the two mistakes that are easy to make
 * here: dropping the archive rules, and writing a /news/:slug wildcard that
 * swallows the new site's own /news/blog, /news/member-news, /news/magazine
 * and /news/podcast pages.
 */
describe("redirect table", () => {
  const config = readFileSync("next.config.ts", "utf8");

  it("covers every legacy section found in the old sitemap", () => {
    for (const source of [
      '"/businessblog"',
      '"/businessblog/:slug"',
      '"/news/tag/:rest*"',
      '"/news/category/:rest*"',
      '"/vensure-blog"',
      '"/advocacy-blog"',
      '"/home"',
      '"/golfsponsorships"',
    ]) {
      expect(config).toContain(`source: ${source}`);
    }
  });

  it("never uses a bare single-segment /news wildcard", () => {
    // /news/:slug or /news/:slug* would capture /news/blog itself.
    expect(config).not.toMatch(/source:\s*"\/news\/:(?!year|rest)[a-z]+\*?"/);
  });
});
