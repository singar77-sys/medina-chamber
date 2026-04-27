import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts, getBlogPostBySlug, formatBlogDate, blogMetaDescription } from "@/data/blog";
import { getCmsBlogPost } from "@/lib/cms-store";

import { safeJsonLd } from "@/lib/json-ld";

// Allow dynamic slugs for CMS posts added after build
export const dynamicParams = true;

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

// Normalized shape used by the page — compatible with both BlogPost and CmsBlogPost
interface ResolvedPost {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  author: string;
  dateISO: string;
  dateRaw: string;
  image: string;
  sourceUrl: string;
  scrapedAt: string;
}

async function resolvePost(slug: string): Promise<ResolvedPost | null> {
  const cms = await getCmsBlogPost(slug);
  if (cms) {
    return {
      ...cms,
      dateRaw: cms.dateISO,
      sourceUrl: "",
      scrapedAt: cms.createdAt,
    };
  }
  const static_ = getBlogPostBySlug(slug);
  return static_ ?? null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = await resolvePost(slug);
  if (!post) return { title: "Post Not Found" };

  const description = blogMetaDescription(post);

  return {
    title: post.title,
    description,
    openGraph: {
      title: `${post.title} | Medina Chamber Blog`,
      description,
      ...(post.image && { images: [{ url: post.image }] }),
    },
    alternates: { canonical: `/news/blog/${slug}` },
  };
}

export default async function BlogPostPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = await resolvePost(slug);
  if (!post) notFound();

  const dateDisplay = formatBlogDate(post);
  const bodyParagraphs = post.body
    ? post.body.split("\n\n").filter(Boolean)
    : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: blogMetaDescription(post),
    datePublished: post.dateISO,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      url: "https://medinachamber.com",
    },
    url: `https://medinachamber.com/news/blog/${slug}`,
    ...(post.image && {
      image: {
        "@type": "ImageObject",
        url: post.image.startsWith("http")
          ? post.image
          : `https://medinachamber.com${post.image}`,
        caption: `${post.title} — Greater Medina Chamber of Commerce blog post`,
      },
    }),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://medinachamber.com" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://medinachamber.com/news/blog" },
      { "@type": "ListItem", position: 3, name: post.title },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-caption text-text-tertiary mb-10">
          <Link href="/news/blog" className="hover:text-text-primary transition-colors">
            Blog
          </Link>
          <span>/</span>
          <span className="text-text-secondary truncate">{post.title}</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_280px] gap-12 lg:gap-16">
          {/* ── Main ── */}
          <article>
            <p className="text-overline text-cambridge mb-4">{dateDisplay}</p>
            <h1 className="text-display leading-tight">{post.title}</h1>
            <p className="text-body-sm text-text-tertiary mt-3">By {post.author}</p>

            {post.image && (
              <div className="mt-8 rounded-[var(--radius-lg)] overflow-hidden border border-border-secondary">
                <Image
                  src={post.image}
                  alt={`${post.title} — Greater Medina Chamber of Commerce blog post`}
                  width={800}
                  height={450}
                  className="object-cover w-full max-h-96"
                  priority
                />
              </div>
            )}

            {bodyParagraphs.length > 0 && (
              <div className="mt-10 space-y-4 max-w-2xl">
                {bodyParagraphs.map((p, i) => (
                  <p key={i} className="text-body text-text-primary leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            )}
          </article>

          {/* ── Sidebar ── */}
          <aside className="space-y-6">
            <div className="sticky top-8 space-y-4">
              {/* Join CTA */}
              <div className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
                <p className="text-body font-semibold text-text-primary leading-snug">
                  Want resources like this for your business?
                </p>
                <p className="text-text-secondary text-body-sm mt-2">
                  Chamber members get access to networking, tools, and support
                  built for Medina County businesses.
                </p>
                <Link
                  href="/membership/join"
                  className="
                    block mt-5 w-full text-center py-2.5 px-4
                    bg-accent hover:bg-accent-hover
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Join the Chamber →
                </Link>
              </div>

              <Link
                href="/news/blog"
                className="
                  flex items-center justify-center gap-2 w-full py-3 px-6
                  border border-border-secondary hover:border-border-primary
                  text-text-primary font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                ← All Posts
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
