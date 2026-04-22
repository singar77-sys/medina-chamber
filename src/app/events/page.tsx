import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getUpcomingEvents, getEventBySlug } from "@/data/events";
import { getEventGraphicRenderer } from "@/components/events/graphics/registry";
import { FluidGraphicFrame } from "@/components/events/graphics/FluidGraphicFrame";

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
  const Graphic = getEventGraphicRenderer(event);

  return (
    <Link
      href={`/events/${event.slug}`}
      className="
        group flex flex-col min-w-0 overflow-hidden
        bg-bg-secondary border border-border-secondary
        rounded-[var(--radius-lg)]
        hover:border-cambridge/40 hover:shadow-[0_12px_40px_rgba(131,188,169,0.12)]
        transition-all
      "
    >
      {/* SVG event-type graphic — same renderer the homepage uses,
          falls back to the cloudinary thumbnail for any event slug
          getEventGraphicRenderer doesn't recognize. */}
      {Graphic ? (
        <div className="border-b border-border-secondary">
          <FluidGraphicFrame mode="social">
            <Graphic mode="social" />
          </FluidGraphicFrame>
        </div>
      ) : event.image ? (
        <div className="border-b border-border-secondary aspect-[1200/630] bg-bg-tertiary">
          <Image
            src={event.image}
            alt={`${event.title} — Greater Medina Chamber of Commerce event in Medina, Ohio`}
            width={1200}
            height={630}
            className="object-contain w-full h-full"
          />
        </div>
      ) : null}

      <div className="flex gap-5 p-5">
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
      </div>
    </Link>
  );
}

export default function EventsPage() {
  const allUpcoming = getUpcomingEvents();
  const upcoming = allUpcoming.slice(0, 6);
  const hasEvents = upcoming.length > 0;

  // Pull the next instance of each "named" program so dates auto-update
  // as new months get scraped onto the calendar.
  const nextGolf = allUpcoming.find((e) => e.slug.startsWith("annual-chamber-golf"));
  const nextEggs = allUpcoming.find((e) => e.slug.startsWith("eggs-expertise"));
  const nextGetToKnow = allUpcoming.find((e) => e.slug.startsWith("get-to-know"));

  const fmtLongDate = (e: { dayOfWeek: string; month: string; day: number; year: number }) =>
    `${e.dayOfWeek}, ${e.month} ${e.day}, ${e.year}`;

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

      {/* ── Monthly Programs ──
          Five recurring networking programs, in rough order of cadence over
          the year. Cadences and pricing mirror business.medinachamber.com —
          when those change in GrowthZone, the Upcoming Events strip above
          updates from the live scrape; this section describes the *pattern*
          a member can rely on, not a specific date. */}
      <section className="mt-24">
        <h2 className="text-h2 mb-2">Monthly Programs</h2>
        <p className="text-body-lg text-text-secondary mb-10">
          Five reliable rhythms across the month — show up to one, all five, or
          rotate. Members and prospective members welcome.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              name: "Chamber Member Meeting",
              freq: "1st Tuesday",
              time: "11:30 AM – 1:00 PM",
              price: "$25 members / $30 non-members",
              desc: "The chamber's flagship lunch program. Featured speakers on regional business topics — recent: Cleveland Browns Stadium development, leadership and human connection, State of the City. Lunch included.",
            },
            {
              name: "Networking WOW",
              freq: "3rd Wednesday",
              time: "8:30 – 10:00 AM",
              price: "$14 members / $20 prospective",
              desc: "Watch Opportunities Work — structured morning networking with elevator pitches, group discussion, coffee and pastries. Advance registration required, no walk-ins.",
            },
            {
              name: "Safety Council",
              freq: "3rd Tuesday",
              time: "11:30 AM – 1:00 PM",
              price: "$20 per person",
              desc: "Monthly OSHA-aligned safety training with rotating expert speakers — PPE, AI in hazard prediction, workplace risk assessment. Counts toward BWC group rebate eligibility.",
            },
            {
              name: "Chamber Chat",
              freq: "Last Friday",
              time: "9:00 – 10:00 AM",
              price: "Free",
              desc: "Your monthly Friday networking boost. Casual coffee, no agenda — celebrate wins, swap ideas, and meet new members in a relaxed setting. Bring your own beverage.",
            },
            {
              name: "Business Brew",
              freq: "Monthly happy hour",
              time: "4:00 – 6:00 PM",
              price: "Free (food/drink on your own)",
              desc: "After-hours mixer at rotating member venues — recently Buffalo Wild Wings, with industrial and hospitality hosts ahead. Open-house format, drop in any time.",
            },
          ].map((p) => (
            <div
              key={p.name}
              className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <p className="text-caption text-cambridge font-bold">{p.freq}</p>
              <p className="text-caption text-text-tertiary">{p.time}</p>
              <h3 className="text-h4 mt-2 mb-2">{p.name}</h3>
              <p className="text-caption text-cambridge font-medium mb-3">{p.price}</p>
              <p className="text-body-sm text-text-secondary">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Workshops & Orientation ──
          The two "oddballs" on the calendar that aren't part of the monthly
          rhythm: a quarterly orientation for prospective/new members and a
          rotating skills workshop series over breakfast. Dates pulled from
          the live scrape so the latest scheduled instance always shows. */}
      <section className="mt-24">
        <h2 className="text-h2 mb-2">Workshops &amp; Orientation</h2>
        <p className="text-body-lg text-text-secondary mb-10">
          Hands-on learning and onboarding — outside the monthly mix.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {nextGetToKnow && (
            <Link
              href={`/events/${nextGetToKnow.slug}`}
              className="
                group p-6
                bg-bg-secondary border border-border-secondary
                rounded-[var(--radius-lg)]
                hover:border-border-primary hover:shadow-[var(--shadow-md)]
                transition-all
              "
            >
              <p className="text-caption text-cambridge font-bold">Quarterly orientation · Free</p>
              <p className="text-caption text-text-tertiary">Next: {fmtLongDate(nextGetToKnow)} · {nextGetToKnow.startTime}</p>
              <h3 className="text-h4 mt-2 mb-3 group-hover:text-accent transition-colors">
                Get to Know the Chamber
              </h3>
              <p className="text-body-sm text-text-secondary">
                A guided tour of membership benefits, committees, advocacy, and
                resources — over coffee and pastries. Built for prospective
                members, brand-new members, and longtime supporters who want a
                refresher. Runs four times a year. RSVP required.
              </p>
            </Link>
          )}
          {nextEggs && (
            <Link
              href={`/events/${nextEggs.slug}`}
              className="
                group p-6
                bg-bg-secondary border border-border-secondary
                rounded-[var(--radius-lg)]
                hover:border-border-primary hover:shadow-[var(--shadow-md)]
                transition-all
              "
            >
              <p className="text-caption text-cambridge font-bold">Workshop series · $25 / $30</p>
              <p className="text-caption text-text-tertiary">Next: {fmtLongDate(nextEggs)} · {nextEggs.startTime}</p>
              <h3 className="text-h4 mt-2 mb-3 group-hover:text-accent transition-colors">
                {nextEggs.title}
              </h3>
              <p className="text-body-sm text-text-secondary">
                Hands-on morning workshop over a Chick-fil-A breakfast. June&apos;s
                session: Canva 101 with Emily Grimm — practical graphic design
                for social posts, flyers, and marketing materials, with brand
                consistency tactics built in.
              </p>
            </Link>
          )}
        </div>
      </section>

      {/* ── Annual Signature Events ──
          The big yearly draws. Golf has a live event in the calendar so the
          date hydrates from the scrape; Athena and EmpowHER fall outside
          the visible scrape window, so they're hand-described. Athena links
          to the dedicated program page. */}
      <section className="mt-24">
        <h2 className="text-h2 mb-2">Annual Signature Events</h2>
        <p className="text-body-lg text-text-secondary mb-10">
          The events that anchor the chamber year — plan ahead and register early.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {(() => {
            const golfDate = nextGolf
              ? `${nextGolf.month} ${nextGolf.day}, ${nextGolf.year}`
              : "July 2026";
            const cards = [
              {
                name: "Annual Chamber Golf Outing",
                date: golfDate,
                description: "A luxurious day at Westfield Country Club — 18 holes (North & South courses), shotgun start, cart, boxed lunch, on-course beer tickets, and post-round dinner. The chamber's signature outdoor event. $230 members / $260 non-members.",
                href: nextGolf ? `/events/${nextGolf.slug}` : null,
              },
              {
                name: "ATHENA Awards",
                date: "Annual — Fall",
                description: "Honoring women who demonstrate excellence in leadership, community service, and mentorship across Medina County.",
                href: "/programs/athena-awards",
              },
              {
                name: "EmpowHER",
                date: "Annual",
                description: "Awards honoring women leaders in Medina County, co-hosted with the Medina County Women's Journal.",
                href: null,
              },
            ];
            return cards.map((event) =>
              event.href ? (
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
              ),
            );
          })()}
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
