import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ButtonA, ButtonLink } from "@/components/ui/Button";
import { notFound } from "next/navigation";
import { events, getEventBySlug, eventMetaDescription } from "@/data/events";
import { getCmsEventData } from "@/lib/cms-store";
import { getEventGraphicRenderer } from "@/components/events/graphics/registry";
import { FluidGraphicFrame } from "@/components/events/graphics/FluidGraphicFrame";
import { getEventPhotosWithFallback } from "@/lib/media-store";
import { EventGallery } from "@/components/events/EventGallery";

import { safeJsonLd } from "@/lib/json-ld";

// Allow CMS-managed slugs added after build
export const dynamicParams = true;

// ── Static generation ──────────────────────────────────────────────────────
export function generateStaticParams() {
  return events.map((e) => ({ slug: e.slug }));
}

// ── Per-page metadata ──────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const base = getEventBySlug(slug);
  if (!base) return { title: "Event Not Found" };
  const override = await getCmsEventData(slug);
  const event = override ? { ...base, ...override } : base;

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
  {
    params,
  }: {
    params: Promise<{ slug: string }>;
  }
) {
  const { slug } = await params;
  const base = getEventBySlug(slug);
  if (!base) notFound();
  const [override, photos] = await Promise.all([
    getCmsEventData(slug),
    getEventPhotosWithFallback(slug),
  ]);
  const event = override ? { ...base, ...override } : base;

  // Events scraped without structured date fields (blank dateISO/month/day)
  // still carry a human-readable dateString — fall back to it so the page
  // never renders ", 0, 0".
  const dateText = event.dateISO
    ? `${event.dayOfWeek}, ${event.month} ${event.day}, ${event.year}`
    : event.dateString;

  // Only name the venue when we actually know it: an explicit `venue` field,
  // or the street matching the chamber office at 139 N Court St. Off-site
  // events get an address-only location rather than a wrong venue name.
  const isChamberOffice = /139\s+N(?:orth|\.)?\s*\.?\s*Court\s+St/i.test(event.street);
  const venueName =
    event.venue ?? (isChamberOffice ? "Greater Medina Chamber of Commerce" : undefined);

  // JSON-LD Event schema for Google rich results.
  // startDate/endDate/eventStatus are only emitted when the event has a real
  // calendar date — a blank dateISO would otherwise yield an invalid
  // "T00:00:00" startDate that Google rejects.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    ...(event.dateISO && {
      startDate: `${event.dateISO}T${to24h(event.startTime)}`,
      // Omit endDate when endTime is missing — to24h would fall back to
      // "00:00:00" and emit an endDate at midnight BEFORE the startDate.
      ...(event.endTime && { endDate: `${event.dateISO}T${to24h(event.endTime)}` }),
      eventStatus: "https://schema.org/EventScheduled",
    }),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      ...(venueName && { name: venueName }),
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
    ...(event.image && {
      image: {
        "@type": "ImageObject",
        url: event.image.startsWith("http")
          ? event.image
          : `https://medinachamber.com${event.image}`,
        caption: `${event.title}, Greater Medina Chamber of Commerce event in Medina, Ohio`,
      },
    }),
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

  const Graphic = getEventGraphicRenderer(event);

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
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />

      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-f89 pb-f89 lg:pb-f144">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-caption text-text-tertiary mb-f21">
          <Link href="/events" className="hover:text-text-primary transition-colors">
            Events
          </Link>
          <span>/</span>
          <span className="text-text-secondary truncate">{event.title}</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_360px] gap-f34 lg:gap-f55">
          {/* Main column */}
          <article>
            <p className="text-overline text-cambridge mb-f8">
              {dateText}
            </p>

            <h1 className="text-display leading-tight">{event.title}</h1>

            {event.startTime && (
              <p className="text-h4 text-text-secondary mt-f8">
                {event.startTime}
                {event.endTime ? ` – ${event.endTime}` : ""}
              </p>
            )}

            {/* Hero — prefer the branded SVG graphic; fall back to the
                cloudinary event image only if the slug doesn't map to one
                of the 11 graphic templates. */}
            {Graphic ? (
              <figure className="mt-f21 rounded-[var(--radius-lg)] overflow-hidden border border-border-secondary m-0">
                <FluidGraphicFrame mode="social">
                  <Graphic mode="social" />
                </FluidGraphicFrame>
                <figcaption className="sr-only">
                  {event.title}, Greater Medina Chamber of Commerce event on {dateText} in Medina, Ohio
                </figcaption>
              </figure>
            ) : event.image ? (
              <figure className="mt-f21 rounded-[var(--radius-lg)] overflow-hidden border border-border-secondary m-0">
                <Image
                  src={event.image}
                  alt={`${event.title}, ${dateText} at the Greater Medina Chamber of Commerce in Medina, Ohio`}
                  width={720}
                  height={360}
                  className="object-contain w-full max-h-72 bg-bg-secondary"
                />
                <figcaption className="sr-only">
                  {event.title}, Greater Medina Chamber of Commerce event on {dateText} in Medina, Ohio
                </figcaption>
              </figure>
            ) : null}

            {/* Location */}
            <div className="mt-f34">
              <h2 className="text-h3 mb-f13">Location</h2>
              <div className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
                {venueName && (
                  <p className="text-body font-bold">{venueName}</p>
                )}
                <p className="text-body-sm text-text-secondary mt-f3">
                  {event.street}
                </p>
                <p className="text-body-sm text-text-secondary">
                  {event.city}, {event.state} {event.zip}
                </p>
                {event.locationDesc && (
                  <p className="text-body-sm text-text-tertiary mt-f13 border-t border-border-secondary pt-f13">
                    {event.locationDesc}
                  </p>
                )}
              </div>
            </div>

            {/* Pricing */}
            {pricingLines.length > 0 && (
              <div className="mt-f34">
                <h2 className="text-h3 mb-f13">Pricing & Registration</h2>
                <div className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
                  {pricingLines.map((line, i) => (
                    <p
                      key={i}
                      className={
                        i === 0
                          ? "text-body font-bold"
                          : i <= 1
                          ? "text-body-sm text-text-secondary mt-f3"
                          : "text-caption text-text-tertiary mt-f13 border-t border-border-secondary pt-f13"
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
              <div className="mt-f34">
                <h2 className="text-h3 mb-f13">Questions?</h2>
                <p className="text-body-sm text-text-secondary">
                  Contact{" "}
                  <span className="font-bold text-text-primary">
                    {event.contactName}
                  </span>
                  {event.contactPhone && ` at ${event.contactPhone}`}.
                </p>
              </div>
            )}

            {/* Photo gallery */}
            {photos.length > 0 && (
              <div className="mt-f34">
                <EventGallery photos={photos} title="Event Photos" />
              </div>
            )}
          </article>

          {/* Sidebar */}
          <aside className="space-y-f21">
            <div className="sticky top-f21 p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
              <div className="text-center mb-f13">
                <div className="inline-block bg-cambridge/20 px-3 py-1 rounded-full text-cambridge text-caption font-bold mb-f8">
                  {event.dateISO
                    ? `${event.month.substring(0, 3)} ${event.day}`
                    : event.dateString}
                </div>
                {event.startTime && (
                  <p className="text-body font-bold text-text-primary">
                    {event.startTime}
                    {event.endTime ? ` – ${event.endTime}` : ""}
                  </p>
                )}
              </div>

              {/* Registration is handled in GrowthZone (the live system of record).
                  The internal on-site registration flow stays dormant until the
                  GrowthZone cutover. */}
              <ButtonA
                href={event.registerUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="md"
                className="w-full justify-center"
              >
                Register Now →
              </ButtonA>
              <p className="text-caption text-text-tertiary text-center mt-f8">
                Registration handled securely via GrowthZone
              </p>

              {pricingLines[0] && (
                <p className="text-caption text-cambridge text-center mt-f3 font-bold">
                  {pricingLines[0]}
                </p>
              )}
            </div>

            <ButtonLink href="/events" variant="ghost" size="md" className="w-full justify-center gap-2">
              ← All Events
            </ButtonLink>
          </aside>
        </div>
      </section>
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
