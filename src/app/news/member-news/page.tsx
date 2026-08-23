import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { VesicaPiscisWatermark } from "@/components/effects/VesicaPiscisWatermark";
import { memberNewsArticles, formatArticleDate } from "@/data/member-news";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Member News",
  description:
    "News and announcements from Greater Medina Chamber of Commerce member businesses. Job postings, events, promotions, and milestones from the Medina County business community.",
  openGraph: {
    title: "Member News | Greater Medina Chamber of Commerce",
    description: "News and announcements from Medina County businesses.",
  },
  alternates: { canonical: "/news/member-news" },
};

export default function MemberNewsPage() {
  const articles = memberNewsArticles;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Greater Medina Chamber of Commerce Member News",
    description:
      "News and announcements from Greater Medina Chamber of Commerce member businesses.",
    url: "https://medinachamber.com/news/member-news",
    numberOfItems: articles.length,
    itemListElement: articles.slice(0, 20).map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "NewsArticle",
        headline: a.title,
        url: `https://medinachamber.com/news/member-news/${a.slug}`,
        ...(a.thumbnail
          ? {
              image: a.thumbnail.startsWith("http")
                ? a.thumbnail
                : `https://medinachamber.com${a.thumbnail}`,
            }
          : {}),
        ...(a.memberName
          ? {
              author: { "@type": "Organization", name: a.memberName },
            }
          : {}),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted Networking WOW backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-chamber-member-news-hero.webp"
            alt=""
            fill
            priority
            className="object-cover object-top opacity-[0.33]"
            sizes="100vw"
            quality={60}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
          <p className="text-overline text-cambridge mb-f8">Member News</p>
          <h1 className="text-display">
            <span className="block">What&apos;s Happening</span>
            <span className="block text-accent">in Medina Business</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            Member businesses share their news directly through the chamber.
            Events, promotions, milestones, job openings. The pulse of Medina
            County&apos;s business community.
          </p>
          </div>
        </div>
      </section>

      {/* Article grid */}
      <section className="relative overflow-hidden bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <VesicaPiscisWatermark className="tp-vesica" />
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mb-f21 flex items-end justify-between gap-f21 flex-wrap">
              <div>
                <p className="text-overline text-cambridge mb-f8">Latest</p>
                <h2 className="text-h2">
                  {articles.length} {articles.length === 1 ? "Story" : "Stories"}
                </h2>
              </div>
              <p className="text-body-sm text-text-tertiary">
                Direct from chamber members.
              </p>
            </div>

            {articles.length === 0 ? (
              <p className="text-body text-text-tertiary">
                No member news yet. Check back soon.
              </p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-f21">
                {articles.map((article, i) => (
                  <FadeIn
                    key={`${article.slug}-${article.articleId}`}
                    delay={i * 30}
                  >
                    <Link
                      href={`/news/member-news/${article.slug}`}
                      className="
                        group flex flex-col h-full
                        bg-bg-primary border border-border-secondary
                        rounded-[var(--radius-lg)]
                        overflow-hidden
                        hover:border-cambridge/40 transition-colors
                      "
                    >
                      {article.thumbnail ? (
                        <div className="relative h-44 bg-bg-secondary shrink-0">
                          <Image
                            src={article.thumbnail}
                            alt={`${article.title}, Greater Medina Chamber of Commerce member news`}
                            fill
                            className="object-contain p-4"
                          />
                        </div>
                      ) : (
                        <div className="h-44 bg-oxford/10 flex items-center justify-center shrink-0">
                          <svg
                            aria-hidden="true"
                            focusable="false"
                            className="w-10 h-10 text-text-tertiary"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                          </svg>
                        </div>
                      )}

                      <div className="flex flex-col flex-1 p-f21">
                        <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-f8">
                          {formatArticleDate(article)}
                          {article.memberName && (
                            <span className="text-text-tertiary font-normal normal-case tracking-normal ml-2">
                              · {article.memberName}
                            </span>
                          )}
                        </p>
                        <h3 className="text-h4 group-hover:text-cambridge transition-colors leading-snug mb-f8">
                          {article.title}
                        </h3>
                        {article.subtitle && (
                          <p className="text-body-sm text-text-secondary line-clamp-2 flex-1">
                            {article.subtitle}
                          </p>
                        )}
                        <p className="text-body-sm text-cambridge font-bold mt-f13">
                          Read more →
                        </p>
                      </div>
                    </Link>
                  </FadeIn>
                ))}
              </div>
            )}
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <p className="text-overline text-cambridge mb-f8">Members</p>
                <h2 className="text-h2">Want to post your news?</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Chamber members can submit news directly through the member
                  portal. Your announcement reaches the entire chamber
                  network: other business owners, community leaders, and
                  potential customers.
                </p>
              </div>
              <div className="space-y-f13">
                <Link
                  href="/membership/join"
                  className="
                    block w-full text-center py-f13 px-f21
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
                    block w-full text-center py-f13 px-f21
                    bg-emerald hover:bg-emerald/90
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Chamber News
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-f34">
            <Link
              href="/news"
              className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              ← Back to News
            </Link>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
