import blogData from "./blog.json";

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  author: string;
  dateISO: string;
  dateRaw: string;
  image: string;
  sourceUrl: string;
  scrapedAt: string;
}

const raw = blogData as { generatedAt: string; totalPosts: number; posts: BlogPost[] };

export const blogPosts: BlogPost[] = raw.posts;
export const totalBlogCount = raw.totalPosts;

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getRecentBlogPosts(count = 6): BlogPost[] {
  return blogPosts.slice(0, count);
}

/** "April 6, 2026" */
export function formatBlogDate(post: BlogPost): string {
  if (!post.dateISO) return post.dateRaw;
  const [y, m, d] = post.dateISO.split("-").map(Number);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}

export function blogMetaDescription(post: BlogPost): string {
  return (post.excerpt || post.body.substring(0, 160)).substring(0, 160);
}
