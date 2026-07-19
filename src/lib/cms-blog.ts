import { unstable_cache } from "next/cache";
import { blogPosts, type BlogPost } from "@/data/blog";
import { listCmsBlogPosts, type CmsBlogPost } from "@/lib/cms-store";

/**
 * Bridges admin-authored CMS blog posts into the public blog surfaces
 * (listing, /news hub, sitemap). The detail page resolves single slugs
 * itself in resolvePost() with this same CMS-wins precedence.
 */

/** Adapt a CMS post to the static BlogPost shape — the same bridge the
 *  detail page uses (dateRaw mirrors dateISO, no scrape provenance). */
export function cmsToBlogPost(cms: CmsBlogPost): BlogPost {
  return {
    slug: cms.slug,
    title: cms.title,
    excerpt: cms.excerpt,
    body: cms.body,
    author: cms.author,
    dateISO: cms.dateISO,
    dateRaw: cms.dateISO,
    image: cms.image,
    sourceUrl: "",
    scrapedAt: cms.createdAt,
  };
}

/** Merge CMS posts into the static archive: CMS wins on slug collision,
 *  result is newest-first by dateISO (undated posts sink to the end,
 *  keeping their relative order — Array.prototype.sort is stable). */
export function mergeBlogPosts(
  cms: CmsBlogPost[],
  staticPosts: BlogPost[],
): BlogPost[] {
  const cmsSlugs = new Set(cms.map((p) => p.slug));
  const merged = [
    ...cms.map(cmsToBlogPost),
    ...staticPosts.filter((p) => !cmsSlugs.has(p.slug)),
  ];
  return merged.sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || ""));
}

/** Tag for on-demand revalidation — the admin blog API busts this on
 *  save/delete so new posts appear immediately. */
export const CMS_BLOG_TAG = "cms-blog";

// unstable_cache keeps the Upstash REST call (an uncached fetch, which
// would otherwise force these pages fully dynamic) in the data cache,
// so the listing, /news hub, and sitemap stay ISR.
const getCachedCmsPosts = unstable_cache(
  () => listCmsBlogPosts(),
  ["cms-blog-posts"],
  { tags: [CMS_BLOG_TAG], revalidate: 300 },
);

/** All public blog posts (CMS + scraped archive), newest first. When
 *  Redis is unavailable or holds no CMS posts, this is exactly the
 *  static archive in its original order. */
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const cms = await getCachedCmsPosts();
  return cms.length ? mergeBlogPosts(cms, blogPosts) : blogPosts;
}
