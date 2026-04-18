import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { events, getUpcomingEvents, formatShortDate } from "@/data/events";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Upcoming networking events, workshops, and community gatherings from the Greater Medina Chamber of Commerce. Chamber Chat, Networking WOW, Member Meetings, Golf Outing, and more.",
  openGraph: {
    title: "Events — Greater Medina Chamber of Commerce",
    description:
      "Upcoming networking events and community gatherings in Medina County, Ohio.",
  },
  alternates: { canonical: "/events" },
};

function EventCard({ event }: { event: ReturnType<typeof getUpcomingEvents>[number] }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="
        group flex gap-5 p-5 min-w-0 overflow-hidden
        bg-bg-secondary border border-border-secondary
        rounded-[var(--radius-lg)]
        hover:border-border-primary hover:shadow-[var(--shadow-md)]
        transition-all
      "
    >
      {/* Date badge */}
      <div className="flex-shrink-0 w-16 text-center">
        <div className="bg-oxford [[data-theme=dark]_&]:bg-bg-tertiary text-white rounded-[var(--radius-md)] py-2 px-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-cambridge leading-none">
            {event.month.substring(0, 3)}
          </p>
          <p className="text-2xl font-bold leading-tight mt-0.5">{event.day}</p>
          <p className="text-[10px] text-text-tertiary leading-none">{event.year}</p>
        </div>
        <p className="text-[10px] text-text-tertiary mt-2 font-medium">
          {event.dayOfWeek.substring(0, 3).toUpperCase()}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-h4 group-hover:text-accent transition-colors line-clamp-2">
          {event.title}
        </h3>
        <p className="text-body-sm text-text-secondary mt-1">
          {event.startTime}–{event.endTime}
        </p>
        {event.location && (
          <p className="text-caption text-text-tertiary mt-1 truncate">
            {event.location}
          </p>
        )}
        {event.pricing && (
          <p className="text-caption text-cambridge mt-2 font-medium">
            {event.pricing.split("\n")[0]}
          </p>
        )}
      </div>

      {/* Image thumbnail */}
      {event.image && (
        <div className="flex-shrink-0 w-16 h-16 rounded-[var(--radius-md)] overflow-hidden hidden sm:block">
          <Image
            src={event.image}
            alt={`${event.title} — Greater Medina Chamber of Commerce event in Medina, Ohio`}
            width={64}
            height={64}
            className="object-cover w-full h-full"
          />
        </div>
      )}
    </Link>
  );
}

export default function EventsPage() {
  const allUpcoming = getUpcomingEvents();
  const upcoming = allUpcoming.slice(0, 6);
  const hasEvents = upcoming.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">

      {/* ── Hero ── */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Events</p>
        <h1 className="text-display">
          Medina Means
          <br />
          <span className="text-accent">Business</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          From monthly mixers to signature award ceremonies, Chamber events are
          where relationships start and deals happen. Real connections between
          real Medina businesses.
        </p>
      </section>

      {/* ── Upcoming Events ── */}
      <section className="mt-24">
        <div className="flex items-end justify-between mb-8">
          <h2 className="text-h2">Upcoming Events</h2>
          {hasEvents && (
            <p className="text-body-sm text-text-tertiary">
              Next {upcoming.length} of {allUpcoming.length}
            </p>
          )}
        </div>

        {hasEvents ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {upcoming.map((event) => (
              <EventCard key={event.slug} event={event} />
            ))}
          </div>
        ) : (
          <div className="p-10 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] text-center">
            <p className="text-body-lg text-text-secondary">
              No upcoming events on the calendar right now. New events are added regularly — check back soon, or join the chamber newsletter for early notice.
            </p>
            <Link
              href="/membership/join"
              className="inline-flex mt-6 items-center px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-bold text-body-sm rounded-[var(--radius-md)] transition-colors"
            >
              Join the Chamber →
            </Link>
          </div>
        )}

        {allUpcoming.length > 6 && (
          <p className="mt-8 text-caption text-text-tertiary text-center">
            Plus {allUpcoming.length - 6} more upcoming events — new events roll
            onto this list as they approach. Check back weekly or follow the
            chamber for announcements.
          </p>
        )}
      </section>

      {/* ── Signature Annual Events ── */}
      <section className="mt-24">
        <h2 className="text-h2 mb-2">Annual Signature Events</h2>
        <p className="text-body-lg text-text-secondary mb-10">
          These events define the chamber calendar — plan ahead and register early.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: "Annual Golf Outing",
              date: "July 20, 2026",
              description: "A full-day scramble at a premier Medina County course. Networking, prizes, and dinner — the Chamber's signature outdoor event.",
              slug: "annual-chamber-golf-outing",
            },
            {
              name: "Athena Awards",
              date: "Annual — Fall",
              description: "Honoring women who demonstrate excellence in leadership, community service, and mentorship in Medina County.",
              slug: null,
            },
            {
              name: "EmpowHER",
              date: "Annual",
              description: "Annual awards honoring women leaders in Medina County, co-hosted with the Medina County Women's Journal.",
              slug: null,
            },
          ].map((event) => (
            event.slug ? (
              <Link
                key={event.name}
                href={`/events/${event.slug}`}
                className="
                  group p-6
                  bg-bg-secondary border border-border-secondary
                  rounded-[var(--radius-lg)]
                  hover:border-border-primary hover:shadow-[var(--shadow-md)]
                  transition-all
                "
              >
                <p className="text-caption text-cambridge font-bold">{event.date}</p>
                <h3 className="text-h4 mt-2 mb-3 group-hover:text-accent transition-colors">{event.name}</h3>
                <p className="text-body-sm text-text-secondary">{event.description}</p>
              </Link>
            ) : (
              <div
                key={event.name}
                className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
              >
                <p className="text-caption text-cambridge font-bold">{event.date}</p>
                <h3 className="text-h4 mt-2 mb-3">{event.name}</h3>
                <p className="text-body-sm text-text-secondary">{event.description}</p>
              </div>
            )
          ))}
        </div>
      </section>

      {/* ── Recurring Programs ── */}
      <section className="mt-24">
        <h2 className="text-h2 mb-2">Recurring Programs</h2>
        <p className="text-body-lg text-text-secondary mb-10">
          These run monthly — join any month, no commitment required.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { name: "Networking WOW", freq: "3rd Wednesday", time: "8:30–10:00 AM", desc: "Structured open networking + elevator pitches + group discussion. $14 members / $20 non-members." },
            { name: "Chamber Chat", freq: "Monthly Friday", time: "9:00–10:00 AM", desc: "Casual morning networking. Share wins, set goals, make connections in a relaxed setting." },
            { name: "Business Brew", freq: "Monthly", time: "4:00–6:00 PM", desc: "After-hours mixer. Mix, mingle, and brew up great connections." },
            { name: "Safety Council", freq: "Monthly Tuesday", time: "11:30 AM–1:00 PM", desc: "Workplace safety training, OSHA compliance resources, and expert speakers." },
          ].map((p) => (
            <div
              key={p.name}
              className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <p className="text-caption text-cambridge font-bold">{p.freq}</p>
              <p className="text-caption text-text-tertiary">{p.time}</p>
              <h3 className="text-h4 mt-2 mb-3">{p.name}</h3>
              <p className="text-body-sm text-text-secondary">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mt-24 p-10 lg:p-16 bg-bg-secondary rounded-[var(--radius-lg)] border border-border-secondary">
        <div className="max-w-2xl">
          <h2 className="text-h2">Members get priority access</h2>
          <p className="text-body-lg text-text-secondary mt-4">
            Early registration, member pricing, and exclusive invitations to
            private events. Membership pays for itself with one good connection.
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
            <Link
              href="/events/sponsorships"
              className="
                inline-flex items-center px-6 py-3
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Sponsor an Event
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
