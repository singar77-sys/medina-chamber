import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  memberNewsArticles,
  getArticleBySlug,
  formatArticleDate,
  articleMetaDescription,
} from "@/data/member-news";
import { members } from "@/data/members";

// ── Static generation ──────────────────────────────────────────────────────
export function generateStaticParams() {
  return memberNewsArticles.map((a) => ({ slug: a.slug }));
}

// ── Per-page metadata ──────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: "Article Not Found" };

  const description = articleMetaDescription(article);

  return {
    title: article.title,
    description,
    openGraph: {
      title: `${article.title} | Medina Chamber Member News`,
      description,
      ...(article.image && { images: [{ url: article.image }] }),
    },
    alternates: { canonical: `/news/member-news/${slug}` },
  };
}

// ── Page component ─────────────────────────────────────────────────────────
export default async function MemberNewsArticlePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const dateDisplay = formatArticleDate(article);

  // Find the member's chamber directory slug by name match
  const memberRecord = article.memberName
    ? members.find((m) => m.name.toLowerCase() === article.memberName.toLowerCase())
    : undefined;
  const memberDirectorySlug = memberRecord?.chamberSlug;

  const bodyParagraphs = article.body
    ? article.body.split("\n\n").filter(Boolean)
    : [];

  // JSON-LD Article schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.subtitle || article.body.substring(0, 160),
    datePublished: article.dateISO,
    author: {
      "@type": "Organization",
      name: article.memberName || "Greater Medina Chamber of Commerce",
    },
    publisher: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      url: "https://medinachamber.com",
    },
    url: `https://medinachamber.com/news/member-news/${slug}`,
    ...(article.image && { image: article.image }),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://medinachamber.com" },
      { "@type": "ListItem", position: 2, name: "Member News", item: "https://medinachamber.com/news/member-news" },
      { "@type": "ListItem", position: 3, name: article.title },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-caption text-text-tertiary mb-10">
          <Link href="/news/member-news" className="hover:text-text-primary transition-colors">
            Member News
          </Link>
          <span>/</span>
          <span className="text-text-secondary truncate">{article.title}</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_320px] gap-12 lg:gap-16">
          {/* ── Main column ── */}
          <div>
            {/* Meta */}
            <p className="text-overline text-cambridge mb-4">{dateDisplay}</p>

            {/* Title */}
            <h1 className="text-display leading-tight">{article.title}</h1>

            {/* Subtitle / teaser */}
            {article.subtitle && (
              <p className="text-h4 text-text-secondary mt-4">{article.subtitle}</p>
            )}

            {/* Image */}
            {article.image && (
              <div className="mt-8 rounded-[var(--radius-lg)] overflow-hidden border border-border-secondary">
                <Image
                  src={article.image}
                  alt={article.title}
                  width={720}
                  height={400}
                  className="object-contain w-full max-h-80 bg-bg-secondary"
                />
              </div>
            )}

            {/* Body */}
            {bodyParagraphs.length > 0 && (
              <div className="mt-10 space-y-4">
                {bodyParagraphs.map((p, i) => (
                  <p key={i} className="text-body text-text-primary leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            )}

          </div>

          {/* ── Sidebar ── */}
          <aside className="space-y-6">
            {/* Member card */}
            {article.memberName && (
              <div className="sticky top-8 p-6 bg-oxford text-white rounded-[var(--radius-lg)]">
                <p className="text-caption text-cambridge mb-2 font-bold uppercase tracking-wider">
                  Posted by
                </p>
                <p className="text-body font-semibold leading-snug">
                  {article.memberName}
                </p>
                <p className="text-caption text-white/60 mt-1">{dateDisplay}</p>

                {memberDirectorySlug && (
                  <Link
                    href={`/membership/directory/${memberDirectorySlug}`}
                    className="
                      block mt-5 w-full text-center py-2.5 px-4
                      bg-cambridge/20 hover:bg-cambridge/30
                      text-cambridge font-bold text-body-sm
                      rounded-[var(--radius-md)]
                      transition-colors
                    "
                  >
                    View Member Profile →
                  </Link>
                )}
              </div>
            )}

            {/* Back link */}
            <Link
              href="/news/member-news"
              className="
                flex items-center justify-center gap-2 w-full py-3 px-6
                border border-border-secondary hover:border-border-primary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              ← All Member News
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}
