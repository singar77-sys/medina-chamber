import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  description:
    "The page you were looking for doesn't exist at the Greater Medina Chamber of Commerce. Search the directory, browse events, or head back home.",
  robots: { index: false, follow: false },
};

/**
 * Branded 404. Lives in the App Router root so any unmatched route
 * (including non-existent member slugs, mistyped URLs, deleted pages)
 * falls through here rather than to Next's default error UI.
 *
 * Matches the site's hero pattern: oxford background, cambridge eyebrow,
 * coquelicot accent, Fibonacci spacing tokens. Three exits — directory,
 * events, contact — and a tertiary "home" link. Keeps the user on the
 * site instead of bouncing back to Google.
 */
export default function NotFound() {
  return (
    <section className="bg-oxford border-b border-white/10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pt-f144 pb-f89">
        <div className="max-w-3xl">
          <p className="text-overline text-cambridge mb-f8">Error 404</p>
          <h1 className="text-display text-white">
            <span className="block">Page not</span>
            <span className="block text-accent">found.</span>
          </h1>
          <p className="text-body-lg text-white/70 mt-f13 max-w-2xl leading-relaxed">
            The link is broken, the page moved, or the URL was mistyped. The
            chamber&apos;s still here — try one of these:
          </p>

          <div className="mt-f34 grid sm:grid-cols-2 gap-f13">
            <ExitCard
              href="/membership/directory"
              eyebrow="Most likely"
              title="Member Directory"
              copy="500+ chamber businesses, searchable by name, service, industry, or city."
            />
            <ExitCard
              href="/events"
              eyebrow="Upcoming"
              title="Events Calendar"
              copy="Networking, member meetings, Compass leadership, and the annual golf outing."
            />
            <ExitCard
              href="/about/contact"
              eyebrow="Get in touch"
              title="Contact the Chamber"
              copy="139 N. Court Street, Suite A · (330) 723-8773 · open weekdays 10am–4pm."
            />
            <ExitCard
              href="/"
              eyebrow="Start over"
              title="Home"
              copy="Back to the front door of medinachamber.com."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ExitCard({
  href,
  eyebrow,
  title,
  copy,
}: {
  href: string;
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <Link
      href={href}
      className="
        group block
        bg-white/[0.04] border border-white/15
        rounded-[var(--radius-lg)] p-f21
        hover:bg-white/[0.07] hover:border-cambridge/50
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cambridge focus-visible:ring-offset-2 focus-visible:ring-offset-oxford
        transition-colors duration-200
      "
    >
      <p className="text-overline text-cambridge mb-f8">{eyebrow}</p>
      <h2 className="text-h4 text-white group-hover:text-cambridge transition-colors">
        {title} <span aria-hidden="true">→</span>
      </h2>
      <p className="text-body-sm text-white/65 mt-f8 leading-relaxed">{copy}</p>
    </Link>
  );
}
