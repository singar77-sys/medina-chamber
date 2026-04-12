import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { memberNewsArticles, formatArticleDate } from "@/data/member-news";

export const metadata: Metadata = {
  title: "Member News",
  description:
    "News and announcements from Greater Medina Chamber of Commerce member businesses. Job postings, events, promotions, and milestones from the Medina County business community.",
  openGraph: {
    title: "Member News — Greater Medina Chamber of Commerce",
    description:
      "News and announcements from Medina County businesses.",
  },
  alternates: { canonical: "/news/member-news" },
};

export default function MemberNewsPage() {
  const articles = memberNewsArticles;

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Member News</p>
        <h1 className="text-display">
          What&apos;s Happening
          <br />
          <span className="text-accent">in Medina Business</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Member businesses share their news directly through the Chamber —
          events, promotions, milestones, job openings, and more. This is the
          pulse of Medina County&apos;s business community.
        </p>
      </section>

      {/* Article grid */}
      {articles.length > 0 && (
        <section className="mt-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link
                key={`${article.slug}-${article.articleId}`}
                href={`/news/member-news/${article.slug}`}
                className="
                  group flex flex-col
                  bg-bg-secondary border border-border-secondary
                  rounded-[var(--radius-lg)]
                  overflow-hidden
                  hover:border-border-primary transition-colors
                "
              >
                {/* Thumbnail */}
                {article.thumbnail ? (
                  <div className="relative h-44 bg-bg-secondary shrink-0">
                    <Image
                      src={article.thumbnail}
                      alt={article.title}
                      fill
                      className="object-contain p-4"
                    />
                  </div>
                ) : (
                  <div className="h-44 bg-oxford/10 flex items-center justify-center shrink-0">
                    <svg className="w-10 h-10 text-text-tertiary" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                  </div>
                )}

                {/* Content */}
                <div className="flex flex-col flex-1 p-5">
                  <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-2">
                    {formatArticleDate(article)}
                    {article.memberName && (
                      <span className="text-text-tertiary font-normal normal-case tracking-normal ml-2">
                        · {article.memberName}
                      </span>
                    )}
                  </p>
                  <h2 className="text-h4 group-hover:text-cambridge transition-colors leading-snug mb-2">
                    {article.title}
                  </h2>
                  {article.subtitle && (
                    <p className="text-body-sm text-text-secondary line-clamp-2 flex-1">
                      {article.subtitle}
                    </p>
                  )}
                  <p className="text-body-sm text-cambridge font-bold mt-4">
                    Read more →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mt-24 p-10 lg:p-16 bg-bg-secondary rounded-[var(--radius-lg)] border border-border-secondary">
        <div className="max-w-2xl">
          <h2 className="text-h2">Want to post your news?</h2>
          <p className="text-body-lg text-text-secondary mt-4">
            Chamber members can submit news directly through the member portal.
            Your announcement reaches the entire Chamber network — other
            business owners, community leaders, and potential customers.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/membership/join"
              className="
                inline-flex items-center px-6 py-3
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Join the Chamber →
            </Link>
            <Link
              href="/news"
              className="
                inline-flex items-center px-6 py-3
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Chamber News
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
