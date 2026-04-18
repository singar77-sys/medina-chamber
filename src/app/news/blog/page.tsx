import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { blogPosts, formatBlogDate } from "@/data/blog";

export const metadata: Metadata = {
  title: "Business Blog",
  description:
    "Business tips, strategy, and resources from the Greater Medina Chamber of Commerce. Practical advice for small business owners in Medina County, Ohio.",
  openGraph: {
    title: "Business Blog — Greater Medina Chamber of Commerce",
    description:
      "Practical business tips and strategy for Medina County business owners.",
  },
  alternates: { canonical: "/news/blog" },
};

export default function BlogListingPage() {
  const [featured, ...rest] = blogPosts;

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Business Blog</p>
        <h1 className="text-display">
          Practical Advice
          <br />
          <span className="text-accent">for Business Owners</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Tips, strategy, and resources to help Medina County businesses grow —
          published weekly by the Greater Medina Chamber of Commerce.
        </p>
      </section>

      {/* Featured post */}
      {featured && (
        <section className="mt-16">
          <Link
            href={`/news/blog/${featured.slug}`}
            className="
              group grid lg:grid-cols-2 gap-0
              bg-bg-secondary border border-border-secondary
              rounded-[var(--radius-lg)] overflow-hidden
              hover:border-border-primary transition-colors
            "
          >
            {featured.image && (
              <div className="relative h-60 lg:h-auto bg-oxford/10">
                <Image
                  src={featured.image}
                  alt={`${featured.title} — featured Greater Medina Chamber of Commerce blog post`}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}
            <div className="p-8 lg:p-10 flex flex-col justify-center">
              <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-3">
                {formatBlogDate(featured)} · {featured.author}
              </p>
              <h2 className="text-h2 group-hover:text-cambridge transition-colors leading-snug">
                {featured.title}
              </h2>
              {featured.excerpt && (
                <p className="text-body text-text-secondary mt-4 line-clamp-3">
                  {featured.excerpt}
                </p>
              )}
              <p className="text-body-sm text-cambridge font-bold mt-6">
                Read more →
              </p>
            </div>
          </Link>
        </section>
      )}

      {/* Post grid */}
      {rest.length > 0 && (
        <section className="mt-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((post) => (
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
                  <div className="relative h-44 bg-oxford/10 shrink-0">
                    <Image
                      src={post.image}
                      alt={`${post.title} — Greater Medina Chamber of Commerce blog post`}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-col flex-1 p-5">
                  <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-2">
                    {formatBlogDate(post)}
                  </p>
                  <h2 className="text-h4 group-hover:text-cambridge transition-colors leading-snug flex-1">
                    {post.title}
                  </h2>
                  <p className="text-body-sm text-cambridge font-bold mt-4">
                    Read more →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
