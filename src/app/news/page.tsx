import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getRecentArticles, formatArticleDate } from "@/data/member-news";
import { getRecentBlogPosts, formatBlogDate } from "@/data/blog";

export const metadata: Metadata = {
  title: "News",
  description:
    "The latest from the Greater Medina Chamber of Commerce — business blog, member announcements, the Medina Matters Podcast, and the Medina Means Business magazine.",
  openGraph: {
    title: "News — Greater Medina Chamber of Commerce",
    description:
      "Business blog, member news, podcast, and magazine from the Medina Chamber.",
  },
  alternates: { canonical: "/news" },
};

const sections = [
  {
    label: "Business Blog",
    href: "/news/blog",
    title: "Business Blog",
    description: "Weekly tips and strategy for small business owners in Medina County.",
  },
  {
    label: "Podcast",
    href: "/news/podcast",
    title: "Medina Matters Podcast",
    description: "Conversations with local business owners and community leaders.",
  },
  {
    label: "Member Announcements",
    href: "/news/member-news",
    title: "Member News",
    description: "Jobs, promotions, events, and milestones from member businesses.",
  },
  {
    label: "Publication",
    href: "/news/magazine",
    title: "Medina Means Business",
    description: "The official chamber magazine with local business profiles and updates.",
  },
];

export default function NewsPage() {
  const recentBlogPosts = getRecentBlogPosts(3);
  const recentMemberNews = getRecentArticles(3);

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
          Business resources, member announcements, podcast conversations, and
          stories from across Medina County&apos;s business community.
        </p>
      </section>

      {/* Section cards */}
      <section className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="
              group p-6 rounded-[var(--radius-lg)] transition-colors
              bg-bg-secondary border border-border-secondary hover:border-cambridge/40
            "
          >
            <p className="text-caption font-bold uppercase tracking-wider mb-2 text-cambridge">
              {s.label}
            </p>
            <h2 className="text-h4 leading-snug text-text-primary">
              {s.title}
            </h2>
            <p className="text-body-sm mt-2 text-text-secondary">
              {s.description}
            </p>
            <p className="text-cambridge font-bold text-body-sm mt-4">
              Browse →
            </p>
          </Link>
        ))}
      </section>

      {/* Recent blog posts */}
      {recentBlogPosts.length > 0 && (
        <section className="mt-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-overline text-cambridge">Latest from the Blog</h2>
            <Link href="/news/blog" className="text-body-sm text-cambridge font-bold hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {recentBlogPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/news/blog/${post.slug}`}
                className="
                  group flex flex-col
                  bg-bg-secondary border border-border-secondary
                  rounded-[var(--radius-lg)] overflow-hidden
                  hover:border-border-primary transition-colors
                "
              >
                {post.image && (
                  <div className="relative h-40 bg-oxford/10 shrink-0">
                    <Image src={post.image} alt={post.title} fill className="object-cover" />
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-2">
                    {formatBlogDate(post)}
                  </p>
                  <h3 className="text-h4 group-hover:text-cambridge transition-colors leading-snug flex-1">
                    {post.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent member news */}
      {recentMemberNews.length > 0 && (
        <section className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-overline text-cambridge">Recent Member News</h2>
            <Link href="/news/member-news" className="text-body-sm text-cambridge font-bold hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {recentMemberNews.map((article) => (
              <Link
                key={`${article.slug}-${article.articleId}`}
                href={`/news/member-news/${article.slug}`}
                className="
                  group p-5
                  bg-bg-secondary border border-border-secondary
                  rounded-[var(--radius-lg)]
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
                <h3 className="text-h4 group-hover:text-cambridge transition-colors leading-snug">
                  {article.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
