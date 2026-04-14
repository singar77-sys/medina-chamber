import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { events, getEventBySlug, eventMetaDescription } from "@/data/events";

// ── Static generation ──────────────────────────────────────────────────────
export function generateStaticParams() {
  return events.map((e) => ({ slug: e.slug }));
}

// ── Per-page metadata ──────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) return { title: "Event Not Found" };

  const description = eventMetaDescription(event);

  return {
    title: event.title,
    description,
    openGraph: {
      title: `${event.title} | Medina Chamber Events`,
      description,
      ...(event.image && { images: [{ url: event.image }] }),
    },
    alternates: { canonical: `/events/${slug}` },
  };
}

// ── Page component ─────────────────────────────────────────────────────────
export default async function EventPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();

  // JSON-LD Event schema for Google rich results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: `${event.dateISO}T${to24h(event.startTime)}`,
    endDate: `${event.dateISO}T${to24h(event.endTime)}`,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: "Greater Medina Chamber of Commerce",
      address: {
        "@type": "PostalAddress",
        streetAddress: event.street,
        addressLocality: event.city,
        addressRegion: event.state,
        postalCode: event.zip,
        addressCountry: "US",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      url: "https://medinachamber.com",
    },
    url: `https://medinachamber.com/events/${slug}`,
    ...(event.image && { image: event.image }),
    ...(event.pricing && {
      offers: {
        "@type": "Offer",
        description: event.pricing.split("\n")[0],
        url: event.registerUrl,
        availability: "https://schema.org/InStock",
      },
    }),
  };

  const pricingLines = event.pricing
    ? event.pricing.split("\n").filter(Boolean)
    : [];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://medinachamber.com" },
      { "@type": "ListItem", position: 2, name: "Events", item: "https://medinachamber.com/events" },
      { "@type": "ListItem", position: 3, name: event.title },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-caption text-text-tertiary mb-10">
          <Link href="/events" className="hover:text-text-primary transition-colors">
            Events
          </Link>
          <span>/</span>
          <span className="text-text-secondary truncate">{event.title}</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_360px] gap-12 lg:gap-16">
          {/* ── Main column ── */}
          <div>
            {/* Event label */}
            <p className="text-overline text-cambridge mb-4">
              {event.dayOfWeek}, {event.month} {event.day}, {event.year}
            </p>

            {/* Title */}
            <h1 className="text-display leading-tight">{event.title}</h1>

            {/* Time */}
            <p className="text-h4 text-text-secondary mt-4">
              {event.startTime} – {event.endTime}
            </p>

            {/* Image */}
            {event.image && (
              <div className="mt-8 rounded-[var(--radius-lg)] overflow-hidden border border-border-secondary">
                <Image
                  src={event.image}
                  alt={event.title}
                  width={720}
                  height={360}
                  className="object-contain w-full max-h-72 bg-bg-secondary"
                />
              </div>
            )}

            {/* Location */}
            <div className="mt-10">
              <h2 className="text-h3 mb-4">Location</h2>
              <div className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
                <p className="text-body font-semibold">Greater Medina Chamber of Commerce</p>
                <p className="text-body-sm text-text-secondary mt-1">{event.street}</p>
                <p className="text-body-sm text-text-secondary">
                  {event.city}, {event.state} {event.zip}
                </p>
                {event.locationDesc && (
                  <p className="text-body-sm text-text-tertiary mt-3 border-t border-border-secondary pt-3">
                    {event.locationDesc}
                  </p>
                )}
              </div>
            </div>

            {/* Pricing */}
            {pricingLines.length > 0 && (
              <div className="mt-10">
                <h2 className="text-h3 mb-4">Pricing & Registration</h2>
                <div className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
                  {pricingLines.map((line, i) => (
                    <p
                      key={i}
                      className={
                        i === 0
                          ? "text-body font-semibold"
                          : i <= 1
                          ? "text-body-sm text-text-secondary mt-1"
                          : "text-caption text-text-tertiary mt-3 border-t border-border-secondary pt-3"
                      }
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Contact */}
            {event.contactName && (
              <div className="mt-10">
                <h2 className="text-h3 mb-4">Questions?</h2>
                <p className="text-body-sm text-text-secondary">
                  Contact{" "}
                  <span className="font-semibold text-text-primary">
                    {event.contactName}
                  </span>
                  {event.contactPhone && ` at ${event.contactPhone}`}.
                </p>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="space-y-6">
            {/* Register CTA card */}
            <div className="sticky top-8 p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
              <div className="text-center mb-5">
                <div className="inline-block bg-cambridge/20 px-3 py-1 rounded-full text-cambridge text-caption font-bold mb-3">
                  {event.month.substring(0, 3)} {event.day}
                </div>
                <p className="text-body font-semibold text-text-primary">{event.startTime} – {event.endTime}</p>
              </div>

              <a
                href={event.registerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  block w-full text-center py-3 px-6
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Register Now →
              </a>

              <p className="text-caption text-text-tertiary text-center mt-3">
                Registration handled securely via GrowthZone
              </p>

              {pricingLines[0] && (
                <p className="text-caption text-cambridge text-center mt-2 font-bold">
                  {pricingLines[0]}
                </p>
              )}
            </div>

            {/* Back to all events */}
            <Link
              href="/events"
              className="
                flex items-center justify-center gap-2 w-full py-3 px-6
                border border-border-secondary hover:border-border-primary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              ← All Events
            </Link>

          </aside>
        </div>
      </div>
    </>
  );
}

/** Convert "8:30 AM" → "08:30:00" for JSON-LD */
function to24h(time: string): string {
  if (!time) return "00:00:00";
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return "00:00:00";
  let [, h, m, ampm] = match;
  let hour = parseInt(h);
  if (ampm.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${m}:00`;
}
