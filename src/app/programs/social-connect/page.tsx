import type { Metadata } from "next";
import Link from "next/link";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Social Connect",
  description:
    "Social Connect is the Greater Medina Chamber of Commerce's signature networking event — combining professional networking, friendly competition, and a Business Circuit Expo open to the public. Held at Foundry Social in Medina, Ohio.",
  openGraph: {
    title: "Social Connect — Greater Medina Chamber of Commerce",
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
      "Ticket holders get exclusive early access — dedicated networking time before the doors open to the public. Make meaningful connections without the crowd.",
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
      "Local businesses showcase their offerings to the broader community. Open to the public at no charge — no ticket required.",
  },
];

export default function SocialConnectPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Social Connect",
    description:
      "The Greater Medina Chamber's signature networking event — professional networking, the Foundry Faceoff competition, and a public Business Circuit Expo at Foundry Social in Medina, Ohio.",
    organizer: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      url: "https://medinachamber.com",
    },
    location: {
      "@type": "Place",
      name: "Foundry Social",
      address: {
        "@type": "PostalAddress",
        streetAddress: "333 Foundry Street",
        addressLocality: "Medina",
        addressRegion: "OH",
        postalCode: "44256",
        addressCountry: "US",
      },
    },
    eventStatus: "https://schema.org/EventScheduled",
    url: "https://medinachamber.com/programs/social-connect",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Networking Event</p>
        <h1 className="text-display">
          Social
          <br />
          <span className="text-accent">Connect</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Networking that doesn&apos;t feel like networking. Social Connect
          blends professional connection, friendly competition, and a public
          business expo — all under one roof at Foundry Social.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
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
              border border-border-primary hover:border-text-tertiary
              text-text-primary font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            Sponsorship Info
          </Link>
        </div>
      </section>

      {/* Venue callout */}
      <section className="mt-16 p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex-1">
          <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-1">
            Presenting Sponsor & Venue
          </p>
          <p className="text-h3">Foundry Social</p>
          <p className="text-text-secondary text-body mt-1">
            333 Foundry Street, Medina, OH 44256
          </p>
        </div>
        <a
          href="https://maps.google.com/?q=333+Foundry+Street+Medina+OH+44256"
          target="_blank"
          rel="noopener noreferrer"
          className="
            shrink-0 inline-flex items-center px-5 py-2.5
            border border-border-primary hover:border-text-tertiary
            text-text-primary font-bold text-body-sm
            rounded-[var(--radius-md)]
            transition-colors
          "
        >
          Get Directions ↗
        </a>
      </section>

      {/* Event components */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {components.map((c) => (
            <div
              key={c.title}
              className="flex flex-col p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="text-h4 leading-snug">{c.title}</h3>
                {!c.ticketed && (
                  <span className="shrink-0 px-2 py-0.5 bg-cambridge/20 text-cambridge text-caption font-bold rounded-full">
                    Free
                  </span>
                )}
              </div>
              <p className="text-caption text-cambridge font-bold mb-3">{c.time}</p>
              <p className="text-body-sm text-text-secondary leading-relaxed flex-1">
                {c.description}
              </p>
              {c.ticketed && (
                <p className="text-caption text-text-tertiary mt-4 pt-4 border-t border-border-secondary">
                  Ticket required for access
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="mt-20 grid md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-h2">Built for Everyone</h2>
          <p className="text-body text-text-secondary mt-4 leading-relaxed">
            Whether you&apos;re a chamber member looking to expand your network,
            a business owner who wants to showcase your services, or a community
            member curious about what Medina County businesses have to offer —
            Social Connect has a place for you.
          </p>
          <p className="text-body text-text-secondary mt-4 leading-relaxed">
            The Business Circuit Expo is free and open to the public. Ticket
            holders get early access, the competitive Foundry Faceoff, and
            dedicated networking time before the crowds arrive.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { audience: "Chamber Members", benefit: "Early access networking + Foundry Faceoff competition with your team" },
            { audience: "Local Businesses", benefit: "Showcase your products and services at the Business Circuit Expo" },
            { audience: "The Community", benefit: "Free public access to the Business Circuit Expo (4–6 PM)" },
          ].map((item) => (
            <div
              key={item.audience}
              className="p-5 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <p className="text-body-sm font-bold text-text-primary">{item.audience}</p>
              <p className="text-body-sm text-text-secondary mt-1">{item.benefit}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20 p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <div className="max-w-2xl">
          <h2 className="text-h2">Want to exhibit or sponsor?</h2>
          <p className="text-body-lg text-text-secondary mt-4">
            Exhibitor spots and sponsorship packages are available. Get your
            business in front of the chamber network and the broader Medina
            community in one afternoon.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/about/contact"
              className="
                inline-flex items-center px-6 py-3
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
                inline-flex items-center px-6 py-3
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              View Upcoming Events
            </Link>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
