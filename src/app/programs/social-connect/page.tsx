import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { VesicaPiscisWatermark } from "@/components/effects/VesicaPiscisWatermark";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Social Connect",
  description:
    "Social Connect is the Greater Medina Chamber of Commerce's signature networking event, combining professional networking, friendly competition, and a Business Circuit Expo open to the public. Held at Foundry Social in Medina, Ohio.",
  openGraph: {
    title: "Social Connect | Greater Medina Chamber of Commerce",
    description:
      "Professional networking meets friendly competition at Foundry Social in Medina, Ohio. The Business Circuit Expo is open to the public.",
  },
  alternates: { canonical: "/programs/social-connect" },
};

const components = [
  {
    title: "Early Access Networking",
    time: "3:00 – 5:00 PM",
    ticketed: true,
    description:
      "Ticket holders get exclusive early access. Dedicated networking time before the doors open to the public. Make meaningful connections without the crowd.",
  },
  {
    title: "Foundry Faceoff",
    time: "3:00 – 5:00 PM",
    ticketed: true,
    description:
      "Friendly corporate competition featuring skeeball, go-kart racing, and duckpin bowling. A great icebreaker that turns strangers into teammates.",
  },
  {
    title: "Business Circuit Expo",
    time: "4:00 – 6:00 PM",
    ticketed: false,
    description:
      "Local businesses showcase their offerings to the broader community. Open to the public at no charge, no ticket required.",
  },
];

const audience = [
  {
    audience: "Chamber Members",
    benefit: "Early access networking + Foundry Faceoff competition with your team",
  },
  {
    audience: "Local Businesses",
    benefit: "Showcase your products and services at the Business Circuit Expo",
  },
  {
    audience: "The Community",
    benefit: "Free public access to the Business Circuit Expo (4–6 PM)",
  },
];

export default function SocialConnectPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Social Connect",
    description:
      "The Greater Medina Chamber's signature networking event. Professional networking, the Foundry Faceoff competition, and a public Business Circuit Expo at Foundry Social in Medina, Ohio.",
    provider: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      url: "https://medinachamber.com",
    },
    areaServed: { "@type": "AdministrativeArea", name: "Medina County, Ohio" },
    serviceType: "Business Networking Event",
    url: "https://medinachamber.com/programs/social-connect",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted Social Connect networking backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-chamber-social-connect-hero.webp"
            alt=""
            fill
            priority
            className="object-cover object-top opacity-[0.33]"
            sizes="100vw"
            quality={60}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
          <p className="text-overline text-cambridge mb-f8">Networking Event</p>
          <h1 className="text-display">
            <span className="block">Social</span>
            <span className="block text-accent">Connect</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            Networking that doesn&apos;t feel like networking. Social Connect
            blends professional connection, friendly competition, and a public
            business expo, all under one roof at Foundry Social.
          </p>
          <div className="mt-f34 flex flex-wrap gap-f13">
            <Link
              href="/events"
              className="
                inline-flex items-center px-8 py-4
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              See Upcoming Events →
            </Link>
            <Link
              href="/about/contact"
              className="
                inline-flex items-center px-6 py-4
                bg-emerald hover:bg-emerald/90
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Sponsorship Info
            </Link>
          </div>
          </div>
        </div>
      </section>

      {/* Venue callout */}
      <section className="relative overflow-hidden rule-top mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <VesicaPiscisWatermark className="tp-vesica" />
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] flex flex-col sm:flex-row sm:items-center gap-f21">
            <div className="flex-1">
              <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-f8">
                Presenting Sponsor & Venue
              </p>
              <p className="text-h3">Foundry Social</p>
              <p className="text-text-secondary text-body mt-f3">
                333 Foundry Street, Medina, OH 44256
              </p>
            </div>
            <a
              href="https://maps.google.com/?q=333+Foundry+Street+Medina+OH+44256"
              target="_blank"
              rel="noopener noreferrer"
              className="
                shrink-0 inline-flex items-center px-5 py-2.5
                bg-emerald hover:bg-emerald/90
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Get Directions ↗
            </a>
          </div>
        </FadeIn>
      </section>

      {/* How it works */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mb-f21">
              <p className="text-overline text-cambridge mb-f8">The Format</p>
              <h2 className="text-h2">How It Works</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-f21">
              {components.map((c) => (
                <div
                  key={c.title}
                  className="flex flex-col p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]"
                >
                  <div className="flex items-start justify-between gap-3 mb-f13">
                    <h3 className="text-h4 leading-snug">{c.title}</h3>
                    {!c.ticketed && (
                      <span className="shrink-0 px-2 py-0.5 bg-cambridge/20 text-cambridge text-caption font-bold rounded-full">
                        Free
                      </span>
                    )}
                  </div>
                  <p className="text-caption text-cambridge font-bold mb-f13">
                    {c.time}
                  </p>
                  <p className="text-body-sm text-text-secondary leading-relaxed flex-1">
                    {c.description}
                  </p>
                  {c.ticketed && (
                    <p className="text-caption text-text-tertiary mt-f21 pt-f13 border-t border-border-secondary">
                      Ticket required for access
                    </p>
                  )}
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Built for everyone */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="grid md:grid-cols-2 gap-f34 lg:gap-f55">
            <div>
              <p className="text-overline text-cambridge mb-f8">Audience</p>
              <h2 className="text-h2">Built for Everyone</h2>
              <p className="text-body text-text-secondary mt-f13 leading-relaxed">
                Whether you&apos;re a chamber member looking to expand your
                network, a business owner who wants to showcase your services,
                or a community member curious about what Medina County
                businesses have to offer, Social Connect has a place for you.
              </p>
              <p className="text-body text-text-secondary mt-f21 leading-relaxed">
                The Business Circuit Expo is free and open to the public.
                Ticket holders get early access, the competitive Foundry
                Faceoff, and dedicated networking time before the crowds
                arrive.
              </p>
            </div>

            <div className="space-y-f13">
              {audience.map((item) => (
                <div
                  key={item.audience}
                  className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
                >
                  <p className="text-body-sm font-bold text-text-primary">
                    {item.audience}
                  </p>
                  <p className="text-body-sm text-text-secondary mt-f3">
                    {item.benefit}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* CTA */}
      <section className="rule-top relative overflow-hidden py-f55 lg:py-f89">
        {/* Ghosted community backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/sneak-peeks/medina-chamber-community-006.webp"
            alt=""
            fill
            className="object-cover object-top opacity-[0.18]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary/75 border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <p className="text-overline text-cambridge mb-f8">Get Involved</p>
                <h2 className="text-h2">Want to exhibit or sponsor?</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Exhibitor spots and sponsorship packages are available. Get
                  your business in front of the chamber network and the
                  broader Medina community in one afternoon.
                </p>
              </div>
              <div className="space-y-f13">
                <Link
                  href="/about/contact"
                  className="
                    block w-full text-center py-f13 px-f21
                    bg-accent hover:bg-accent-hover
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Get in Touch →
                </Link>
                <Link
                  href="/events"
                  className="
                    block w-full text-center py-f13 px-f21
                    bg-emerald hover:bg-emerald/90
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  View Upcoming Events
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-f34">
            <Link
              href="/programs"
              className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              ← Back to Programs
            </Link>
          </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
