import Link from "next/link";
import { ctaLink } from "@/lib/navigation";
import { FooterStamp } from "./FooterStamp";

/**
 * Footer is the full sitemap — now a Server Component.
 * Only the stamp logo needs client JS (theme-aware swap).
 * Everything else renders on the server: zero JS shipped.
 */
const footerColumns = [
  {
    label: "Membership",
    links: [
      { label: "Member Benefits", href: "/membership/benefits" },
      { label: "Pricing & Tiers", href: "/membership/pricing" },
      { label: "Member Directory", href: "/membership/directory" },
      { label: "Savings Programs", href: "/membership/savings" },
      { label: "Committees", href: "/membership/committees" },
      { label: "Join the Chamber", href: "/membership/join" },
    ],
  },
  {
    label: "Events",
    links: [
      { label: "Upcoming Events", href: "/events" },
      { label: "Athena Awards", href: "/events/athena-awards" },
      { label: "Golf Outing", href: "/events/golf-outing" },
      { label: "Sponsorships", href: "/events/sponsorships" },
    ],
  },
  {
    label: "Programs",
    links: [
      { label: "Compass Mentorship", href: "/programs/compass" },
      { label: "Social Connect", href: "/programs/social-connect" },
      { label: "Safety Council", href: "/programs/safety-council" },
      { label: "Rental Space", href: "/programs/rental-space" },
    ],
  },
  {
    label: "About & News",
    links: [
      { label: "About the Chamber", href: "/about" },
      { label: "Advocacy", href: "/about/advocacy" },
      { label: "Chamber News", href: "/news" },
      { label: "Member Announcements", href: "/news/member-news" },
      { label: "Magazine", href: "/news/magazine" },
      { label: "Hall of Fame", href: "/about/hall-of-fame" },
      { label: "Ambassadors", href: "/about/ambassadors" },
      { label: "Contact", href: "/about/contact" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-bg-secondary border-t border-border-primary">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-20">
        {/* Top: Logo + Nav columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Stamp logo column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <FooterStamp />
            <p className="text-caption max-w-xs">
              Greater Medina Chamber of Commerce. Connecting businesses
              since 1938.
            </p>

            {/* Contact — click-to-call & click-to-map */}
            <div className="mt-4 space-y-2">
              <a
                href="tel:+13307238773"
                className="text-body-sm text-text-secondary hover:text-accent transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                  <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd" />
                </svg>
                (330) 723-8773
              </a>
              <a
                href="https://www.google.com/maps/search/?api=1&query=145+N+Court+St+Medina+OH+44256"
                target="_blank"
                rel="noopener noreferrer"
                className="text-body-sm text-text-secondary hover:text-accent transition-colors flex items-start gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.274 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                </svg>
                145 N. Court St, Medina, OH 44256
              </a>
            </div>
          </div>

          {/* Nav columns */}
          {footerColumns.map((col) => (
            <div key={col.label}>
              <h4 className="text-overline mb-4">{col.label}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-body-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-border-primary flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-caption">
            &copy; {year} Greater Medina Chamber of Commerce. All rights
            reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/about/contact"
              className="text-caption hover:text-text-primary transition-colors"
            >
              Contact
            </Link>
            <Link
              href={ctaLink.href}
              className="text-caption text-accent hover:text-accent-hover transition-colors font-bold"
            >
              {ctaLink.label} →
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
