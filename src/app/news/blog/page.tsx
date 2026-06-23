import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { blogPosts, formatBlogDate } from "@/data/blog";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Business Blog",
  description:
    "Business tips, strategy, and resources from the Greater Medina Chamber of Commerce. Practical advice for small business owners in Medina County, Ohio.",
  openGraph: {
    title: "Business Blog | Greater Medina Chamber of Commerce",
    description:
      "Practical business tips and strategy for Medina County business owners.",
  },
  alternates: { canonical: "/news/blog" },
};

export default function BlogListingPage() {
  const [featured, ...rest] = blogPosts;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Greater Medina Chamber of Commerce Business Blog",
    description:
      "Business tips, strategy, and resources for Medina County business owners.",
    url: "https://medinachamber.com/news/blog",
    publisher: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      url: "https://medinachamber.com",
    },
    blogPost: blogPosts.slice(0, 10).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `https://medinachamber.com/news/blog/${p.slug}`,
      ...(p.dateISO ? { datePublished: p.dateISO } : {}),
      ...(p.author ? { author: { "@type": "Person", name: p.author } } : {}),
      ...(p.image ? { image: `https://medinachamber.com${p.image}` } : {}),
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
        {/* Ghosted Medina Square aerial backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-square-aerial-summer.jpg"
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
            <p className="text-overline text-cambridge mb-f8">Business Blog</p>
            <h1 className="text-display">
              <span className="block">Practical Advice</span>
              <span className="block text-accent">for Business Owners</span>
            </h1>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              Tips, strategy, and resources to help Medina County businesses
              grow. Published by the Greater Medina Chamber of Commerce.
            </p>
          </div>
        </div>
      </section>

      {/* Featured + grid */}
      {(featured || rest.length > 0) && (
        <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            {featured && (
              <FadeIn>
                <Link
                  href={`/news/blog/${featured.slug}`}
                  className="
                    group grid lg:grid-cols-2 gap-0
                    bg-bg-primary border border-border-secondary
                    rounded-[var(--radius-lg)] overflow-hidden
                    hover:border-cambridge/40 transition-colors
                  "
                >
                  {featured.image && (
                    <div className="relative h-60 lg:h-auto bg-oxford/10">
                      <Image
                        src={featured.image}
                        alt={`${featured.title}, featured Greater Medina Chamber of Commerce blog post`}
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>
                  )}
                  <div className="p-f34 lg:p-f55 flex flex-col justify-center">
                    <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-f8">
                      {formatBlogDate(featured)} · {featured.author}
                    </p>
                    <h2 className="text-h2 group-hover:text-cambridge transition-colors leading-snug">
                      {featured.title}
                    </h2>
                    {featured.excerpt && (
                      <p className="text-body text-text-secondary mt-f13 line-clamp-3">
                        {featured.excerpt}
                      </p>
                    )}
                    <p className="text-body-sm text-cambridge font-bold mt-f21">
                      Read more →
                    </p>
                  </div>
                </Link>
              </FadeIn>
            )}

            {rest.length > 0 && (
              <FadeIn>
                <div className="mt-f34 grid md:grid-cols-2 lg:grid-cols-3 gap-f21">
                  {rest.map((post, i) => (
                    <FadeIn key={post.slug} delay={i * 40}>
                      <Link
                        href={`/news/blog/${post.slug}`}
                        className="
                          group flex flex-col h-full
                          bg-bg-primary border border-border-secondary
                          rounded-[var(--radius-lg)] overflow-hidden
                          hover:border-cambridge/40 transition-colors
                        "
                      >
                        {post.image && (
                          <div className="relative h-44 bg-oxford/10 shrink-0">
                            <Image
                              src={post.image}
                              alt={`${post.title}, Greater Medina Chamber of Commerce blog post`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex flex-col flex-1 p-f21">
                          <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-f8">
                            {formatBlogDate(post)}
                          </p>
                          <h2 className="text-h4 group-hover:text-cambridge transition-colors leading-snug flex-1">
                            {post.title}
                          </h2>
                          <p className="text-body-sm text-cambridge font-bold mt-f13">
                            Read more →
                          </p>
                        </div>
                      </Link>
                    </FadeIn>
                  ))}
                </div>
              </FadeIn>
            )}

            {!featured && rest.length === 0 && (
              <p className="text-body text-text-tertiary">
                Posts coming soon. Check back next week.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Back link */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55">
        <Link
          href="/news"
          className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
        >
          ← Back to News
        </Link>
      </section>
    </>
  );
}
