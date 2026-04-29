import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getRecentArticles, formatArticleDate } from "@/data/member-news";
import { getRecentBlogPosts, formatBlogDate } from "@/data/blog";
import { FadeIn } from "@/components/FadeIn";

/**
 * News hub — φ spatial system applied throughout.
 *
 * HERO    pt-f144 pb-f89
 * BAND    py-f55 lg:py-f89  — 4 channel nav cards (bg-secondary + border-y)
 * FEATURE py-f89 lg:py-f144 — recent blog posts (open white)
 * BAND    py-f55 lg:py-f89  — recent member news (bg-secondary + border-y)
 */

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

const channels = [
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
    <>
      {/* ─── HERO ─────────────────────────────────────────────── */}
      {/* pt-f144 pb-f89 (144/89 = φ) — HERO tier */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-f144 pb-f89">
        <div className="max-w-3xl">
          {/* mb-f8 (8px) — overline→heading */}
          <p className="text-overline text-cambridge mb-f8">News</p>
          <h1 className="text-display">
            What&apos;s Happening
            <br />
            <span className="text-accent">in Medina</span>
          </h1>
          {/* mt-f13 (13px) — heading→body */}
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            Business resources, member announcements, podcast conversations, and
            stories from across Medina County&apos;s business community.
          </p>
        </div>
      </section>

      {/* ─── BAND — Channel nav cards ─────────────────────────── */}
      {/* py-f55/f89 — BAND tier, bg-secondary + border-y */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            {/* gap-f21 (21px) — card grid gap; 4 = F₅ */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-f21">
              {channels.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="
                    group p-f21 rounded-[var(--radius-lg)] transition-all duration-200
                    bg-bg-primary border border-border-secondary hover:border-cambridge/40
                    hover:shadow-[0_8px_32px_rgba(131,188,169,0.10)]
                  "
                >
                  {/* mb-f8 — label→title gap */}
                  <p className="text-caption font-bold uppercase tracking-wider mb-f8 text-cambridge">
                    {s.label}
                  </p>
                  <h2 className="text-h4 leading-snug text-text-primary">
                    {s.title}
                  </h2>
                  {/* mt-f8 — title→desc gap */}
                  <p className="text-body-sm mt-f8 text-text-secondary">
                    {s.description}
                  </p>
                  {/* mt-f13 — desc→CTA gap */}
                  <p className="text-cambridge font-bold text-body-sm mt-f13 group-hover:translate-x-1 transition-transform">
                    Browse →
                  </p>
                </Link>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── FEATURE — Recent blog posts ──────────────────────── */}
      {/* py-f89/f144 — FEATURE tier, open white */}
      {recentBlogPosts.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
          <FadeIn>
            {/* mb-f21 (21px) — header→grid gap */}
            <div className="flex items-center justify-between mb-f21">
              <h2 className="text-overline text-cambridge">Latest from the Blog</h2>
              <Link href="/news/blog" className="text-body-sm text-cambridge font-bold hover:text-cambridge/80 transition-colors">
                View all →
              </Link>
            </div>
            {/* gap-f21 — card grid gap */}
            <div className="grid md:grid-cols-3 gap-f21">
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
                      <Image
                        src={post.image}
                        alt={`${post.title} — Greater Medina Chamber of Commerce blog post`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  {/* p-f21 card interior, mb-f8 date→title gap */}
                  <div className="p-f21 flex flex-col flex-1">
                    <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-f8">
                      {formatBlogDate(post)}
                    </p>
                    <h3 className="text-h4 group-hover:text-cambridge transition-colors leading-snug flex-1">
                      {post.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </FadeIn>
        </section>
      )}

      {/* ─── BAND — Recent member news ────────────────────────── */}
      {/* py-f55/f89 — BAND tier, bg-secondary + border-y */}
      {recentMemberNews.length > 0 && (
        <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <FadeIn>
              {/* mb-f21 — header→grid gap */}
              <div className="flex items-center justify-between mb-f21">
                <h2 className="text-overline text-cambridge">Recent Member News</h2>
                <Link href="/news/member-news" className="text-body-sm text-cambridge font-bold hover:text-cambridge/80 transition-colors">
                  View all →
                </Link>
              </div>
              {/* gap-f21 — card grid gap */}
              <div className="grid md:grid-cols-3 gap-f21">
                {recentMemberNews.map((article) => (
                  <Link
                    key={`${article.slug}-${article.articleId}`}
                    href={`/news/member-news/${article.slug}`}
                    className="
                      group p-f21
                      bg-bg-primary border border-border-secondary
                      rounded-[var(--radius-lg)]
                      hover:border-cambridge/40 transition-colors
                    "
                  >
                    {/* mb-f8 — date→title gap */}
                    <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-f8">
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
            </FadeIn>
          </div>
        </section>
      )}
    </>
  );
}
