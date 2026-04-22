import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { totalCount } from "@/data/members";
import { getUpcomingEvents, shortenEventTitle } from "@/data/events";
import { FadeIn } from "@/components/FadeIn";
import { CountUp } from "@/components/CountUp";
import { HolographicChamber } from "@/components/holographic/HolographicChamber";
import { MouseGradient } from "@/components/MouseGradient";
import { NetworkBackdrop } from "@/components/holographic/NetworkBackdrop";
import { ThreePillars } from "@/components/ThreePillars";
import { PartnersMarquee } from "@/components/PartnersMarquee";
import { RentalSpaceCards } from "@/components/RentalSpaceCards";
import { MemberVoice } from "@/components/MemberVoice";
import { getEventGraphicRenderer } from "@/components/events/graphics/registry";
import { FluidGraphicFrame } from "@/components/events/graphics/FluidGraphicFrame";
import { TiltCard } from "@/components/events/TiltCard";

import { safeJsonLd } from "@/lib/json-ld";
import { headers } from "next/headers";
export const metadata: Metadata = {
  title: "Greater Medina Chamber of Commerce — Medina County, Ohio",
  description:
    "The Greater Medina Chamber of Commerce connects and champions businesses across Medina County, Ohio. 511+ member businesses, networking events, advocacy, and programs since 1938.",
  openGraph: {
    title: "Greater Medina Chamber of Commerce",
    description:
      "Connecting and championing Medina County's business community since 1938.",
  },
  alternates: { canonical: "/" },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": ["Organization", "LocalBusiness"],
  "@id": "https://medinachamber.com/#organization",
  name: "Greater Medina Chamber of Commerce",
  alternateName: "Medina Chamber",
  url: "https://medinachamber.com",
  logo: "https://medinachamber.com/images/logos/logo-full-blue.png",
  image: "https://medinachamber.com/images/photos/chamber-building-exterior.jpg",
  description:
    "The Greater Medina Chamber of Commerce connects and champions businesses across Medina County, Ohio. 511+ member businesses, networking events, advocacy, and programs since 1938.",
  foundingDate: "1938",
  telephone: "+1-330-723-8773",
  email: "office@medinaohchamber.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "139 N. Court Street, Suite A",
    addressLocality: "Medina",
    addressRegion: "OH",
    postalCode: "44256",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 41.1382,
    longitude: -81.8637,
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "10:00",
    closes: "16:00",
  },
  sameAs: [
    "https://www.facebook.com/medinachamber",
    "https://www.linkedin.com/company/greatermedinachamberofcommerce",
    "https://www.instagram.com/medinachamber/",
    "https://twitter.com/grmedinachamber",
    "https://www.youtube.com/channel/UCS_V2kgS_GxkOFV1n8iuHSw",
  ],
  areaServed: [
    { "@type": "AdministrativeArea", name: "Medina County, OH" },
    { "@type": "City", name: "Medina, OH 44256" },
    { "@type": "City", name: "Brunswick, OH 44212" },
    { "@type": "City", name: "Wadsworth, OH 44281" },
    { "@type": "City", name: "Lodi, OH 44254" },
    { "@type": "City", name: "Seville, OH 44273" },
    { "@type": "City", name: "Rittman, OH" },
    { "@type": "City", name: "Valley City, OH 44280" },
    { "@type": "City", name: "Lafayette, OH 44256" },
  ],
  numberOfEmployees: { "@type": "QuantitativeValue", value: 2 },
  member: {
    "@type": "QuantitativeValue",
    value: 511,
    unitText: "member businesses",
  },
};

export default async function HomePage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const upcomingEvents = getUpcomingEvents().slice(0, 3);

  return (
    <div>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd) }}
      />

      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="relative min-h-[85vh] flex items-end overflow-hidden">
        {/* Background photos — theme-aware */}
        <Image
          src="/images/photos/gazebo-daytime-flag.jpg"
          alt="Historic Medina Square gazebo"
          fill
          className="object-cover object-center [[data-theme=dark]_&]:hidden"
          priority
          quality={85}
        />
        <Image
          src="/images/photos/gazebo-night-flag.jpg"
          alt="Historic Medina gazebo at night"
          fill
          className="object-cover object-center hidden [[data-theme=dark]_&]:block"
          priority
          quality={85}
        />
        {/* Gradient overlay — oxford wash in both modes */}
        <div className="absolute inset-0 bg-gradient-to-t from-oxford via-oxford/60 to-oxford/15" />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 pb-16 lg:pb-24 pt-40 w-full">
          <div className="max-w-3xl">
            <p className="text-overline text-cambridge mb-4 tracking-widest">
              Greater Medina Chamber of Commerce
            </p>
            <h1 className="text-display text-white">
              Medina Means
              <br />
              <span className="text-cambridge">Business</span>
            </h1>
            <p className="text-body-lg text-white/80 mt-6 max-w-2xl">
              Championing Medina&apos;s business community since 1938. Advocacy
              that moves policy. Connections that open doors. Resources that
              drive growth.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/membership/join"
                className="
                  inline-flex items-center px-8 py-4
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Join the Chamber →
              </Link>
              <Link
                href="/membership/directory"
                className="
                  inline-flex items-center px-6 py-4
                  border border-white/30 hover:border-white/60
                  text-white
                  font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Browse the Directory
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats Strip ──────────────────────────────────── */}
      <MouseGradient
        className="bg-bg-secondary border-y border-border-secondary overflow-hidden"
        color="rgba(92, 149, 183, 0.22)"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { end: totalCount, label: "Member Businesses", suffix: "+" },
              { end: 30, label: "Events Per Year", suffix: "+" },
              { end: 9, label: "Committees" },
              { end: 88, label: "Years Serving", suffix: "+" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-display text-oxford [[data-theme=dark]_&]:text-cambridge leading-none">
                  <CountUp
                    end={s.end}
                    suffix={s.suffix || ""}
                    duration={s.end > 100 ? 2400 : 1600}
                  />
                </p>
                <p className="text-caption text-text-tertiary mt-2 uppercase tracking-wider">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </MouseGradient>

      {/* ─── Holographic Chamber (AI Section) ──────────────── */}
      {/* overflow-x-clip (not hidden) so position:sticky works on the
          mascot inside — overflow:hidden on an ancestor would neuter
          the sticky positioning. */}
      <section className="relative bg-bg-secondary border-t border-border-secondary overflow-x-clip">
        <NetworkBackdrop />
        <div className="relative">
          <FadeIn>
            <HolographicChamber />
          </FadeIn>
        </div>
      </section>

      {/* ─── Upcoming Events ──────────────────────────────── */}
      {upcomingEvents.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-28">
          <FadeIn>
            <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
              <div>
                <p className="text-overline text-cambridge mb-2">Upcoming Events</p>
                <h2 className="text-h2">What&apos;s next in Medina business.</h2>
              </div>
              <Link
                href="/events"
                className="hidden sm:inline-flex text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
              >
                View all events →
              </Link>
            </div>
          </FadeIn>

          {/* JSON-LD Event schema — Google rich results per event */}
          {upcomingEvents.map((event) => (
            <script
              key={`ld-${event.slug}`}
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Event",
                  name: event.title,
                  startDate: event.dateISO,
                  eventStatus: "https://schema.org/EventScheduled",
                  eventAttendanceMode:
                    "https://schema.org/OfflineEventAttendanceMode",
                  location: {
                    "@type": "Place",
                    name: event.location || "Greater Medina Chamber of Commerce",
                    address: {
                      "@type": "PostalAddress",
                      streetAddress:
                        event.street || "139 N. Court Street, Suite A",
                      addressLocality: event.city || "Medina",
                      addressRegion: event.state || "OH",
                      postalCode: event.zip || "44256",
                      addressCountry: "US",
                    },
                  },
                  image: event.image
                    ? [`https://medinachamber.com${event.image}`]
                    : undefined,
                  url: `https://medinachamber.com/events/${event.slug}`,
                  organizer: {
                    "@type": "Organization",
                    name: "Greater Medina Chamber of Commerce",
                    url: "https://medinachamber.com",
                  },
                  offers: event.registerUrl
                    ? {
                        "@type": "Offer",
                        url: event.registerUrl,
                        availability: "https://schema.org/InStock",
                        validFrom: new Date().toISOString(),
                      }
                    : undefined,
                }),
              }}
            />
          ))}

          <div className="grid md:grid-cols-3 gap-4">
            {upcomingEvents.map((event, i) => {
              const Graphic = getEventGraphicRenderer(event);
              return (
              <FadeIn key={event.slug} delay={i * 100}>
                <TiltCard>
                <Link
                  href={`/events/${event.slug}`}
                  className="
                    group flex flex-col h-full
                    bg-bg-secondary border border-border-secondary
                    rounded-[var(--radius-lg)]
                    overflow-hidden
                    hover:border-cambridge/40 hover:shadow-[0_12px_40px_rgba(131,188,169,0.12)]
                    transition-shadow duration-300
                  "
                >
                  {/* Graphic hero — event-type identity. Falls back to
                      no-banner if the event type isn't recognized. */}
                  {Graphic && (
                    <div className="border-b border-border-secondary">
                      <FluidGraphicFrame mode="social">
                        <Graphic mode="social" />
                      </FluidGraphicFrame>
                    </div>
                  )}

                  {/* Date badge header */}
                  <div className="flex items-center gap-3 p-5 border-b border-border-secondary">
                    <div className="flex-shrink-0 w-14 text-center">
                      <div className="bg-oxford [[data-theme=dark]_&]:bg-bg-tertiary text-white rounded-[var(--radius-md)] py-1.5 px-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-cambridge leading-none">
                          {event.month.substring(0, 3)}
                        </p>
                        <p className="text-xl font-bold leading-tight mt-0.5">
                          {event.day}
                        </p>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-caption text-cambridge font-bold uppercase tracking-wider">
                        {event.dayOfWeek}
                      </p>
                      <p className="text-caption text-text-tertiary mt-0.5">
                        {event.startTime}
                        {event.endTime ? `–${event.endTime}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Title + details */}
                  <div className="flex flex-col flex-1 p-5">
                    <h3 className="text-h4 leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                      {shortenEventTitle(event.title)}
                    </h3>
                    {event.location && (
                      <p className="text-caption text-text-tertiary mt-2 truncate">
                        {event.location}
                      </p>
                    )}
                    {event.pricing && (
                      <p className="text-body-sm text-cambridge mt-3 font-medium line-clamp-1">
                        {event.pricing.split("\n")[0]}
                      </p>
                    )}
                    <p className="mt-auto pt-4 text-body-sm font-bold text-cambridge group-hover:translate-x-1 transition-transform">
                      Event details →
                    </p>
                  </div>
                </Link>
                </TiltCard>
              </FadeIn>
              );
            })}
          </div>

          <div className="mt-8 sm:hidden text-center">
            <Link
              href="/events"
              className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              View all events →
            </Link>
          </div>
        </section>
      )}

      {/* ─── Rental Space Showcase ────────────────────────── */}
      <section className="relative bg-bg-secondary border-y border-border-secondary py-20 lg:py-28 overflow-hidden">
        {/* Ghosted meeting-room photo backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/networking.webp"
            alt=""
            fill
            className="object-cover opacity-[0.05]"
            sizes="100vw"
            quality={60}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="grid lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-14 items-start">
              <div>
                <p className="text-overline text-cambridge mb-3">Meeting Space</p>
                <h2 className="text-h2">
                  Need a room for your next&nbsp;
                  <span className="text-accent">meeting</span>?
                </h2>
                <p className="text-body-lg text-text-secondary mt-4 leading-relaxed">
                  Two professional meeting rooms in the heart of downtown
                  Medina. Free parking, Wi-Fi, and AV included. Member pricing
                  available.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/programs/rental-space"
                    className="
                      inline-flex items-center px-6 py-3
                      bg-accent hover:bg-accent-hover
                      text-white font-bold text-body-sm
                      rounded-[var(--radius-md)]
                      transition-colors
                    "
                  >
                    See Availability →
                  </Link>
                  <a
                    href="mailto:memberservices@medinaohchamber.com?subject=Meeting%20space%20inquiry"
                    className="
                      inline-flex items-center px-6 py-3
                      border border-border-primary hover:border-text-tertiary
                      text-text-primary font-bold text-body-sm
                      rounded-[var(--radius-md)]
                      transition-colors
                    "
                  >
                    Email to book
                  </a>
                </div>
              </div>

              <RentalSpaceCards />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── Three Pillars (Your Voice / Network / Growth) ── */}
      <ThreePillars />

      {/* ─── Member Voice ──────────────────────────────────── */}
      <MemberVoice />

      {/* ─── Partners & Sponsors ──────────────────────────── */}
      <PartnersMarquee />

      {/* ─── Join CTA ─────────────────────────────────────── */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        {/* Ghosted Medina industry backdrop across the whole band */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/industry-medina.jpg"
            alt=""
            fill
            className="object-cover object-center opacity-[0.05]"
            sizes="100vw"
            quality={55}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn>
          <div className="p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-overline text-cambridge mb-4">Membership</p>
                <h2 className="text-h2">
                  Ready to be part of what&apos;s building Medina?
                </h2>
                <p className="text-body-lg text-text-secondary mt-4">
                  Three tiers starting at $345 a year. The savings programs
                  alone typically cover that in the first month. Stephanie
                  will walk you through everything — no pressure.
                </p>
              </div>
              <div className="space-y-4">
                <Link
                  href="/membership/join"
                  className="
                    block w-full text-center py-4 px-6
                    bg-accent hover:bg-accent-hover
                    text-white font-bold text-body
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Apply for Membership →
                </Link>
                <Link
                  href="/membership/benefits"
                  className="
                    block w-full text-center py-3 px-6
                    border border-border-primary hover:border-text-tertiary
                    text-text-primary font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  See All Benefits
                </Link>
                <a
                  href="mailto:stephanie@medinaohchamber.com"
                  className="
                    block w-full text-center py-3 px-6
                    text-cambridge font-bold text-body-sm
                    transition-colors hover:text-cambridge/80
                  "
                >
                  Email Stephanie with Questions
                </a>
              </div>
            </div>
          </div>
        </FadeIn>
        </div>
      </section>
    </div>
  );
}
