import type { Metadata } from "next";
import Link from "next/link";
import { getRecentArticles, formatArticleDate } from "@/data/member-news";

export const metadata: Metadata = {
  title: "News",
  description:
    "The latest news from the Greater Medina Chamber of Commerce — member announcements, business milestones, chamber updates, and the Medina Means Business magazine.",
  openGraph: {
    title: "News — Greater Medina Chamber of Commerce",
    description:
      "Member announcements, chamber updates, and the Medina Means Business magazine.",
  },
  alternates: { canonical: "/news" },
};

export default function NewsPage() {
  const recentArticles = getRecentArticles(6);

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">News</p>
        <h1 className="text-display">
          What&apos;s Happening
          <br />
          <span className="text-accent">in Medina</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Member announcements, business milestones, chamber updates, and
          stories from across Medina County&apos;s business community.
        </p>
      </section>

      {/* Section cards */}
      <section className="mt-16 grid md:grid-cols-2 gap-6">
        <Link
          href="/news/member-news"
          className="
            group p-8
            bg-oxford text-white
            rounded-[var(--radius-lg)]
            hover:bg-oxford/90 transition-colors
          "
        >
          <p className="text-overline text-cambridge mb-3">Member Announcements</p>
          <h2 className="text-h2 text-white">Member News</h2>
          <p className="text-white/70 text-body mt-3">
            Jobs, promotions, events, and milestones posted directly by member businesses.
          </p>
          <p className="text-cambridge font-bold text-body-sm mt-6">
            Browse all articles →
          </p>
        </Link>

        <Link
          href="/news/magazine"
          className="
            group p-8
            bg-bg-secondary border border-border-secondary
            rounded-[var(--radius-lg)]
            hover:border-border-primary transition-colors
          "
        >
          <p className="text-overline text-cambridge mb-3">Publication</p>
          <h2 className="text-h2">Medina Means Business</h2>
          <p className="text-text-secondary text-body mt-3">
            The official chamber magazine featuring local business profiles,
            community stories, and chamber updates.
          </p>
          <p className="text-cambridge font-bold text-body-sm mt-6">
            Read the magazine →
          </p>
        </Link>
      </section>

      {/* Recent member news */}
      {recentArticles.length > 0 && (
        <section className="mt-24">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-overline text-cambridge">Recent Member News</h2>
            <Link
              href="/news/member-news"
              className="text-body-sm text-cambridge font-bold hover:underline"
            >
              View all →
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentArticles.map((article) => (
              <Link
                key={`${article.slug}-${article.articleId}`}
                href={`/news/member-news/${article.slug}`}
                className="
                  group flex flex-col
                  bg-bg-secondary border border-border-secondary
                  rounded-[var(--radius-lg)]
                  p-5
                  hover:border-border-primary transition-colors
                "
              >
                <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-2">
                  {formatArticleDate(article)}
                  {article.memberName && (
                    <span className="text-text-tertiary font-normal normal-case tracking-normal ml-2">
                      · {article.memberName}
                    </span>
                  )}
                </p>
                <h3 className="text-h4 group-hover:text-cambridge transition-colors leading-snug flex-1">
                  {article.title}
                </h3>
                {article.subtitle && (
                  <p className="text-body-sm text-text-secondary mt-2 line-clamp-2">
                    {article.subtitle}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
