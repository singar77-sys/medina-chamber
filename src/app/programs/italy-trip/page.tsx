import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { safeJsonLd } from "@/lib/json-ld";
import { stephanie } from "@/data/staff";
import { mailto } from "@/lib/format";

const BOOKING_URL = "https://groups.gocollette.com/en-US/link/1446404";
const BOOK_BY = "April 11, 2027";

export const metadata: Metadata = {
  title: "Reflections of Italy — Chamber Group Travel",
  description:
    "Join the Greater Medina Chamber of Commerce on a 10-day trip to Italy, October 10-19, 2027. Rome, the Vatican, Assisi, Cortona, Florence, Chianti, and Venice with Collette. From $5,999 per person if booked by April 11, 2027.",
  openGraph: {
    title: "Reflections of Italy — Chamber Group Travel | Greater Medina Chamber of Commerce",
    description:
      "A 10-day chamber group trip to Italy, October 10-19, 2027, presented by Collette. Rome, the Vatican, Cortona, Florence, Chianti, and Venice. From $5,999 per person.",
  },
  alternates: { canonical: "/programs/italy-trip" },
};

const itineraryStops = [
  "Rome",
  "Vatican Museums & Sistine Chapel",
  "Orvieto",
  "Assisi",
  "Perugia",
  "Cortona",
  "Florence",
  "Chianti",
  "Venice",
  "Murano Island",
];

const highlights = [
  "Boat trip to Murano Island with a glass-blowing demonstration",
  "Olive oil tasting at an Umbrian countryside mill",
  "Cortona village exploration — the Under the Tuscan Sun setting",
  "Chianti winery visit and cooking class",
  "Vatican Museums, Sistine Chapel, and St. Peter's Basilica",
];

const tripFacts = [
  { label: "Dates", value: "October 10–19, 2027" },
  { label: "Duration", value: "10 Days" },
  { label: "Price", value: `From $5,999 / person\nBook by ${BOOK_BY}` },
];

const dayByDay = [
  { day: "1", label: "Overnight flight to Italy." },
  { day: "2", label: "Arrive in Rome. Free day, welcome dinner in the evening." },
  { day: "3", label: "Guided tour of the Vatican Museums, Sistine Chapel, and St. Peter's Basilica." },
  { day: "4", label: "Travel from Rome to Orvieto, then on to Perugia for the night." },
  { day: "5", label: "Guided tour of Assisi, then an olive mill visit and dinner in the Umbrian countryside." },
  { day: "6", label: "Through Tuscany to Cortona, ending the day in Florence." },
  { day: "7", label: "Walking tour of Florence — the Duomo, Baptistery, and Piazza della Signoria." },
  { day: "8", label: "Chianti winery visit and cooking class, then on to Venice." },
  { day: "9", label: "Boat trip to Murano Island for a glass-blowing demonstration, then a Venice walking tour and farewell dinner." },
  { day: "10", label: "Tour ends in Venice." },
];

const pricing = [
  { tier: "Double", price: "$5,999", was: "$6,349" },
  { tier: "Single", price: "$7,199", was: "$7,549" },
  { tier: "Triple", price: "$5,899", was: "$6,249" },
];

const addOns = [
  { name: "Tuscan Feast (Florence)", price: "$129 / person", description: "After-hours monastery visit and a family-style Tuscan dinner with entertainment." },
  { name: "Venetian Serenaded Gondola Cruise", price: "$79 / person", description: "A serenaded gondola ride along Venice's Grand Canal and smaller side canals." },
  { name: "Roman Serenade (Rome)", price: "$129 / person", description: "Dinner and live folk music in Trastevere." },
];

export default function ItalyTripPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Reflections of Italy — Greater Medina Chamber of Commerce Group Travel",
    description:
      "A 10-day chamber group trip to Italy presented by Collette: Rome, the Vatican, Orvieto, Assisi, Perugia, Cortona, Florence, Chianti, Venice, and Murano Island.",
    startDate: "2027-10-10",
    endDate: "2027-10-19",
    organizer: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      url: "https://medinachamber.com",
    },
    offers: [
      { "@type": "Offer", name: "Double Occupancy", price: "5999", priceCurrency: "USD", url: BOOKING_URL, validThrough: "2027-04-11" },
      { "@type": "Offer", name: "Single Occupancy", price: "7199", priceCurrency: "USD", url: BOOKING_URL, validThrough: "2027-04-11" },
      { "@type": "Offer", name: "Triple Occupancy", price: "5899", priceCurrency: "USD", url: BOOKING_URL, validThrough: "2027-04-11" },
    ],
    url: "https://medinachamber.com/programs/italy-trip",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted Italy trip backdrop — TODO: swap in real photo at this path */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/programs/italy-trip/medina-chamber-italy-trip-hero.webp"
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
            <p className="text-overline text-cambridge mb-f8">Group Travel</p>
            <h1 className="text-display">
              <span className="block">Reflections</span>
              <span className="block text-accent">of Italy</span>
            </h1>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              Join fellow Chamber members on a 10-day journey through Italy —
              Rome, the Vatican, the Umbrian countryside, Tuscany, and Venice —
              presented in partnership with Collette. An optional 2-night Rome
              pre-tour extension is also available.
            </p>
            <p className="text-body-sm font-bold text-accent mt-f13">
              Book by {BOOK_BY} to save $350 per person.
            </p>
            <div className="mt-f21 flex flex-wrap gap-f13">
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-flex items-center px-f21 py-f13
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Reserve Your Spot →
              </a>
              <Link
                href="/events"
                className="
                  inline-flex items-center px-f21 py-f13
                  border border-border-primary hover:border-text-tertiary
                  text-text-primary font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                All Events
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trip details */}
      <section className="rule-top mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="grid sm:grid-cols-3 gap-f21">
            {tripFacts.map((item) => (
              <div
                key={item.label}
                className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] text-center"
              >
                <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-f8">
                  {item.label}
                </p>
                <p className="text-body font-bold text-text-primary whitespace-pre-line">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-f34 grid lg:grid-cols-2 gap-f34">
            {/* Itinerary */}
            <div>
              <h2 className="text-overline text-cambridge mb-f21">Where You&apos;ll Go</h2>
              <div className="flex flex-wrap gap-f8">
                {itineraryStops.map((stop) => (
                  <span
                    key={stop}
                    className="px-f13 py-f5 text-body-sm text-text-primary bg-bg-secondary border border-border-secondary rounded-[var(--radius-md)]"
                  >
                    {stop}
                  </span>
                ))}
              </div>
              <p className="text-body-sm text-text-tertiary mt-f13">
                Travel style: Classic · Activity level: 3 — Active (2–3 hour
                walking tours, up to four miles daily, stairs, and varied
                transportation) · 12 meals included (8 breakfasts, 1 lunch, 3
                dinners) · Travels with an average of 37 people, maximum 44.
              </p>
            </div>

            {/* Highlights */}
            <div>
              <h2 className="text-overline text-cambridge mb-f21">Trip Highlights</h2>
              <ul className="space-y-f8">
                {highlights.map((item) => (
                  <li key={item} className="flex items-start gap-f8 text-body text-text-primary">
                    <svg aria-hidden="true" className="w-5 h-5 text-cambridge mt-f3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Day-by-day */}
          <div className="mt-f34">
            <h2 className="text-overline text-cambridge mb-f21">Day-by-Day</h2>
            <div className="grid sm:grid-cols-2 gap-x-f34 gap-y-f13">
              {dayByDay.map((d) => (
                <div key={d.day} className="flex items-start gap-f13">
                  <div className="w-16 shrink-0">
                    <span className="text-body-sm font-bold text-cambridge">Day {d.day}</span>
                  </div>
                  <p className="flex-1 text-body-sm text-text-secondary pb-f8 border-b border-border-secondary">
                    {d.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Pricing */}
      <section className="relative overflow-hidden bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-overline text-cambridge mb-f21">Pricing</h2>
            <div className="grid sm:grid-cols-3 gap-f21 max-w-3xl">
              {pricing.map((p) => (
                <div
                  key={p.tier}
                  className="p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]"
                >
                  <p className="text-caption text-text-tertiary uppercase tracking-wider">
                    {p.tier}
                  </p>
                  <p className="text-h1 mt-f8 whitespace-nowrap">{p.price}</p>
                  <p className="text-body-sm text-text-tertiary mt-f3 line-through">{p.was}</p>
                </div>
              ))}
            </div>

            <div className="mt-f21 max-w-3xl p-f13 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)] space-y-f8">
              <p className="text-body-sm text-text-secondary leading-relaxed">
                <span className="font-bold text-text-primary">Included: </span>
                Round-trip air from Cleveland Hopkins International Airport,
                air taxes and fees, and hotel transfers.
              </p>
              <p className="text-body-sm text-text-secondary leading-relaxed">
                <span className="font-bold text-text-primary">Not included: </span>
                Optional Cancellation Waiver &amp; Travel Protection Plan ($599 per
                person, recommended). A Business Class airfare upgrade is
                available for an additional $4,690.
              </p>
              <p className="text-body-sm text-text-secondary leading-relaxed">
                <span className="font-bold text-text-primary">Deposit &amp; payment: </span>
                A $698 per-person deposit is due at reservation and is fully
                refundable through {BOOK_BY}. Final payment is due July 12,
                2027. Reservations made after the seat-reduction date of
                April 4, 2027 are based on availability.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Add-ons + extension */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <h2 className="text-overline text-cambridge mb-f21">Optional Add-Ons</h2>
          <div className="grid md:grid-cols-3 gap-f21">
            {addOns.map((a) => (
              <div
                key={a.name}
                className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
              >
                <p className="text-body font-bold text-text-primary">{a.name}</p>
                <p className="text-body-sm font-bold text-cambridge mt-f3">{a.price}</p>
                <p className="text-body-sm text-text-secondary mt-f8 leading-relaxed">
                  {a.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-f21 p-f21 bg-oxford border border-cambridge/30 rounded-[var(--radius-lg)]">
            <p className="text-caption font-bold text-cambridge uppercase tracking-wider mb-f8">
              Extend Your Vacation
            </p>
            <p className="text-h4 text-white">Optional 2-Night Rome Pre-Tour Extension</p>
            <p className="text-body-sm text-white/80 mt-f8 leading-relaxed">
              Four days / two nights in Rome before the main tour begins,
              including guided walking tours of the Colosseum and Imperial
              Fora, plus Renaissance and Baroque Rome — the Spanish Steps,
              Trevi Fountain, and the Pantheon. Two breakfasts included.
            </p>
            <p className="text-body font-bold text-white mt-f13">
              $1,299 double / $1,599 single, land only
            </p>
          </div>
        </FadeIn>
      </section>

      {/* Booking */}
      <section className="relative overflow-hidden bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="p-f34 lg:p-f55 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]">
              <div className="grid lg:grid-cols-2 gap-f34 items-center">
                <div>
                  <p className="text-overline text-cambridge mb-f8">Booking</p>
                  <h2 className="text-h2">Reserve Your Spot</h2>
                  <p className="text-body-lg text-text-secondary mt-f13">
                    This trip is booked and operated by Collette, the chamber&apos;s
                    group travel partner. Seats are limited to the group size
                    Collette has reserved for the chamber, so reserve early.
                  </p>
                </div>
                <div>
                  <p className="text-body text-text-secondary">
                    Booking questions go to{" "}
                    <span className="font-bold text-text-primary">Catherine Hawk</span>{" "}
                    (Collette), booking #1446404.
                  </p>
                  <div className="mt-f13 flex flex-wrap gap-f13">
                    <a
                      href={BOOKING_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        inline-flex items-center px-f21 py-f13
                        bg-accent hover:bg-accent-hover
                        text-white font-bold text-body-sm
                        rounded-[var(--radius-md)]
                        transition-colors
                      "
                    >
                      Reserve Your Spot →
                    </a>
                    <a
                      href="tel:+17343087962"
                      className="
                        inline-flex items-center px-f21 py-f13
                        border border-border-primary hover:border-text-tertiary
                        text-text-primary font-bold text-body-sm
                        rounded-[var(--radius-md)]
                        transition-colors
                      "
                    >
                      (734) 308-7962
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Chamber contact CTA */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <h2 className="text-h2">Questions About the Trip?</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  For general questions about this chamber-organized trip, reach
                  out to the chamber directly. For booking, payment, and travel
                  logistics, Collette&apos;s booking contact above is the fastest path.
                </p>
              </div>
              <div className="space-y-f13">
                <a
                  href={mailto(stephanie.email)}
                  className="
                    block w-full text-center py-f13 px-f21
                    bg-accent hover:bg-accent-hover
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Email Stephanie →
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
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Legal disclosure — required Seller of Travel registration numbers */}
      <p className="mx-auto max-w-7xl px-6 lg:px-8 pb-f34 text-caption text-text-tertiary">
        Travel arrangements for Reflections of Italy are booked, operated, and
        sold by Collette. CST# 2006766-20 · UBN# 601220855 · Nevada Sellers of
        Travel Registration No. 2003-0279. A passport valid at least 6 months
        beyond your travel dates is required.
      </p>
    </>
  );
}
