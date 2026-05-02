import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Medina Matters Podcast",
  description:
    "The Medina Matters Podcast, conversations with local business owners, community leaders, and Chamber members about business, community, and what makes Medina County special.",
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
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Podcast</p>
        <h1 className="text-display">
          Medina
          <br />
          <span className="text-accent">Matters</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Conversations with local business owners, community leaders, and
          Chamber members, about business, growth, and what makes Medina County
          worth investing in.
        </p>
      </section>

      {/* Embedded player */}
      <section className="mt-16">
        <div className="rounded-[var(--radius-lg)] overflow-hidden border border-border-secondary bg-bg-secondary">
          <iframe
            src={TELVUE_URL}
            width="100%"
            height="600"
            allowFullScreen
            title="Medina Matters Podcast"
            className="block"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16 grid md:grid-cols-2 gap-6">
        <div className="p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
          <h2 className="text-h3">Want to be a guest?</h2>
          <p className="text-text-secondary text-body mt-3">
            Chamber members and Medina County business owners are welcome to
            share their story on Medina Matters. Reach out to get started.
          </p>
          <Link
            href="/about/contact"
            className="
              inline-flex items-center mt-6 px-5 py-2.5
              bg-accent hover:bg-accent-hover
              text-white font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            Get in Touch →
          </Link>
        </div>

        <div className="p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
          <h2 className="text-h3">More from the Chamber</h2>
          <div className="mt-4 space-y-3">
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
      </section>
    </div>
  );
}
