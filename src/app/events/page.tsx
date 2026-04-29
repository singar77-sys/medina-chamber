import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getUpcomingEvents } from "@/data/events";
import { getEventGraphicRenderer } from "@/components/events/graphics/registry";
import { FluidGraphicFrame } from "@/components/events/graphics/FluidGraphicFrame";
import { FadeIn } from "@/components/FadeIn";

/**
 * Events — φ spatial system applied throughout.
 *
 * HERO    pt-f144 pb-f89
 * FEATURE py-f89 lg:py-f144 — Upcoming Events grid (open white)
 * BAND    py-f55 lg:py-f89  — Monthly Programs 5 cards (bg-secondary)
 * FEATURE py-f89 lg:py-f144 — Workshops + Annual Signature (open white, mt-f34 divider)
 * CLOSER  py-f55 lg:py-f89  — Members priority CTA card
 */

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
            alt={`${event.title} — Greater Medina Chamber of Commerce event in Medina, Ohio`}
            width={1200}
            height={630}
            className="object-contain w-full h-full"
          />
        </div>
      ) : null}

      {/* gap-f13 — badge→content; p-f21 — card padding */}
      <div className="flex gap-f13 p-f21">
        {/* Date badge */}
        <div className="flex-shrink-0 w-16 text-center">
          <div className="bg-oxford [[data-theme=dark]_&]:bg-bg-tertiary text-white rounded-[var(--radius-md)] py-2 px-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-cambridge leading-none">
              {event.month.substring(0, 3)}
            </p>
            <p className="text-2xl font-bold leading-tight mt-0.5">{event.day}</p>
            <p className="text-[10px] text-text-tertiary leading-none">{event.year}</p>
          </div>
          {/* mt-f8 — badge→day-of-week */}
          <p className="text-[10px] text-text-tertiary mt-f8 font-medium">
            {event.dayOfWeek.substring(0, 3).toUpperCase()}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-h4 group-hover:text-accent transition-colors line-clamp-2">
            {event.title}
          </h3>
          {/* mt-f3 — title→time micro-gap */}
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
      {/* ─── HERO ─────────────────────────────────────────────── */}
      {/* pt-f144 pb-f89 (144/89 = φ) — HERO tier */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-f144 pb-f89">
        <div className="max-w-3xl">
          {/* mb-f8 — overline→heading */}
          <p className="text-overline text-cambridge mb-f8">Events</p>
          <h1 className="text-display">
            Medina Means
            <br />
            <span className="text-accent">Business</span>
          </h1>
          {/* mt-f13 — heading→body */}
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            From monthly mixers to signature award ceremonies, Chamber events are
            where relationships start and deals happen. Real connections between
            real Medina businesses.
          </p>
        </div>
      </section>

      {/* ─── FEATURE — Upcoming Events ────────────────────────── */}
      {/* py-f89/f144 — FEATURE tier, open white */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          {/* mb-f21 — header→grid gap */}
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
                regularly — check back soon, or join the chamber newsletter for
                early notice.
              </p>
              {/* mt-f21 — body→CTA */}
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
              Plus {allUpcoming.length - 6} more upcoming events — new events roll
              onto this list as they approach. Check back weekly or follow the
              chamber for announcements.
            </p>
          )}
        </FadeIn>
      </section>

      {/* ─── BAND — Monthly Programs ──────────────────────────── */}
      {/* py-f55/f89 — BAND tier, bg-secondary + border-y */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            {/* mb-f8 — heading→subhead */}
            <h2 className="text-h2 mb-f8">Monthly Programs</h2>
            {/* mb-f21 — subhead→grid */}
            <p className="text-body-lg text-text-secondary mb-f21">
              Five reliable rhythms across the month — show up to one, all five, or
              rotate. Members and prospective members welcome.
            </p>
            {/* gap-f21 — card grid gap */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-f21">
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
              ].map((p, i) => (
                <FadeIn key={p.name} delay={i * 60}>
                  <div className="p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)] h-full">
                    <p className="text-caption text-cambridge font-bold">{p.freq}</p>
                    {/* mt-f3 — freq→time micro-gap */}
                    <p className="text-caption text-text-tertiary mt-f3">{p.time}</p>
                    {/* mt-f8 — time→name; mb-f8 — name→price */}
                    <h3 className="text-h4 mt-f8 mb-f8">{p.name}</h3>
                    {/* mb-f13 — price→desc */}
                    <p className="text-caption text-cambridge font-medium mb-f13">{p.price}</p>
                    <p className="text-body-sm text-text-secondary">{p.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── FEATURE — Workshops + Annual Signature ───────────── */}
      {/* py-f89/f144 — FEATURE tier, open white */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          {/* ── Workshops & Orientation ── */}
          {/* mb-f8 — heading→subhead */}
          <h2 className="text-h2 mb-f8">Workshops &amp; Orientation</h2>
          {/* mb-f21 — subhead→grid */}
          <p className="text-body-lg text-text-secondary mb-f21">
            Hands-on learning and onboarding — outside the monthly mix.
          </p>
          {/* gap-f21 — card grid gap */}
          <div className="grid md:grid-cols-2 gap-f21">
            {nextGetToKnow && (
              <Link
                href={`/events/${nextGetToKnow.slug}`}
                className="
                  group p-f21
                  bg-bg-secondary border border-border-secondary
                  rounded-[var(--radius-lg)]
                  hover:border-border-primary hover:shadow-[var(--shadow-md)]
                  transition-all
                "
              >
                <p className="text-caption text-cambridge font-bold">Quarterly orientation · Free</p>
                {/* mt-f3 — tag→date micro-gap */}
                <p className="text-caption text-text-tertiary mt-f3">
                  Next: {fmtLongDate(nextGetToKnow)} · {nextGetToKnow.startTime}
                </p>
                {/* mt-f8 — date→heading; mb-f13 — heading→body */}
                <h3 className="text-h4 mt-f8 mb-f13 group-hover:text-accent transition-colors">
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
                  group p-f21
                  bg-bg-secondary border border-border-secondary
                  rounded-[var(--radius-lg)]
                  hover:border-border-primary hover:shadow-[var(--shadow-md)]
                  transition-all
                "
              >
                <p className="text-caption text-cambridge font-bold">Workshop series · $25 / $30</p>
                <p className="text-caption text-text-tertiary mt-f3">
                  Next: {fmtLongDate(nextEggs)} · {nextEggs.startTime}
                </p>
                <h3 className="text-h4 mt-f8 mb-f13 group-hover:text-accent transition-colors">
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

          {/* mt-f34 — subsection divider */}
          {/* ── Annual Signature Events ── */}
          <div className="mt-f34">
            {/* mb-f8 — heading→subhead */}
            <h2 className="text-h2 mb-f8">Annual Signature Events</h2>
            {/* mb-f21 — subhead→grid */}
            <p className="text-body-lg text-text-secondary mb-f21">
              The events that anchor the chamber year — plan ahead and register early.
            </p>
            {/* gap-f21 — card grid gap */}
            <div className="grid md:grid-cols-3 gap-f21">
              {(() => {
                const golfDate = nextGolf
                  ? `${nextGolf.month} ${nextGolf.day}, ${nextGolf.year}`
                  : "July 2026";
                const cards = [
                  {
                    name: "Annual Chamber Golf Outing",
                    date: golfDate,
                    description:
                      "A luxurious day at Westfield Country Club — 18 holes (North & South courses), shotgun start, cart, boxed lunch, on-course beer tickets, and post-round dinner. The chamber's signature outdoor event. $230 members / $260 non-members.",
                    href: nextGolf ? `/events/${nextGolf.slug}` : null,
                  },
                  {
                    name: "ATHENA Awards",
                    date: "Annual — Fall",
                    description:
                      "Honoring women who demonstrate excellence in leadership, community service, and mentorship across Medina County.",
                    href: "/programs/athena-awards",
                  },
                  {
                    name: "EmpowHER",
                    date: "Annual",
                    description:
                      "Awards honoring women leaders in Medina County, co-hosted with the Medina County Women's Journal.",
                    href: null,
                  },
                ];
                return cards.map((event) =>
                  event.href ? (
                    <Link
                      key={event.name}
                      href={event.href}
                      className="
                        group p-f21
                        bg-bg-secondary border border-border-secondary
                        rounded-[var(--radius-lg)]
                        hover:border-border-primary hover:shadow-[var(--shadow-md)]
                        transition-all
                      "
                    >
                      <p className="text-caption text-cambridge font-bold">{event.date}</p>
                      {/* mt-f8 — date→heading; mb-f13 — heading→body */}
                      <h3 className="text-h4 mt-f8 mb-f13 group-hover:text-accent transition-colors">
                        {event.name}
                      </h3>
                      <p className="text-body-sm text-text-secondary">{event.description}</p>
                    </Link>
                  ) : (
                    <div
                      key={event.name}
                      className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
                    >
                      <p className="text-caption text-cambridge font-bold">{event.date}</p>
                      <h3 className="text-h4 mt-f8 mb-f13">{event.name}</h3>
                      <p className="text-body-sm text-text-secondary">{event.description}</p>
                    </div>
                  ),
                );
              })()}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── CLOSER — Members CTA ─────────────────────────────── */}
      {/* py-f55/f89 — CLOSER taper */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          {/* p-f34/f55 — card padding */}
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="max-w-2xl">
              <h2 className="text-h2">Members get priority access</h2>
              {/* mt-f13 — heading→body */}
              <p className="text-body-lg text-text-secondary mt-f13">
                Early registration, member pricing, and exclusive invitations to
                private events. Membership pays for itself with one good connection.
              </p>
              {/* mt-f21 — body→buttons; gap-f13 — between buttons */}
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
