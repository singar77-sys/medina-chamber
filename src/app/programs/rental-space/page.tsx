import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { memberServices } from "@/data/staff";
import { mailto } from "@/lib/format";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Rental Space",
  description:
    "The Greater Medina Chamber of Commerce offers two professional meeting spaces for rent in downtown Medina. The Vault conference room (up to 16) and the Main Room training space (up to 50). Free parking, Wi-Fi, and AV included.",
  openGraph: {
    title: "Rental Space | Greater Medina Chamber of Commerce",
    description:
      "Professional meeting and event space in the heart of downtown Medina. The Vault seats 16, the Main Room seats 50.",
  },
  alternates: { canonical: "/programs/rental-space" },
};

const rooms = [
  {
    name: "The Vault",
    subtitle: "Conference Room",
    capacity: "Up to 16",
    best: "Board meetings, client presentations, team strategy sessions",
    description:
      "A private, closed-door meeting space featuring the chamber's distinctive vault door. Professional, memorable, and perfectly sized for focused collaboration.",
    features: ["Private room with vault door", "98 inch flat screen", "Whiteboard", "Seats up to 16"],
  },
  {
    name: "Main Room",
    subtitle: "Training & Seminar Space",
    capacity: "Up to 50",
    best: "Workshops, seminars, training sessions, larger team meetings",
    description:
      "A spacious, flexible room with configurable table arrangements to fit your event. Classroom-style training, panel discussions, all-hands meetings.",
    features: ["Flexible table configurations", "98 inch flat screen", "Presentation-ready setup", "Seats up to 50"],
  },
];

const amenities = [
  "Tables and chairs",
  "98 inch flat screen / display",
  "High-speed Wi-Fi",
  "Coffee maker",
  "Free on-site parking",
  "City Hall garage nearby",
  "First-floor access",
  "Downtown Medina location",
];

export default function RentalSpacePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Greater Medina Chamber of Commerce, Meeting & Event Space",
    description:
      "Professional meeting and event space in downtown Medina. The Vault conference room seats up to 16. The Main Room training space seats up to 50. Free parking, Wi-Fi, and AV included.",
    url: "https://medinachamber.com/programs/rental-space",
    address: {
      "@type": "PostalAddress",
      streetAddress: "139 N. Court Street, Suite A",
      addressLocality: "Medina",
      addressRegion: "OH",
      postalCode: "44256",
      addressCountry: "US",
    },
    telephone: "+13307238773",
    email: memberServices.email,
    openingHours: "Mo-Fr 07:30-17:30",
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "High-Speed Wi-Fi", value: true },
      { "@type": "LocationFeatureSpecification", name: "Free On-Site Parking", value: true },
      { "@type": "LocationFeatureSpecification", name: "Flat Screen TV / Display", value: true },
      { "@type": "LocationFeatureSpecification", name: "Coffee Station", value: true },
      { "@type": "LocationFeatureSpecification", name: "Wheelchair Accessible", value: true },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted Main Room meeting-space backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/programs/rental-space/medina-chamber-meeting-space-hero.webp"
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
            <p className="text-overline text-cambridge mb-f8">Programs</p>
            <h1 className="text-display">
              <span className="block">Meeting</span>
              <span className="block text-accent">Space</span>
            </h1>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              Professional meeting and event space in the heart of downtown
              Medina. Two rooms. Free parking. Everything you need already there.
            </p>

            <div className="mt-f34 flex flex-wrap gap-f13">
              <a
                href={mailto(memberServices.email)}
                className="
                  inline-flex items-center px-8 py-4
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Check Availability →
              </a>
              <a
                href="tel:+13307238773"
                className="
                  inline-flex items-center px-6 py-4
                  border border-border-primary hover:border-text-tertiary
                  text-text-primary font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                (330) 723-8773
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Location banner */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] flex flex-col sm:flex-row sm:items-center gap-f21">
            <div className="flex-1">
              <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-f8">
                Location
              </p>
              <p className="text-h3">Greater Medina Chamber of Commerce</p>
              <p className="text-text-secondary text-body mt-f3">
                139 N. Court Street, Suite A · Medina, OH 44256
              </p>
              <p className="text-text-tertiary text-body-sm mt-f3">
                One block from Historic Medina Square · First-floor access
              </p>
            </div>
            <a
              href="https://maps.google.com/?q=139+N+Court+Street+Suite+A+Medina+OH+44256"
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
          </div>
        </FadeIn>
      </section>

      {/* Rooms */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mb-f21">
              <p className="text-overline text-cambridge mb-f8">The Spaces</p>
              <h2 className="text-h2">Available Rooms</h2>
            </div>
            <div className="grid lg:grid-cols-2 gap-f21">
              {rooms.map((room) => (
                <div
                  key={room.name}
                  className="flex flex-col p-f34 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]"
                >
                  <div className="flex items-start justify-between gap-f13 mb-f13">
                    <div>
                      <h3 className="text-h3">{room.name}</h3>
                      <p className="text-caption text-cambridge font-bold uppercase tracking-wider mt-f3">
                        {room.subtitle}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-h3 text-oxford [[data-theme=dark]_&]:text-cambridge font-bold">
                        {room.capacity}
                      </p>
                      <p className="text-caption text-text-tertiary">people</p>
                    </div>
                  </div>

                  <p className="text-body-sm text-text-secondary leading-relaxed flex-1">
                    {room.description}
                  </p>

                  <div className="mt-f21 pt-f21 border-t border-border-secondary">
                    <p className="text-caption text-text-tertiary uppercase tracking-wider mb-f8">
                      Best for
                    </p>
                    <p className="text-body-sm text-text-secondary">{room.best}</p>
                  </div>

                  <ul className="mt-f13 space-y-1.5">
                    {room.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-body-sm text-text-secondary"
                      >
                        <svg
                          className="w-4 h-4 text-cambridge shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Shared amenities */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="mb-f21">
            <p className="text-overline text-cambridge mb-f8">Included</p>
            <h2 className="text-h2">With Every Booking</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-f13">
            {amenities.map((a) => (
              <div
                key={a}
                className="flex items-center gap-3 p-f13 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
              >
                <svg
                  className="w-5 h-5 text-cambridge shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <p className="text-body-sm text-text-primary">{a}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* Hours + booking */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] overflow-hidden">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-f34 items-start">
              <div className="min-w-0">
                <p className="text-overline text-cambridge mb-f8">Availability</p>
                <h2 className="text-h2">Monday – Friday</h2>
                <p className="text-h3 text-cambridge mt-f3">7:30 AM – 5:30 PM</p>
                <p className="text-body text-text-secondary mt-f13">
                  Bookings outside these hours may be available by special
                  arrangement. Contact us to discuss your needs.
                </p>
              </div>
              <div>
                <p className="text-overline text-cambridge mb-f8">Book a Space</p>
                <h3 className="text-h3">Reserve a room</h3>
                <p className="text-body text-text-secondary mt-f13">
                  Email or call to check availability and request a room rental
                  agreement. Member pricing available for Greater Medina
                  Chamber members.
                </p>
                <div className="mt-f21 space-y-f13">
                  <a
                    href={mailto(memberServices.email)}
                    className="
                      block w-full text-center py-f13 px-f21
                      bg-accent hover:bg-accent-hover
                      text-white font-bold text-body-sm
                      rounded-[var(--radius-md)]
                      transition-colors
                    "
                  >
                    {memberServices.email} →
                  </a>
                  <a
                    href="tel:+13307238773"
                    className="
                      block w-full text-center py-f13 px-f21
                      border border-border-primary hover:border-text-tertiary
                      text-text-primary font-bold text-body-sm
                      rounded-[var(--radius-md)]
                      transition-colors
                    "
                  >
                    (330) 723-8773
                  </a>
                </div>
                <p className="text-caption text-text-tertiary mt-f13">
                  Not a member? Joining the chamber gives you access to member
                  pricing on rentals plus a full suite of business benefits.{" "}
                  <Link
                    href="/membership/join"
                    className="text-cambridge hover:text-cambridge/80 transition-colors font-bold"
                  >
                    Learn more →
                  </Link>
                </p>
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
      </section>
    </>
  );
}
