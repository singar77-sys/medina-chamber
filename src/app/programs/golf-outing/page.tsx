import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Annual Chamber Golf Outing",
  description:
    "The Greater Medina Chamber of Commerce Annual Golf Outing — Monday, July 20, 2026 at Westfield Country Club. 18-hole scramble with lunch, on-course games, cocktail hour, and dinner. Chamber members $230, non-members $260.",
  openGraph: {
    title: "Annual Chamber Golf Outing 2026 — Greater Medina Chamber of Commerce",
    description:
      "July 20, 2026 at Westfield Country Club. 18-hole scramble, lunch, dinner, and networking with Medina County's business community.",
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
  {
    tier: "Chamber Members",
    price: "$230",
    description: "Per golfer",
  },
  {
    tier: "Non-Members",
    price: "$260",
    description: "Per golfer",
  },
];

export default function GolfOutingPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Annual Event</p>
        <h1 className="text-display">
          Chamber
          <br />
          <span className="text-accent">Golf Outing</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          The premier networking event on the Medina County business calendar.
          18 holes, great food, on-course games, and a room full of people worth
          knowing.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="https://business.medinachamber.com/ap/Events/Register/07FA922CxCwCR"
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center px-8 py-4
              bg-accent hover:bg-accent-hover
              text-white font-bold text-body
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            Register Now →
          </a>
          <Link
            href="/events"
            className="
              inline-flex items-center px-6 py-4
              border border-border-primary hover:border-text-tertiary
              text-text-primary font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            All Events
          </Link>
        </div>
      </section>

      {/* Date / location banner */}
      <section className="mt-16 grid sm:grid-cols-3 gap-4">
        {[
          { label: "Date", value: "Monday, July 20, 2026" },
          { label: "Venue", value: "Westfield Country Club\nWestfield Center, OH" },
          { label: "Format", value: "18-Hole Shotgun Scramble" },
        ].map((item) => (
          <div
            key={item.label}
            className="p-6 bg-oxford text-white rounded-[var(--radius-lg)] text-center"
          >
            <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-2">
              {item.label}
            </p>
            <p className="text-body font-semibold whitespace-pre-line">{item.value}</p>
          </div>
        ))}
      </section>

      {/* Schedule + What's included */}
      <section className="mt-20 grid lg:grid-cols-2 gap-12">
        <div>
          <h2 className="text-overline text-cambridge mb-8">Day-of Schedule</h2>
          <div className="space-y-4">
            {schedule.map((s, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-24 shrink-0 pt-0.5">
                  <span className="text-body-sm font-bold text-cambridge">{s.time}</span>
                </div>
                <div className="flex-1 pb-4 border-b border-border-secondary last:border-0">
                  <p className="text-body text-text-primary">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-body-sm text-text-tertiary mt-6">
            Note: Dinner and cocktail hour will be held at Blair Center this
            year due to clubhouse construction at Westfield Country Club.
          </p>
        </div>

        <div>
          <h2 className="text-overline text-cambridge mb-8">What&apos;s Included</h2>
          <ul className="space-y-3">
            {included.map((item) => (
              <li key={item} className="flex items-start gap-3 text-body text-text-primary">
                <svg className="w-5 h-5 text-cambridge mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">Pricing</h2>
        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl">
          {pricing.map((p) => (
            <div
              key={p.tier}
              className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <p className="text-caption text-text-tertiary uppercase tracking-wider">{p.tier}</p>
              <p className="text-display mt-2">{p.price}</p>
              <p className="text-body-sm text-text-secondary mt-1">{p.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 max-w-2xl p-5 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
          <p className="text-body-sm text-text-secondary leading-relaxed">
            <span className="font-semibold text-text-primary">Refund policy:</span>{" "}
            Invoices due within 30 days of registration. Refunds issued for
            cancellations before July 6, 2026 less a $30 processing fee. No
            refunds after July 6, 2026.
          </p>
        </div>
      </section>

      {/* Sponsorship */}
      <section className="mt-20 p-10 lg:p-16 bg-oxford text-white rounded-[var(--radius-lg)]">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-overline text-cambridge mb-3">Sponsorship</p>
            <h2 className="text-h2 text-white">Put Your Brand on the Course</h2>
            <p className="text-body-lg text-white/70 mt-4">
              Sponsorship packages are available at a range of investment levels —
              from hole sponsorships to presenting sponsorship. Maximum visibility
              with Medina County&apos;s business community in one room.
            </p>
          </div>
          <div className="space-y-4">
            <p className="text-body text-white/80">
              Contact{" "}
              <span className="font-semibold text-white">Stephanie Mueller</span>{" "}
              to learn about available packages.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:stephanie@medinaohchamber.com"
                className="
                  inline-flex items-center px-5 py-2.5
                  bg-cambridge hover:bg-cambridge/90
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
                  inline-flex items-center px-5 py-2.5
                  border border-white/30 hover:border-white/60
                  text-white font-bold text-body-sm
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
    </div>
  );
}
