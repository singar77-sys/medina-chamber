import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { stephanie } from "@/data/staff";
import { mailto } from "@/lib/format";

export const metadata: Metadata = {
  title: "Annual Chamber Golf Outing",
  description:
    "The Greater Medina Chamber of Commerce Annual Golf Outing at Westfield Country Club. 18-hole scramble with lunch, on-course games, cocktail hour, and dinner. Chamber members $230, non-members $260.",
  openGraph: {
    title: "Annual Chamber Golf Outing | Greater Medina Chamber of Commerce",
    description:
      "The chamber's flagship outing at Westfield Country Club. 18-hole scramble, lunch, dinner, and networking with Medina County's business community.",
  },
  alternates: { canonical: "/programs/golf-outing" },
};

const schedule = [
  { time: "9:30 AM", label: "Check-in & Warm-up" },
  { time: "11:00 AM", label: "Shotgun Start" },
  { time: "4:00 PM", label: "Cocktail Hour & Dinner at Blair Center" },
];

const included = [
  "18 holes of golf with cart",
  "Pre-golf morning drink",
  "Boxed lunch",
  "On-course beer tickets",
  "On-course contests and games",
  "Skins and mulligans available",
  "Post-golf dinner",
  "Cash bar cocktail hour",
];

const pricing = [
  { tier: "Chamber Members", price: "$230", description: "Per golfer" },
  { tier: "Non-Members", price: "$260", description: "Per golfer" },
];

export default function GolfOutingPage() {
  // SportsEvent JSON-LD intentionally absent: schema.org Event requires
  // startDate, so the markup returns only once the next outing's date is
  // announced (the 2026 outing was held July 20).
  return (
    <>

      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted golf-ball-at-sunset backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/programs/golf-outing/medina-chamber-golf-outing-hero.webp"
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
            <p className="text-overline text-cambridge mb-f8">Annual Event</p>
            <h1 className="text-display">
              <span className="block">Chamber</span>
              <span className="block text-accent">Golf Outing</span>
            </h1>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              The premier networking event on the Medina County business calendar.
              18 holes, great food, on-course games, and a room full of people worth
              knowing.
            </p>
            <div className="mt-f21 flex flex-wrap gap-f13">
            <Link
              href="/events"
              className="
                inline-flex items-center px-f21 py-f13
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              See Upcoming Events →
            </Link>
            <a
              href={mailto(stephanie.email)}
              className="
                inline-flex items-center px-f21 py-f13
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Ask About Next Year
            </a>
            </div>
          </div>
        </div>
      </section>

      {/* Event details */}
      <section className="rule-top mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          {/* Info strip — gap-f21 between 3 cards */}
          <div className="grid sm:grid-cols-3 gap-f21">
            {[
              { label: "When", value: "Annual — 2027 date\nto be announced" },
              { label: "Venue", value: "Westfield Country Club\nWestfield Center, OH" },
              { label: "Format", value: "18-Hole Shotgun Scramble" },
            ].map((item) => (
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
            {/* Schedule */}
            <div>
              <h2 className="text-overline text-cambridge mb-f21">Typical Day-of Schedule</h2>
              <div className="space-y-f13">
                {schedule.map((s, i) => (
                  <div key={i} className="flex items-start gap-f13">
                    <div className="w-24 shrink-0 pt-f3">
                      <span className="text-body-sm font-bold text-cambridge">{s.time}</span>
                    </div>
                    <div className="flex-1 pb-f13 border-b border-border-secondary last:border-0">
                      <p className="text-body text-text-primary">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* What's Included */}
            <div>
              <h2 className="text-overline text-cambridge mb-f21">What&apos;s Included</h2>
              <ul className="space-y-f8">
                {included.map((item) => (
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
        </FadeIn>
      </section>

      {/* Pricing */}
      <section className="relative overflow-hidden bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        {/* Ghosted golfers-teeing-up backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/programs/golf-outing/medina-chamber-golf-outing-pricing.webp"
            alt=""
            fill
            className="object-cover opacity-[0.33]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-overline text-cambridge mb-f21">Pricing</h2>
            <div className="grid sm:grid-cols-2 gap-f21 max-w-2xl">
              {pricing.map((p) => (
                <div
                  key={p.tier}
                  className="p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]"
                >
                  <p className="text-caption text-text-tertiary uppercase tracking-wider">
                    {p.tier}
                  </p>
                  <p className="text-display mt-f8">{p.price}</p>
                  <p className="text-body-sm text-text-secondary mt-f3">{p.description}</p>
                </div>
              ))}
            </div>

          </FadeIn>
        </div>
      </section>

      {/* Sponsorship CTA */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <p className="text-overline text-cambridge mb-f8">Sponsorship</p>
                <h2 className="text-h2">Put Your Brand on the Course</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Sponsorship packages are available at a range of investment levels, 
                  from hole sponsorships to presenting sponsorship. Maximum visibility
                  with Medina County&apos;s business community in one room.
                </p>
              </div>
              <div>
                <p className="text-body text-text-secondary">
                  Contact{" "}
                  <span className="font-bold text-text-primary">Stephanie Mueller</span>{" "}
                  to learn about available packages.
                </p>
                <div className="mt-f13 flex flex-wrap gap-f13">
                  <a
                    href={mailto(stephanie.email)}
                    className="
                      inline-flex items-center px-f21 py-f13
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
                      inline-flex items-center px-f21 py-f13
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
          </div>
        </FadeIn>
      </section>
    </>
  );
}
