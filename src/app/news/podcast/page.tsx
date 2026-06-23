import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Medina Matters Podcast",
  description:
    "The Medina Matters Podcast. Conversations with local business owners, community leaders, and Chamber members about business, community, and what makes Medina County special.",
  openGraph: {
    title: "Medina Matters Podcast | Greater Medina Chamber of Commerce",
    description:
      "Conversations with local business owners and community leaders in Medina County.",
  },
  alternates: { canonical: "/news/podcast" },
};

const TELVUE_URL =
  "https://videoplayer.telvue.com/player/bjF2_CaOyvFqx0n0Wp4DVGakWmOU3Nb9/categories/2576?autostart=false&showtabssearch=true&fullscreen=false&show_title_description_summary=true";

export default function PodcastPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastSeries",
    name: "Medina Matters",
    description:
      "Conversations with local business owners, community leaders, and Chamber members about business, growth, and Medina County.",
    url: "https://medinachamber.com/news/podcast",
    publisher: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      url: "https://medinachamber.com",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted Medina barn / countryside backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/hero-medina-barn.jpg"
            alt=""
            fill
            priority
            className="object-cover opacity-[0.33]"
            sizes="100vw"
            quality={70}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-overline text-cambridge mb-f8">Podcast</p>
            <h1 className="text-display">
              <span className="block">Medina</span>
              <span className="block text-accent">Matters</span>
            </h1>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              Conversations with local business owners, community leaders, and
              Chamber members. Business, growth, and what makes Medina County
              worth investing in.
            </p>
          </div>
        </div>
      </section>

      {/* Embedded player */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="rounded-[var(--radius-lg)] overflow-hidden border border-border-secondary bg-bg-primary">
              <iframe
                src={TELVUE_URL}
                width="100%"
                height="600"
                allowFullScreen
                title="Medina Matters Podcast"
                className="block"
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="grid md:grid-cols-2 gap-f21">
            <div className="p-f34 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
              <p className="text-overline text-cambridge mb-f8">Be a Guest</p>
              <h2 className="text-h3">Want to share your story?</h2>
              <p className="text-text-secondary text-body mt-f13">
                Chamber members and Medina County business owners are welcome
                to share their story on Medina Matters. Reach out to get
                started.
              </p>
              <Link
                href="/about/contact"
                className="
                  inline-flex items-center mt-f21 px-5 py-2.5
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Get in Touch →
              </Link>
            </div>

            <div className="p-f34 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
              <p className="text-overline text-cambridge mb-f8">Explore</p>
              <h2 className="text-h3">More from the Chamber</h2>
              <div className="mt-f13 space-y-f8">
                <Link
                  href="/news/blog"
                  className="flex items-center gap-3 text-body text-text-primary hover:text-cambridge transition-colors"
                >
                  <span className="text-cambridge">→</span> Business Blog
                </Link>
                <Link
                  href="/news/member-news"
                  className="flex items-center gap-3 text-body text-text-primary hover:text-cambridge transition-colors"
                >
                  <span className="text-cambridge">→</span> Member News
                </Link>
                <Link
                  href="/news/magazine"
                  className="flex items-center gap-3 text-body text-text-primary hover:text-cambridge transition-colors"
                >
                  <span className="text-cambridge">→</span> Medina Means Business Magazine
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
