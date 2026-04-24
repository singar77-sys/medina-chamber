import Link from "next/link";
import { FooterStamp } from "./FooterStamp";
import { BuildCredit } from "./BuildCredit";

/**
 * Footer — Server Component. Three-band centered composition:
 *   1. Brand rail (seal + tagline + contact + socials)
 *   2. Curated quick-links row (replaces the 22-link sitemap)
 *   3. Bottom bar (copyright + credit | utility + Join CTA)
 *
 * FooterStamp is the only client island; everything else renders on
 * the server.
 */

const quickLinks = [
  { label: "Member Directory", href: "/membership/directory" },
  { label: "Join the Chamber", href: "/membership/join" },
  { label: "Upcoming Events", href: "/events" },
  { label: "Compass Mentorship", href: "/programs/compass" },
  { label: "Try ChamberBot", href: "/chamberbot" },
  { label: "Advocacy", href: "/about/advocacy" },
  { label: "Contact", href: "/about/contact" },
  { label: "Privacy", href: "/privacy" },
];

const socialLinks = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/medinachamber",
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/medinachamber/",
    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/greatermedinachamberofcommerce",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
  {
    label: "X / Twitter",
    href: "https://twitter.com/grmedinachamber",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/channel/UCS_V2kgS_GxkOFV1n8iuHSw",
    path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  },
];

export function Footer() {
  const year = new Date().getFullYear();
  const chamberYears = year - 1938;

  return (
    <footer className="ftr bg-bg-secondary border-t border-border-primary">
      <div className="mx-auto max-w-5xl px-6 lg:px-8 pt-16 lg:pt-20 pb-10 lg:pb-14">
        {/* ─── Band 0: Closing statement — bookends the hero ──── */}
        <div className="text-center mb-14 lg:mb-16">
          <p className="text-overline text-cambridge mb-3 tracking-[0.2em]">
            Since 1938
          </p>
          <div className="font-display font-bold uppercase leading-[0.88] tracking-tight text-text-primary">
            <div className="text-[clamp(2.75rem,7.5vw,5.75rem)]">Medina</div>
            <div className="text-[clamp(2rem,5.5vw,4.25rem)] mt-1">Means</div>
            <div
              className="
                font-script normal-case
                text-[clamp(3rem,8.5vw,6.25rem)]
                leading-[0.85] inline-block
                -mt-[0.32em]
              "
              style={{ color: "var(--coquelicot)", transform: "rotate(-2deg)" }}
            >
              business
            </div>
          </div>
          <p className="text-body-sm text-text-secondary mt-5 max-w-lg mx-auto">
            A century of local advocacy, connection, and growth — and
            we&apos;re just getting started.
          </p>
          <Link
            href="/membership/join"
            className="
              mt-7 inline-flex items-center gap-2 px-7 py-3.5
              bg-accent hover:bg-accent-hover
              text-white font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            Join the Chamber
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Accent stripe */}
        <div className="ftr__rule" aria-hidden="true" />

        {/* ─── Band 1: Brand rail (centered) ──────────────────── */}
        <div className="flex flex-col items-center text-center mt-10 lg:mt-12">
          <FooterStamp />
          <p className="text-body-sm text-text-secondary max-w-md leading-relaxed mt-1">
            Greater Medina Chamber of Commerce.
            <br />
            Connecting Medina County business since 1938.
          </p>

          {/* Contact */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <a
              href="tel:+13307238773"
              className="ftr-contact text-body-sm text-text-secondary inline-flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 shrink-0 text-cambridge"
              >
                <path
                  fillRule="evenodd"
                  d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z"
                  clipRule="evenodd"
                />
              </svg>
              (330) 723-8773
            </a>
            <a
              href="https://www.google.com/maps/search/?api=1&query=139+N+Court+St+Suite+A+Medina+OH+44256"
              target="_blank"
              rel="noopener noreferrer"
              className="ftr-contact text-body-sm text-text-secondary inline-flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 shrink-0 text-cambridge"
              >
                <path
                  fillRule="evenodd"
                  d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.274 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
                  clipRule="evenodd"
                />
              </svg>
              139 N. Court St, Suite A, Medina, OH 44256
            </a>
          </div>

          {/* Social rail */}
          <ul className="mt-6 flex items-center justify-center gap-2">
            {socialLinks.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="ftr-social"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d={s.path} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Accent stripe */}
        <div className="ftr__rule mt-10" aria-hidden="true" />

        {/* ─── Band 2: Quick links — 2-col grid on mobile, 4-col on
             desktop. Spans the same width as the bottom bar so the
             whole composition aligns. ────────────────────────────── */}
        <nav aria-label="Footer quick links" className="mt-8">
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-body-sm text-center">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="ftr-link">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Accent stripe */}
        <div className="ftr__rule mt-10" aria-hidden="true" />

        {/* ─── Band 3: Bottom bar — fully centered stack to match
             the rest of the footer's centered composition. ──────── */}
        <div className="mt-6 flex flex-col items-center gap-4">
          <p className="text-caption text-text-tertiary text-center">
            © {year} Greater Medina Chamber of Commerce.
            <span className="mx-2 text-border-primary">·</span>
            Est. 1938 · {chamberYears} years
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href="/about/contact" className="ftr-utility">
              Contact
            </Link>
            <Link href="/accessibility" className="ftr-utility">
              Accessibility
            </Link>
            <a href="#top" className="ftr-utility" aria-label="Back to top">
              ↑ Top
            </a>
          </div>
          <BuildCredit />
        </div>
      </div>
    </footer>
  );
}
