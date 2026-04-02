import type { Metadata } from "next";
import Link from "next/link";
import { growthZone } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Upcoming networking events, award ceremonies, and community gatherings from the Greater Medina Chamber of Commerce. Mixers, Athena Awards, Golf Outing, and more.",
  openGraph: {
    title: "Events — Greater Medina Chamber of Commerce",
    description:
      "Networking events, award ceremonies, and community gatherings in Medina County.",
  },
};

const signatureEvents = [
  {
    name: "Athena Awards",
    date: "Annual — Fall",
    description:
      "Honoring women who demonstrate excellence in leadership, community service, and mentorship in Medina County.",
    href: "/events/athena-awards",
  },
  {
    name: "Annual Golf Outing",
    date: "Annual — Summer",
    description:
      "A full-day scramble at a premier Medina County course. Networking, prizes, and dinner — the Chamber's signature outdoor event.",
    href: "/events/golf-outing",
  },
  {
    name: "Sponsorships & Ribbon Cuttings",
    date: "Year-round",
    description:
      "Celebrate new businesses, expansions, and milestones with the Chamber. Ribbon cuttings are open to all members.",
    href: "/events/sponsorships",
  },
];

const recurringEvents = [
  {
    name: "Chamber Chat",
    frequency: "Monthly",
    description: "Informal morning meetup for member-to-member connection.",
  },
  {
    name: "Networking WOW",
    frequency: "Monthly",
    description: "After-hours mixer hosted at a different member business each month.",
  },
  {
    name: "Social Connect",
    frequency: "Quarterly",
    description: "Relaxed social gatherings for members and prospective members.",
  },
];

export default function EventsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Events</p>
        <h1 className="text-display">
          Where Medina
          <br />
          <span className="text-accent">Does Business</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          From monthly mixers to signature award ceremonies, Chamber events are
          where relationships start and deals happen. No stiff conferences —
          real connections between real Medina businesses.
        </p>

        <div className="mt-10">
          <a
            href={growthZone.events}
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center px-6 py-3
              bg-accent hover:bg-accent-hover
              text-white font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            View Full Event Calendar →
          </a>
        </div>
      </section>

      {/* Signature Events */}
      <section className="mt-24">
        <h2 className="text-overline text-cambridge mb-8">Signature Events</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {signatureEvents.map((event) => (
            <Link
              key={event.name}
              href={event.href}
              className="
                group p-6
                bg-bg-secondary border border-border-secondary
                rounded-[var(--radius-lg)]
                hover:border-border-primary hover:shadow-[var(--shadow-md)]
                transition-all
              "
            >
              <p className="text-caption text-cambridge font-bold">
                {event.date}
              </p>
              <h3 className="text-h4 mt-2 mb-3 group-hover:text-accent transition-colors">
                {event.name}
              </h3>
              <p className="text-body-sm text-text-secondary">
                {event.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recurring Events */}
      <section className="mt-24">
        <h2 className="text-overline text-cambridge mb-8">Recurring Events</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {recurringEvents.map((event) => (
            <div
              key={event.name}
              className="
                p-6
                bg-bg-secondary border border-border-secondary
                rounded-[var(--radius-lg)]
              "
            >
              <p className="text-caption text-cambridge font-bold">
                {event.frequency}
              </p>
              <h3 className="text-h4 mt-2 mb-3">{event.name}</h3>
              <p className="text-body-sm text-text-secondary">
                {event.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-24 p-10 lg:p-16 bg-bg-secondary rounded-[var(--radius-lg)] border border-border-secondary">
        <div className="max-w-2xl">
          <h2 className="text-h2">Members get priority access</h2>
          <p className="text-body-lg text-text-secondary mt-4">
            Early registration, member pricing, and exclusive invitations to
            private events. Membership pays for itself with one good
            connection.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/membership/join"
              className="
                inline-flex items-center px-6 py-3
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Join the Chamber →
            </Link>
            <a
              href={growthZone.events}
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex items-center px-6 py-3
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Browse All Events
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
