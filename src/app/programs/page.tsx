import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Programs",
  description:
    "Greater Medina Chamber of Commerce programs — leadership development, networking events, workplace safety, and professional meeting space for Medina County businesses.",
  openGraph: {
    title: "Programs — Greater Medina Chamber of Commerce",
    description:
      "Compass leadership, Social Connect, Golf Outing, Athena Awards, Safety Council, and rental space — programs that power Medina County's business community.",
  },
  alternates: { canonical: "/programs" },
};

const programs = [
  {
    name: "Compass Program",
    category: "Leadership Development",
    href: "/programs/compass",
    description:
      "A five-session professional development program covering self-awareness, communication, well-being, and community leadership. $995 per participant.",
  },
  {
    name: "Social Connect",
    category: "Networking",
    href: "/programs/social-connect",
    description:
      "The chamber's signature networking event at Foundry Social — early access networking, the Foundry Faceoff competition, and a public Business Circuit Expo.",
  },
  {
    name: "Golf Outing",
    category: "Annual Event",
    href: "/programs/golf-outing",
    description:
      "18-hole shotgun scramble at Westfield Country Club. Lunch, dinner, on-course games, and a room full of Medina County's business community.",
  },
  {
    name: "Athena Awards",
    category: "Recognition",
    href: "/programs/athena-awards",
    description:
      "Annual ceremony honoring exceptional women leaders in Medina County. Co-hosted with the Medina County Women's Journal.",
  },
  {
    name: "Safety Council",
    category: "Workplace Safety",
    href: "/programs/safety-council",
    description:
      "Monthly safety education meetings in partnership with the Ohio BWC — free for chamber members, with BWC rebate eligibility for participating employers.",
  },
  {
    name: "Rental Space",
    category: "Meeting Space",
    href: "/programs/rental-space",
    description:
      "Two professional meeting spaces in downtown Medina — The Vault (up to 16) and the Main Room (up to 50). Free parking, Wi-Fi, and AV included.",
  },
];

export default function ProgramsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Membership</p>
        <h1 className="text-display">
          Chamber
          <br />
          <span className="text-accent">Programs</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          More than networking — the chamber runs programs that develop leaders,
          connect professionals, recognize excellence, and give businesses the
          space and safety resources they need to grow.
        </p>
      </section>

      {/* Programs grid */}
      <section className="mt-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="
                group flex flex-col p-6
                bg-bg-secondary border border-border-secondary
                rounded-[var(--radius-lg)]
                hover:border-border-primary transition-colors
              "
            >
              <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-2">
                {p.category}
              </p>
              <h2 className="text-h4 group-hover:text-cambridge transition-colors">
                {p.name}
              </h2>
              <p className="text-body-sm text-text-secondary mt-3 leading-relaxed flex-1">
                {p.description}
              </p>
              <p className="text-body-sm font-bold text-cambridge mt-4">
                Learn more →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20 p-10 lg:p-16 bg-oxford text-white rounded-[var(--radius-lg)]">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-h2 text-white">Not a member yet?</h2>
            <p className="text-body-lg text-white/70 mt-4">
              Chamber membership unlocks most of these programs — including
              the Safety Council at no additional cost and member pricing on
              rental space and events.
            </p>
          </div>
          <div className="space-y-4">
            <Link
              href="/membership/join"
              className="
                block w-full text-center py-3 px-6
                bg-cambridge hover:bg-cambridge/90
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Join the Chamber →
            </Link>
            <Link
              href="/about/contact"
              className="
                block w-full text-center py-3 px-6
                border border-white/30 hover:border-white/60
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
