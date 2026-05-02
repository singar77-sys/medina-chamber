/**
 * Formats recent member news for injection into ChamberBot's system prompt.
 * Reads from the statically-built member-news.json and returns the most recent articles.
 */

import newsData from "@/data/member-news.json";

interface RawArticle {
  slug: string;
  articleId: string;
  title: string;
  subtitle: string;
  body: string;
  memberName: string;
  dateISO: string;
  dateRaw: string;
}

const allArticles = (newsData as { articles: RawArticle[] }).articles;

/** Returns a formatted string of recent member news for the system prompt. */
export function formatNewsForPrompt(count = 6): string {
  const recent = [...allArticles]
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
    .slice(0, count);
  if (recent.length === 0) return "";

  const lines = recent.map((a) => {
    const teaser = a.subtitle || a.body.substring(0, 100);
    const member = a.memberName ? ` (${a.memberName})` : "";
    const url = `https://medinachamber.com/news/member-news/${a.slug}`;
    return `- ${a.dateISO}: [${a.title}](${url})${member}${teaser ? `, ${teaser}` : ""}`;
  });

  return `RECENT MEMBER NEWS (${recent.length} latest posts from member businesses):\n${lines.join("\n")}`;
}
