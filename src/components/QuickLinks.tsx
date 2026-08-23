import Image from "next/image";
import Link from "next/link";
import { growthZone } from "@/lib/navigation";
import { FadeIn } from "@/components/FadeIn";

/**
 * Home-page quick-access row — a compact, modern take on the old Squarespace
 * icon bar. Small orange monoline symbols in tiles with subtle gradient depth
 * that lift, scale, and glow on hover, and rise in with a stagger — so the
 * most-wanted destinations are one tap away and the row feels alive, not static.
 */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

interface QuickLink {
  label: string;
  href: string;
  external?: boolean;
  icon: React.ReactNode;
}

const links: QuickLink[] = [
  {
    label: "Join",
    href: "/membership/join",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-6 h-6" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6M22 11h-6" />
      </svg>
    ),
  },
  {
    label: "Member Login",
    href: growthZone.login,
    external: true,
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-6 h-6" aria-hidden="true">
        <circle cx="7.5" cy="15.5" r="5.5" />
        <path d="m21 2-9.6 9.6" />
        <path d="m15.5 7.5 3 3L22 7l-3-3" />
      </svg>
    ),
  },
  {
    label: "Directory",
    href: "/membership/directory",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-6 h-6" aria-hidden="true">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
        <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
      </svg>
    ),
  },
  {
    label: "Job Board",
    href: "/jobs",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-6 h-6" aria-hidden="true">
        <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        <rect width="20" height="14" x="2" y="6" rx="2" />
      </svg>
    ),
  },
  {
    label: "Savings",
    href: "/membership/savings",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-6 h-6" aria-hidden="true">
        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
        <path d="m15 9-6 6" />
        <path d="M9 9h.01M15 15h.01" />
      </svg>
    ),
  },
  {
    label: "Chamber Store",
    href: "/store",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} className="w-6 h-6" aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
];

const tileClass = "group flex flex-col items-center gap-f8 text-center focus-visible:outline-none";

function IconTile({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <>
      <span
        className="
          flex h-14 w-14 items-center justify-center
          rounded-[var(--radius-lg)]
          bg-gradient-to-b from-bg-secondary to-bg-tertiary
          border border-border-secondary
          text-accent
          transition-all duration-300 ease-out
          group-hover:-translate-y-1.5 group-hover:scale-105
          group-hover:border-accent/60
          group-hover:shadow-[0_14px_30px_-10px_rgba(200,74,30,0.55)]
          group-focus-visible:border-accent
        "
      >
        {icon}
      </span>
      <span className="text-caption font-bold text-text-secondary transition-colors group-hover:text-accent group-focus-visible:text-accent">
        {label}
      </span>
    </>
  );
}

export function QuickLinks() {
  return (
    <section className="relative overflow-hidden border-b border-border-secondary">
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
        <Image
          src="/images/membership/medina-chamber-member-perks-bg.webp"
          alt=""
          fill
          className="object-cover opacity-[0.10]"
          sizes="100vw"
          quality={60}
        />
      </div>
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8 py-f55">
        <FadeIn>
          <p className="text-overline text-text-tertiary text-center mb-f21">
            Quick Access
          </p>
        </FadeIn>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-f21">
          {links.map((l, i) => (
            <FadeIn key={l.label} delay={i * 70}>
              {l.external ? (
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={tileClass}
                >
                  <IconTile icon={l.icon} label={l.label} />
                </a>
              ) : (
                <Link href={l.href} className={tileClass}>
                  <IconTile icon={l.icon} label={l.label} />
                </Link>
              )}
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
