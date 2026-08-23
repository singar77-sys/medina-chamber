import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getRecentArticles, formatArticleDate } from "@/data/member-news";
import { formatBlogDate } from "@/data/blog";
import { getAllBlogPosts } from "@/lib/cms-blog";
import { FadeIn } from "@/components/FadeIn";
import { VesicaPiscisWatermark } from "@/components/effects/VesicaPiscisWatermark";

// ISR so admin-authored CMS blog posts appear without a redeploy.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Medina County Business News",
  description:
    "The latest from the Greater Medina Chamber of Commerce, business blog, member announcements, the Medina Matters Podcast, and the Medina Means Business magazine.",
  openGraph: {
    title: "News | Greater Medina Chamber of Commerce",
    description:
      "Business blog, member news, podcast, and magazine from the Medina Chamber.",
  },
  alternates: { canonical: "/news" },
};

const channels = [
  {
    label: "Blog",
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

export default async function NewsPage() {
  const recentBlogPosts = (await getAllBlogPosts()).slice(0, 3);
  const recentMemberNews = getRecentArticles(3);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted downtown Medina Public Square street-scene backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-chamber-news-hero.webp"
            alt=""
            fill
            priority
            className="object-cover opacity-[0.33]"
            sizes="100vw"
            quality={60}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-overline text-cambridge mb-f8">News</p>
            <h1 className="text-display">
              <span className="block">What&apos;s Happening</span>
              <span className="block text-accent">in Medina</span>
            </h1>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              Business resources, member announcements, podcast conversations, and
              stories from across Medina County&apos;s business community.
            </p>
          </div>
        </div>
      </section>

      {/* Channel nav cards */}
      <section className="relative overflow-hidden bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <VesicaPiscisWatermark className="tp-vesica" />
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-f21">
              {channels.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="
                    group p-f21 rounded-[var(--radius-lg)] transition-all duration-200
                    bg-bg-primary border border-border-secondary hover:border-cambridge/40
                    hover:shadow-cambridge
                  "
                >
                  <p className="text-caption font-bold uppercase tracking-wider mb-f8 text-cambridge">
                    {s.label}
                  </p>
                  <h2 className="text-h4 leading-snug text-text-primary">
                    {s.title}
                  </h2>
                  <p className="text-body-sm mt-f8 text-text-secondary">
                    {s.description}
                  </p>
                  <p className="text-cambridge font-bold text-body-sm mt-f13 group-hover:translate-x-1 transition-transform">
                    Browse →
                  </p>
                </Link>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Recent blog posts */}
      {recentBlogPosts.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
          <FadeIn>
            <div className="flex items-center justify-between mb-f21">
              <h2 className="text-overline text-cambridge">Latest from the Blog</h2>
              <Link href="/news/blog" className="text-body-sm text-cambridge font-bold hover:text-cambridge/80 transition-colors">
                View all →
              </Link>
            </div>
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
                        alt={`${post.title}, Greater Medina Chamber of Commerce blog post`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                        className="object-cover"
                      />
                    </div>
                  )}
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

      {/* Recent member news */}
      {recentMemberNews.length > 0 && (
        <section className="relative overflow-hidden bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
          {/* Ghosted winter-pond backdrop */}
          <div
            className="absolute inset-0 pointer-events-none select-none"
            aria-hidden="true"
          >
            <Image
              src="/images/photos/medina-winter-pond.webp"
              alt=""
              fill
              className="object-cover opacity-[0.10]"
              sizes="100vw"
              quality={60}
            />
          </div>
          <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
            <FadeIn>
              <div className="flex items-center justify-between mb-f21">
                <h2 className="text-overline text-cambridge">Recent Member News</h2>
                <Link href="/news/member-news" className="text-body-sm text-cambridge font-bold hover:text-cambridge/80 transition-colors">
                  View all →
                </Link>
              </div>
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
