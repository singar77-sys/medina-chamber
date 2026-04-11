import newsData from "./member-news.json";

export interface MemberNewsArticle {
  slug: string;
  articleId: string;
  title: string;
  subtitle: string;
  body: string;
  image: string;
  tags: string[];
  memberName: string;
  memberSlug: string;
  dateRaw: string;
  dateISO: string;
  thumbnail: string;
  detailUrl: string;
  scrapedAt: string;
}

const raw = newsData as {
  generatedAt: string;
  totalArticles: number;
  articles: MemberNewsArticle[];
};

export const memberNewsArticles: MemberNewsArticle[] = raw.articles;
export const totalNewsCount = raw.totalArticles;
export const newsGeneratedAt = raw.generatedAt;

export function getArticleBySlug(slug: string): MemberNewsArticle | undefined {
  return memberNewsArticles.find((a) => a.slug === slug);
}

export function getRecentArticles(count = 10): MemberNewsArticle[] {
  return memberNewsArticles.slice(0, count);
}

/** Format date for display: "April 6, 2026" */
export function formatArticleDate(article: MemberNewsArticle): string {
  if (!article.dateISO) return article.dateRaw;
  const [y, m, d] = article.dateISO.split("-").map(Number);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}

/** Meta description for an article page */
export function articleMetaDescription(article: MemberNewsArticle): string {
  const teaser = article.subtitle || article.body.substring(0, 140);
  const member = article.memberName ? ` — ${article.memberName}` : "";
  return `${teaser}${member}`.substring(0, 160);
}
