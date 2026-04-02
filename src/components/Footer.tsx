"use client";

import Link from "next/link";
import Image from "next/image";
import { ctaLink } from "@/lib/navigation";
import { useTheme } from "./ThemeProvider";

/**
 * Footer is the full sitemap.
 * Since the header nav is intentionally lean (4 items + search),
 * the footer carries the comprehensive link structure for SEO
 * and discoverability.
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
  const { theme } = useTheme();
  const year = new Date().getFullYear();

  const stampSrc =
    theme === "dark"
      ? "/images/logos/stamp-white.png"
      : "/images/logos/stamp-blue.png";

  return (
    <footer className="bg-bg-secondary border-t border-border-primary">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-20">
        {/* Top: Logo + Nav columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Stamp logo column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Image
              src={stampSrc}
              alt="Medina Chamber seal"
              width={80}
              height={80}
              className="mb-4 opacity-80"
            />
            <p className="text-caption max-w-xs">
              Greater Medina Chamber of Commerce. Connecting businesses
              since 1938.
            </p>
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
