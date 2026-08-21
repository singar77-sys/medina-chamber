import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink, ButtonA } from "@/components/ui/Button";
import { totalCount } from "@/data/members";
import { getUpcomingEvents, shortenEventTitle } from "@/data/events";
import { FadeIn } from "@/components/FadeIn";
import { CountUp } from "@/components/CountUp";
import { MouseGradient } from "@/components/MouseGradient";
import { ThreePillars } from "@/components/ThreePillars";
import { PartnersMarquee } from "@/components/PartnersMarquee";
import { RentalSpaceCards } from "@/components/RentalSpaceCards";
import { MemberVoice } from "@/components/MemberVoice";
import { getEventGraphicRenderer } from "@/components/events/graphics/registry";

// ISR: the homepage shows the next 3 upcoming events, filtered by `new Date()`
// against static event data. Re-render daily so passed events drop off instead
// of freezing at build time. (Also refreshes the "years serving" count once a
// year for free.)
export const revalidate = 86400;
import { FluidGraphicFrame } from "@/components/events/graphics/FluidGraphicFrame";
import { TiltCard } from "@/components/events/TiltCard";
import { VesicaPiscisWatermark } from "@/components/effects/VesicaPiscisWatermark";
import { BeeFly } from "@/components/effects/BeeFly";
import { CommunityInvestors } from "@/components/CommunityInvestors";
import { RecentPhotoStrip } from "@/components/RecentPhotoStrip";
import { MagazineDropIn } from "@/components/MagazineDropIn";
import { GazeboHero } from "@/components/GazeboHero";

import { safeJsonLd } from "@/lib/json-ld";
import { chamberOffice, memberServices, stephanie } from "@/data/staff";
import { mailto } from "@/lib/format";
export const metadata: Metadata = {
  title: "Greater Medina Chamber of Commerce | Medina County, Ohio",
  description: "The Greater Medina Chamber of Commerce connects and champions businesses across Medina County, Ohio. Member businesses, networking events, advocacy, and programs since 1938.",
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
    "The Greater Medina Chamber of Commerce connects and champions businesses across Medina County, Ohio. Member businesses, networking events, advocacy, and programs since 1938.",
  foundingDate: "1938",
  telephone: "+1-330-723-8773",
  email: chamberOffice.email,
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
    value: totalCount,
    unitText: "member businesses",
  },
};

export default function HomePage() {
  const upcomingEvents = getUpcomingEvents().slice(0, 3);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd) }}
      />

      
      <section className="site-hero relative min-h-[85dvh] flex items-end overflow-hidden">
        {/* Background photos — theme-aware */}
        <GazeboHero />
        {/* Gradient overlay — bottom-up oxford wash */}
        <div className="absolute inset-0 bg-gradient-to-t from-oxford via-oxford/60 to-oxford/15" />
        {/* Top-down cap — darkens upper third so headline lands on dark sky
            not lit cupola. from-oxford/50 fades to nothing at 40% height. */}
        <div className="absolute inset-0 bg-gradient-to-b from-oxford/50 via-oxford/10 to-transparent" />

        {/* Content — vertical rhythm: pt-f144 (144px) / pb-f89 (89px) */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 pb-f89 lg:pb-f89 pt-f144 w-full">
          <div className="max-w-3xl">
            <p className="text-overline text-cambridge mb-f13 tracking-widest">
              Greater Medina Chamber of Commerce
            </p>
            <h1 className="font-display font-bold uppercase leading-[0.88] tracking-tight text-white">
              <span className="block text-[clamp(2.75rem,7.5vw,5.75rem)]">Medina</span>
              <span className="block text-[clamp(2rem,5.5vw,4.25rem)] mt-1">Means</span>
              <span
                className="font-script normal-case text-[clamp(3rem,8.5vw,6.25rem)] leading-[0.85] inline-block -mt-[0.32em]"
                style={{ color: "var(--coquelicot)", transform: "rotate(-2deg)" }}
              >
                business
              </span>
            </h1>
            <p className="text-body-lg text-white/80 mt-f21 max-w-2xl">
              Championing Medina&apos;s business community since 1938. Advocacy
              that moves policy. Connections that open doors. Resources that
              drive growth.
            </p>
            <div className="mt-f34 flex flex-wrap gap-f21">
              <ButtonLink href="/membership/join" variant="primary" size="lg">
                Join the Chamber →
              </ButtonLink>
              <Link
                href="/membership/directory"
                className="
                  inline-flex items-center px-f21 py-f21
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

      {/* Stats Strip — py-f55 (55px) */}
      <MouseGradient
        className="bg-bg-secondary border-y border-border-secondary overflow-hidden"
        color="rgba(92, 149, 183, 0.22)"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-f55">
          <div className="grid grid-cols-3 gap-f13 md:gap-f21">
            {[
              { end: 500, label: "Member Businesses", suffix: "+" },
              { end: 50, label: "Events Per Year", suffix: "+" },
              { end: new Date().getFullYear() - 1938, label: "Years Serving", suffix: "+" },
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

      {/* Upcoming Events — py-f89 lg:py-f144 */}
      {upcomingEvents.length > 0 && (
        <section className="relative overflow-hidden mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
          <VesicaPiscisWatermark className="tp-vesica" />
          <FadeIn>
            <div className="flex items-end justify-between mb-f34 gap-f21 flex-wrap">
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
                __html: safeJsonLd({
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

          <div className="grid md:grid-cols-3 gap-f21">
            {upcomingEvents.map((event, i) => {
              const Graphic = getEventGraphicRenderer(event);
              return (
              /* min-w-0 is REQUIRED on grid items here. Without it the
                 grid track sizes itself to each item's min-content
                 width, and the truncated address line below
                 (`white-space: nowrap` via the .truncate class) becomes
                 the intrinsic min-content. Result: the third card
                 overflowed the right edge of the viewport at narrower
                 desktops because the address line "139 N. Court Street
                 Suite A, Medina, OH, 44256" is wider than 1/3 of the
                 container at < ~1280px. min-w-0 lets the track shrink
                 and the truncate handles the overflow inside the card. */
              <FadeIn key={event.slug} delay={i * 100} className="h-full min-w-0">
                <TiltCard className="h-full min-w-0">
                <Link
                  href={`/events/${event.slug}`}
                  className="
                    group flex flex-col h-full min-w-0
                    bg-bg-secondary border border-border-secondary
                    rounded-[var(--radius-lg)]
                    overflow-hidden
                    hover:border-cambridge/40 hover:shadow-cambridge
                    transition-shadow duration-300
                  "
                >
                  {/* Graphic hero — SVG graphic for known event types;
                      Cloudinary photo fallback for everything else. */}
                  {Graphic ? (
                    <div className="border-b border-border-secondary">
                      <FluidGraphicFrame mode="social">
                        <Graphic mode="social" />
                      </FluidGraphicFrame>
                    </div>
                  ) : event.image ? (
                    <div className="relative aspect-[1200/630] border-b border-border-secondary overflow-hidden">
                      <Image
                        src={event.image}
                        alt={event.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover object-bottom"
                      />
                    </div>
                  ) : null}

                  {/* Date badge header */}
                  <div className="flex items-center gap-3 p-5 border-b border-border-secondary">
                    <div className="flex-shrink-0 w-14 text-center">
                      <div className="bg-oxford text-white rounded-[var(--radius-md)] py-1.5 px-1">
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
                  <div className="flex flex-col flex-1 p-5 min-w-0">
                    <h3 className="text-h4 leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                      {shortenEventTitle(event.title)}
                    </h3>
                    {event.location && (
                      <p className="text-caption text-text-tertiary mt-2 truncate">
                        {event.location}
                      </p>
                    )}
                    {/* Pricing line — always renders so the three cards
                        have uniform content density. Get-to-Know has an
                        empty pricing field in the GrowthZone scrape (it's
                        a free orientation), which previously left a
                        ragged hole where Chamber Chat / Business Brew
                        show their cambridge pricing line. Fallback "Free"
                        keeps the visual rhythm consistent. */}
                    <p className="text-body-sm text-cambridge mt-3 font-medium line-clamp-1">
                      {(() => {
                        if (!event.pricing) return "Free";
                        // First line, then first sentence — prevents mid-word truncation
                        // like "Registration preferred, but not..." in the cards.
                        const firstLine = event.pricing.split("\n")[0];
                        const periodIdx = firstLine.indexOf(".");
                        return periodIdx > 0
                          ? firstLine.slice(0, periodIdx + 1)
                          : firstLine;
                      })()}
                    </p>
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

          <div className="mt-f21 sm:hidden text-center">
            <Link
              href="/events"
              className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              View all events →
            </Link>
          </div>
        </section>
      )}

      {/* Three Pillars (Your Voice / Network / Growth) */}
      <ThreePillars />

      {/* Community Investors */}
      <CommunityInvestors />

      {/* Life at the Chamber — recent event photos from Vercel Blob */}
      <RecentPhotoStrip />

      {/* Rental Space — py-f89 lg:py-f144 */}
      <section className="relative bg-bg-secondary border-y border-border-secondary py-f89 lg:py-f144 overflow-hidden">
        {/* Ghosted chamber meeting-room backdrop. (Restored 2026-08-11 — the
            MemberVoice section separates this from the Join CTA ghost, so the
            backdrops still alternate.) */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/events/networking.webp"
            alt=""
            fill
            className="object-cover opacity-[0.10]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            {/* Golden ratio columns: 1fr : φ (1.618fr) — exact divine proportion */}
            <div className="grid lg:grid-cols-[1fr_1.618fr] gap-f34 lg:gap-f55 items-start">
              <div>
                <p className="text-overline text-cambridge mb-3">Meeting Space</p>
                <h2 className="text-h2">
                  Need a room for your next&nbsp;
                  <span className="text-accent">meeting</span>?
                </h2>
                <p className="text-body-lg text-text-secondary mt-f13 leading-relaxed">
                  Two professional meeting rooms in the heart of downtown
                  Medina. Free parking, Wi-Fi, and AV included. Member pricing
                  available.
                </p>
                <div className="mt-f34 flex flex-wrap gap-f13">
                  <ButtonLink href="/programs/rental-space" variant="primary" size="md">
                    See Availability →
                  </ButtonLink>
                  <ButtonA
                    href={mailto(memberServices.email, "Meeting space inquiry")}
                    variant="ghost"
                    size="md"
                  >
                    Email to book
                  </ButtonA>
                </div>
              </div>

              <RentalSpaceCards />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Member Voice */}
      <MemberVoice />

      {/* Join CTA — py-f89 lg:py-f144 */}
      <section className="relative py-f89 lg:py-f144 overflow-hidden">
        {/* Ghosted Medina industry backdrop across the whole band */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/industry-medina.jpg"
            alt=""
            fill
            className="object-cover object-center opacity-[0.10]"
            sizes="100vw"
            quality={55}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <p className="text-overline text-cambridge mb-f13">Membership</p>
                <h2 className="text-h2">
                  Ready to be part of what&apos;s building Medina?
                </h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Three tiers starting at $345 a year. The savings programs
                  alone typically cover that in the first month. Stephanie
                  will walk you through everything, no pressure.
                </p>
              </div>
              <div className="space-y-f21">
                <ButtonLink
                  href="/membership/join"
                  variant="primary"
                  size="lg"
                  className="w-full justify-center"
                >
                  Apply for Membership →
                </ButtonLink>
                <ButtonLink
                  href="/membership/benefits"
                  variant="ghost"
                  size="md"
                  className="w-full justify-center"
                >
                  See All Benefits
                </ButtonLink>
                <a
                  href={mailto(stephanie.email)}
                  className="
                    block w-full text-center py-f13 px-f21
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

      <BeeFly />
      <MagazineDropIn />

      {/* Partners & Sponsors */}
      <PartnersMarquee />
    </div>
  );
}
