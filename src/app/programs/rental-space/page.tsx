import type { Metadata } from "next";
import Link from "next/link";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Rental Space",
  description:
    "The Greater Medina Chamber of Commerce offers two professional meeting spaces for rent in downtown Medina — The Vault conference room (up to 16) and the Main Room training space (up to 50). Free parking, Wi-Fi, and AV included.",
  openGraph: {
    title: "Rental Space — Greater Medina Chamber of Commerce",
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
      "A private, closed-door meeting space featuring the chamber's distinctive vault door — professional, memorable, and perfectly sized for focused collaboration.",
    features: ["Private room with vault door", "Flat screen TV", "Whiteboard", "Seats up to 16"],
  },
  {
    name: "Main Room",
    subtitle: "Training & Seminar Space",
    capacity: "Up to 50",
    best: "Workshops, seminars, training sessions, larger team meetings",
    description:
      "A spacious, flexible room with configurable table arrangements to fit your event — from classroom-style training to panel discussions to all-hands meetings.",
    features: ["Flexible table configurations", "Flat screen TV", "Presentation-ready setup", "Seats up to 50"],
  },
];

const amenities = [
  "Tables and chairs",
  "Flat screen TV / display",
  "High-speed Wi-Fi",
  "Coffee station",
  "Free on-site parking",
  "City Hall garage nearby",
  "First-floor access",
  "Downtown Medina location",
];

export default function RentalSpacePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Greater Medina Chamber of Commerce — Meeting & Event Space",
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
    email: "memberservices@medinaohchamber.com",
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
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Programs</p>
        <h1 className="text-display">
          Meeting
          <br />
          <span className="text-accent">Space</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Professional meeting and event space in the heart of downtown Medina.
          Two rooms. Free parking. Everything you need already there.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="mailto:memberservices@medinaohchamber.com"
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
      </section>

      {/* Location banner */}
      <section className="mt-16 p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex-1">
          <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-1">
            Location
          </p>
          <p className="text-h3">Greater Medina Chamber of Commerce</p>
          <p className="text-text-secondary text-body mt-1">
            139 N. Court Street, Suite A · Medina, OH 44256
          </p>
          <p className="text-text-tertiary text-body-sm mt-1">
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
      </section>

      {/* Rooms */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">Available Spaces</h2>
        <div className="grid lg:grid-cols-2 gap-8">
          {rooms.map((room) => (
            <div
              key={room.name}
              className="flex flex-col p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-h3">{room.name}</h3>
                  <p className="text-caption text-cambridge font-bold uppercase tracking-wider mt-1">
                    {room.subtitle}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-h3 text-oxford [[data-theme=dark]_&]:text-cambridge font-bold">{room.capacity}</p>
                  <p className="text-caption text-text-tertiary">people</p>
                </div>
              </div>

              <p className="text-body-sm text-text-secondary leading-relaxed flex-1">
                {room.description}
              </p>

              <div className="mt-5 pt-5 border-t border-border-secondary">
                <p className="text-caption text-text-tertiary uppercase tracking-wider mb-3">
                  Best for
                </p>
                <p className="text-body-sm text-text-secondary">{room.best}</p>
              </div>

              <ul className="mt-4 space-y-1.5">
                {room.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-body-sm text-text-secondary">
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
      </section>

      {/* Shared amenities */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">Included With Every Booking</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {amenities.map((a) => (
            <div
              key={a}
              className="flex items-center gap-3 p-4 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
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
      </section>

      {/* Hours + booking */}
      <section className="mt-20 p-6 sm:p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] overflow-hidden">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10 items-start">
          <div className="min-w-0">
            <p className="text-overline text-cambridge mb-3">Availability</p>
            <h2 className="text-h2">Monday – Friday</h2>
            <p className="text-h3 text-cambridge mt-2">7:30 AM – 5:30 PM</p>
            <p className="text-body text-text-secondary mt-4">
              Bookings outside these hours may be available by special arrangement.
              Contact us to discuss your needs.
            </p>
          </div>
          <div>
            <h3 className="text-h3">Book a Space</h3>
            <p className="text-body text-text-secondary mt-3">
              Email or call to check availability and request a room rental
              agreement. Member pricing available for Greater Medina Chamber
              members.
            </p>
            <div className="mt-6 space-y-3">
              <a
                href="mailto:memberservices@medinaohchamber.com"
                className="
                  block w-full text-center py-3 px-6
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                memberservices@medinaohchamber.com →
              </a>
              <a
                href="tel:+13307238773"
                className="
                  block w-full text-center py-3 px-6
                  border border-border-primary hover:border-text-tertiary
                  text-text-primary font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                (330) 723-8773
              </a>
            </div>
            <p className="text-caption text-text-tertiary mt-4">
              Not a member? Joining the chamber gives you access to member pricing on rentals plus
              a full suite of business benefits.{" "}
              <Link href="/membership/join" className="text-cambridge hover:text-cambridge/80 transition-colors font-bold">
                Learn more →
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
