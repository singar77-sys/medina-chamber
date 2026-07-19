import { describe, expect, it } from "vitest";
import { cmsToBlogPost, mergeBlogPosts } from "./cms-blog";
import type { CmsBlogPost } from "./cms-store";
import type { BlogPost } from "@/data/blog";

function cms(slug: string, dateISO: string): CmsBlogPost {
  return {
    slug,
    title: `CMS ${slug}`,
    excerpt: "excerpt",
    body: "body",
    author: "Admin",
    dateISO,
    image: "",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };
}

function staticPost(slug: string, dateISO: string): BlogPost {
  return {
    slug,
    title: `Static ${slug}`,
    excerpt: "excerpt",
    body: "body",
    author: "Chamber",
    dateISO,
    dateRaw: dateISO,
    image: "",
    sourceUrl: "https://example.com",
    scrapedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("cmsToBlogPost", () => {
  it("fills the scrape-provenance fields the static shape requires", () => {
    const adapted = cmsToBlogPost(cms("hello", "2026-07-10"));
    // dateRaw must mirror dateISO so formatBlogDate never renders blank
    expect(adapted.dateRaw).toBe("2026-07-10");
    expect(adapted.sourceUrl).toBe("");
    expect(adapted.scrapedAt).toBe("2026-07-01T00:00:00.000Z");
  });
});

describe("mergeBlogPosts", () => {
  it("gives CMS posts precedence on slug collision, matching the detail page", () => {
    const merged = mergeBlogPosts(
      [cms("shared", "2026-07-10")],
      [staticPost("shared", "2026-06-01"), staticPost("other", "2026-05-01")],
    );
    expect(merged).toHaveLength(2);
    expect(merged.find((p) => p.slug === "shared")?.title).toBe("CMS shared");
  });

  it("sorts newest-first by dateISO across both sources", () => {
    const merged = mergeBlogPosts(
      [cms("mid", "2026-06-15")],
      [staticPost("new", "2026-07-01"), staticPost("old", "2026-01-01")],
    );
    expect(merged.map((p) => p.slug)).toEqual(["new", "mid", "old"]);
  });

  it("sinks undated posts to the end without reordering them", () => {
    const merged = mergeBlogPosts(
      [],
      [staticPost("dated", "2026-07-01"), staticPost("undated-a", ""), staticPost("undated-b", "")],
    );
    expect(merged.map((p) => p.slug)).toEqual(["dated", "undated-a", "undated-b"]);
  });
});
