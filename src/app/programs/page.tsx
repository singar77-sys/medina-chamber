import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Programs for Local Businesses in Medina County",
  description:
    "Greater Medina Chamber of Commerce programs, leadership development, networking events, workplace safety, and professional meeting space for Medina County businesses.",
  openGraph: {
    title: "Programs | Greater Medina Chamber of Commerce",
    description:
      "Compass leadership, Social Connect, Golf Outing, Athena Awards, and Safety Council, programs that power Medina County's business community.",
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
      "The chamber's signature networking event at Foundry Social, early access networking, the Foundry Faceoff competition, and a public Business Circuit Expo.",
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
      "Annual ceremony honoring Medina County leaders who lead with excellence and champion the advancement of women. Co-hosted with WJ Creative Studio.",
  },
  {
    name: "Safety Council",
    category: "Workplace Safety",
    href: "/programs/safety-council",
    description:
      "Monthly safety education meetings in partnership with the Ohio BWC, enrollment free for chamber members, with BWC group rebate eligibility for participating employers.",
  },
  {
    name: "Reflections of Italy",
    category: "Group Travel",
    href: "/programs/italy-trip",
    description:
      "10-day chamber group trip to Italy with Collette, October 10-19, 2027. Rome, the Vatican, Cortona, Florence, Chianti, and Venice. From $5,999 per person.",
  },
];

export default function ProgramsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Chamber Programs | Greater Medina Chamber of Commerce",
    description:
      "Greater Medina Chamber programs, leadership development, networking events, workplace safety, and professional meeting space for Medina County businesses.",
    url: "https://medinachamber.com/programs",
    hasPart: [
      { "@type": "WebPage", name: "Compass Leadership Program", url: "https://medinachamber.com/programs/compass" },
      { "@type": "WebPage", name: "Social Connect", url: "https://medinachamber.com/programs/social-connect" },
      { "@type": "WebPage", name: "Annual Golf Outing", url: "https://medinachamber.com/programs/golf-outing" },
      { "@type": "WebPage", name: "Athena Awards", url: "https://medinachamber.com/programs/athena-awards" },
      { "@type": "WebPage", name: "Medina County Safety Council", url: "https://medinachamber.com/programs/safety-council" },
      { "@type": "WebPage", name: "Reflections of Italy", url: "https://medinachamber.com/programs/italy-trip" },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted Medina letterpress (bee + beehive) backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-chamber-programs-hero.webp"
            alt=""
            fill
            priority
            className="object-cover opacity-[0.33]"
            sizes="100vw"
            quality={60}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-overline text-cambridge mb-f8">Membership</p>
            <h1 className="text-display">
              <span className="block">Chamber</span>
              <span className="block text-accent">Programs</span>
            </h1>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              More than networking, the chamber runs programs that develop leaders,
              connect professionals, recognize excellence, and give businesses the
              space and safety resources they need to grow.
            </p>
          </div>
        </div>
      </section>

      {/* Program cards */}
      <section className="rule-top mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-f21">
            {programs.map((p, i) => (
              <FadeIn key={p.href} delay={i * 60}>
                <Link
                  href={p.href}
                  className="
                    group flex flex-col p-f21
                    bg-bg-secondary border border-border-secondary
                    rounded-[var(--radius-lg)]
                    hover:border-border-primary transition-colors
                    h-full
                  "
                >
                  <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-f8">
                    {p.category}
                  </p>
                  <h2 className="text-h4 group-hover:text-cambridge transition-colors">
                    {p.name}
                  </h2>
                  <p className="text-body-sm text-text-secondary mt-f13 leading-relaxed flex-1">
                    {p.description}
                  </p>
                  <p className="text-body-sm font-bold text-cambridge mt-f13 group-hover:translate-x-1 transition-transform">
                    Learn more →
                  </p>
                </Link>
              </FadeIn>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* Membership CTA */}
      <section className="rule-top relative overflow-hidden py-f55 lg:py-f89">
        {/* Ghosted community backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/sneak-peeks/medina-chamber-community-001.webp"
            alt=""
            fill
            className="object-cover object-top opacity-[0.10]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
              <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <h2 className="text-h2">Not a member yet?</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Chamber membership unlocks most of these programs, including
                  the Safety Council at no additional cost and member pricing on
                  rental space and events.
                </p>
              </div>
              <div className="space-y-f13">
                <Link
                  href="/membership/join"
                  className="
                    block w-full text-center py-f13 px-f21
                    bg-accent hover:bg-accent-hover
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
                    block w-full text-center py-f13 px-f21
                    border border-border-primary hover:border-text-tertiary
                    text-text-primary font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
