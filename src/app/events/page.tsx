import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getUpcomingEvents } from "@/data/events";
import { getEventGraphicRenderer } from "@/components/events/graphics/registry";
import { FluidGraphicFrame } from "@/components/events/graphics/FluidGraphicFrame";
import { FadeIn } from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Upcoming networking events, workshops, and community gatherings from the Greater Medina Chamber of Commerce. Chamber Chat, Networking WOW, Member Meetings, Golf Outing, and more.",
  openGraph: {
    title: "Events | Greater Medina Chamber of Commerce",
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
        hover:border-cambridge/40 hover:shadow-cambridge
        transition-all
      "
    >
      {/* SVG event-type graphic — falls back to cloudinary thumbnail */}
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
            alt={`${event.title}, Greater Medina Chamber of Commerce event in Medina, Ohio`}
            width={1200}
            height={630}
            className="object-contain w-full h-full"
          />
        </div>
      ) : null}

      <div className="flex gap-f13 p-f21">
        {/* Date badge */}
        <div className="flex-shrink-0 w-16 text-center">
          <div className="bg-oxford text-white rounded-[var(--radius-md)] py-2 px-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-cambridge leading-none">
              {event.month.substring(0, 3)}
            </p>
            <p className="text-2xl font-bold leading-tight mt-0.5">{event.day}</p>
            <p className="text-[10px] text-text-tertiary leading-none">{event.year}</p>
          </div>
          <p className="text-[10px] text-text-tertiary mt-f8 font-medium">
            {event.dayOfWeek.substring(0, 3).toUpperCase()}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-h4 group-hover:text-accent transition-colors line-clamp-2">
            {event.title}
          </h3>
          <p className="text-body-sm text-text-secondary mt-f3">
            {event.startTime}–{event.endTime}
          </p>
          {event.location && (
            <p className="text-caption text-text-tertiary mt-f3 truncate">
              {event.location}
            </p>
          )}
          {event.pricing && (
            <p className="text-caption text-cambridge mt-f8 font-medium">
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

  const nextGolf = allUpcoming.find((e) => e.slug.startsWith("annual-chamber-golf"));
  const nextEggs = allUpcoming.find((e) => e.slug.startsWith("eggs-expertise"));
  const nextGetToKnow = allUpcoming.find((e) => e.slug.startsWith("get-to-know"));

  const fmtLongDate = (e: { dayOfWeek: string; month: string; day: number; year: number }) =>
    `${e.dayOfWeek}, ${e.month} ${e.day}, ${e.year}`;

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-f144 pb-f89">
        <div className="max-w-3xl">
          <p className="text-overline text-cambridge mb-f8">Events</p>
          <h1 className="text-display">
            <span className="block">Medina Means</span>
            <span className="block text-accent">Business</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            From monthly mixers to signature award ceremonies, Chamber events are
            where relationships start and deals happen. Real connections between
            real Medina businesses.
          </p>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="flex items-end justify-between mb-f21">
            <h2 className="text-h2">Upcoming Events</h2>
            {hasEvents && (
              <p className="text-body-sm text-text-tertiary">
                Next {upcoming.length} of {allUpcoming.length}
              </p>
            )}
          </div>

          {hasEvents ? (
            /* gap-f21 — card grid gap */
            <div className="grid gap-f21 lg:grid-cols-2">
              {upcoming.map((event) => (
                <EventCard key={event.slug} event={event} />
              ))}
            </div>
          ) : (
            <div className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] text-center">
              <p className="text-body-lg text-text-secondary">
                No upcoming events on the calendar right now. New events are added
                regularly, check back soon, or join the chamber newsletter for
                early notice.
              </p>
              <Link
                href="/membership/join"
                className="
                  inline-flex mt-f21 items-center px-f21 py-f13
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Join the Chamber →
              </Link>
            </div>
          )}

          {allUpcoming.length > 6 && (
            /* mt-f21 — grid→trailing note */
            <p className="mt-f21 text-caption text-text-tertiary text-center">
              Plus {allUpcoming.length - 6} more upcoming events, new events roll
              onto this list as they approach. Check back weekly or follow the
              chamber for announcements.
            </p>
          )}
        </FadeIn>
      </section>

      {/* Monthly Programs */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-h2 mb-f8">Regular Programming</h2>
            <p className="text-body-lg text-text-secondary mb-f21">
              Variety programs on a variety of dates — stay as busy as you want to be.
            </p>
            <div className="grid sm:grid-cols-2 gap-f21">
              {[
                {
                  name: "Networking WOW",
                  freq: "3rd Wednesday",
                  time: "8:30 – 10:00 AM",
                  price: "$14 members / $20 prospective",
                  desc: "Watch Opportunities Work, structured morning networking with elevator pitches, group discussion, coffee and pastries. Advance registration required, no walk-ins.",
                },
                {
                  name: "Safety Council",
                  freq: "3rd Tuesday",
                  time: "11:30 AM – 1:00 PM",
                  price: "$20 per person",
                  desc: "Monthly OSHA-aligned safety training with rotating expert speakers, PPE, AI in hazard prediction, workplace risk assessment. Counts toward BWC group rebate eligibility.",
                },
                {
                  name: "Chamber Chat",
                  freq: "Last Friday",
                  time: "9:00 – 10:00 AM",
                  price: "Free",
                  desc: "Your monthly Friday networking boost. Casual coffee, no agenda, celebrate wins, swap ideas, and meet new members in a relaxed setting. Bring your own beverage.",
                },
                {
                  name: "Business Brew",
                  freq: "Monthly happy hour",
                  time: "4:00 – 6:00 PM",
                  price: "Free (food/drink on your own)",
                  desc: "After-hours mixer at rotating venues, recently Buffalo Wild Wings, with industrial and hospitality hosts ahead. Open-house format, drop in any time.",
                },
              ].map((p, i) => (
                <FadeIn key={p.name} delay={i * 60}>
                  <div className="p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)] h-full">
                    <p className="text-caption text-cambridge font-bold">{p.freq}</p>
                    <p className="text-caption text-text-tertiary mt-f3">{p.time}</p>
                    <h3 className="text-h4 mt-f8 mb-f8">{p.name}</h3>
                    <p className="text-caption text-cambridge font-medium mb-f13">{p.price}</p>
                    <p className="text-body-sm text-text-secondary">{p.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Workshops + Annual Signature */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          {/* Workshops & Orientation */}
          <p className="text-overline text-cambridge mb-f8">Learning &amp; Onboarding</p>
          <h2 className="text-h2 mb-f21">Workshops &amp; Orientation</h2>
          <div className="grid md:grid-cols-2 gap-f21">
            {nextGetToKnow && (
              <Link
                href={`/events/${nextGetToKnow.slug}`}
                className="group relative overflow-hidden flex flex-col bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] hover:border-cambridge/50 hover:shadow-[var(--shadow-md)] transition-all"
              >
                <div className="h-[3px] bg-gradient-to-r from-transparent via-cambridge to-transparent" />
                <div className="p-f21 flex flex-col flex-1">
                  <div className="flex items-center justify-between gap-f8 mb-f8">
                    <span className="text-caption font-bold text-cambridge uppercase tracking-wider">Quarterly Orientation</span>
                    <span className="text-caption font-bold text-emerald">Free</span>
                  </div>
                  <p className="text-caption text-text-tertiary mb-f13">
                    Next: {fmtLongDate(nextGetToKnow)} · {nextGetToKnow.startTime}
                  </p>
                  <h3 className="text-h4 group-hover:text-cambridge transition-colors mb-f13">
                    Get to Know the Chamber
                  </h3>
                  <p className="text-body-sm text-text-secondary leading-relaxed flex-1">
                    A guided tour of membership benefits, committees, advocacy, and
                    resources, over coffee and pastries. Built for prospective
                    members, brand-new members, and longtime supporters who want a
                    refresher. Runs four times a year. RSVP required.
                  </p>
                  <p className="mt-f13 text-body-sm font-bold text-cambridge group-hover:translate-x-1 transition-transform">
                    Register →
                  </p>
                </div>
              </Link>
            )}
            {nextEggs && (
              <Link
                href={`/events/${nextEggs.slug}`}
                className="group relative overflow-hidden flex flex-col bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] hover:border-cambridge/50 hover:shadow-[var(--shadow-md)] transition-all"
              >
                <div className="h-[3px] bg-gradient-to-r from-transparent via-cambridge to-transparent" />
                <div className="p-f21 flex flex-col flex-1">
                  <div className="flex items-center justify-between gap-f8 mb-f8">
                    <span className="text-caption font-bold text-cambridge uppercase tracking-wider">Workshop Series</span>
                    <span className="text-caption font-bold text-text-tertiary">$25 members · $30 non</span>
                  </div>
                  <p className="text-caption text-text-tertiary mb-f13">
                    Next: {fmtLongDate(nextEggs)} · {nextEggs.startTime}
                  </p>
                  <h3 className="text-h4 group-hover:text-cambridge transition-colors mb-f13">
                    {nextEggs.title}
                  </h3>
                  <p className="text-body-sm text-text-secondary leading-relaxed flex-1">
                    Hands-on morning workshop over a Chick-fil-A breakfast. June&apos;s
                    session: Canva 101 with Emily Grimm — practical graphic design
                    for social posts, flyers, and marketing materials.
                  </p>
                  <p className="mt-f13 text-body-sm font-bold text-cambridge group-hover:translate-x-1 transition-transform">
                    Register →
                  </p>
                </div>
              </Link>
            )}
          </div>

          {/* Annual Signature Events */}
          <div className="mt-f55">
            <p className="text-overline text-cambridge mb-f8">Mark Your Calendar</p>
            <h2 className="text-h2 mb-f21">Annual Signature Events</h2>
            <div className="grid md:grid-cols-2 gap-f21">
              {/* Golf Outing */}
              {nextGolf ? (
                <Link
                  href={`/events/${nextGolf.slug}`}
                  className="group relative overflow-hidden bg-oxford rounded-[var(--radius-lg)] p-f21 flex flex-col min-h-[260px]"
                >
                  <span aria-hidden className="absolute -bottom-3 -right-1 text-[8rem] font-black leading-none text-white/[0.045] select-none pointer-events-none tabular-nums">
                    {nextGolf.day}
                  </span>
                  <p className="text-caption font-bold text-cambridge uppercase tracking-wider">
                    {nextGolf.month} {nextGolf.day}, {nextGolf.year} · Westfield Country Club
                  </p>
                  <h3 className="text-h3 text-white mt-f8 leading-tight">Annual Chamber<br />Golf Outing</h3>
                  <p className="text-white/55 text-body-sm mt-f13 leading-relaxed flex-1">
                    18-hole shotgun scramble on the North &amp; South courses. Cart, boxed lunch,
                    on-course beer tickets, and post-round dinner. The chamber&apos;s signature
                    outdoor event.
                  </p>
                  <div className="mt-f21 flex items-center justify-between">
                    <span className="text-caption text-white/35 font-medium">$230 members · $260 non-members</span>
                    <span className="text-body-sm font-bold text-cambridge group-hover:translate-x-1 transition-transform">Register →</span>
                  </div>
                </Link>
              ) : (
                <div className="relative overflow-hidden bg-oxford rounded-[var(--radius-lg)] p-f21 flex flex-col min-h-[260px]">
                  <span aria-hidden className="absolute -bottom-3 -right-1 text-[8rem] font-black leading-none text-white/[0.045] select-none pointer-events-none tabular-nums">20</span>
                  <p className="text-caption font-bold text-cambridge uppercase tracking-wider">July 2026 · Westfield Country Club</p>
                  <h3 className="text-h3 text-white mt-f8 leading-tight">Annual Chamber<br />Golf Outing</h3>
                  <p className="text-white/55 text-body-sm mt-f13 leading-relaxed flex-1">
                    18-hole shotgun scramble. Cart, boxed lunch, on-course beer tickets, and post-round dinner.
                  </p>
                </div>
              )}

              {/* ATHENA Awards */}
              <Link
                href="/programs/athena-awards"
                className="group relative overflow-hidden bg-oxford rounded-[var(--radius-lg)] p-f21 flex flex-col min-h-[260px]"
              >
                <span aria-hidden className="absolute -bottom-4 -right-2 text-[5.5rem] font-black leading-none text-cambridge/[0.13] select-none pointer-events-none uppercase tracking-tight">
                  FALL
                </span>
                <p className="text-caption font-bold text-cambridge uppercase tracking-wider">Annual · Fall</p>
                <h3 className="text-h3 text-white mt-f8 leading-tight">ATHENA Awards</h3>
                <p className="text-white/55 text-body-sm mt-f13 leading-relaxed flex-1">
                  Honoring women who demonstrate excellence in leadership, community
                  service, and mentorship across Medina County. Co-hosted with the
                  Medina County Women&apos;s Journal.
                </p>
                <p className="mt-f21 text-body-sm font-bold text-cambridge group-hover:translate-x-1 transition-transform">
                  Learn more →
                </p>
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Members CTA */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="max-w-2xl">
              <h2 className="text-h2">Members get priority access</h2>
              <p className="text-body-lg text-text-secondary mt-f13">
                Early registration, member pricing, and exclusive invitations to
                private events. Membership pays for itself with one good connection.
              </p>
              <div className="mt-f21 flex flex-wrap gap-f13">
                <Link
                  href="/membership/join"
                  className="
                    inline-flex items-center px-f21 py-f13
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
                    inline-flex items-center px-f21 py-f13
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
          </div>
        </FadeIn>
      </section>
    </>
  );
}
