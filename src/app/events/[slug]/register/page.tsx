/**
 * /events/[slug]/register — on-site event registration.
 *
 * DB-driven (not the static scrape): only renders for a published DB event that
 * owns registration (has tickets). Reads the portal_session cookie to decide
 * member vs guest, guards the registration window, and hands the event + tickets
 * to the <RegistrationForm> client island. Reading the cookie makes this route
 * dynamic, which is correct — it's per-visitor and writes on submit.
 */

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { verifyPortalSession, PORTAL_COOKIE } from "@/lib/portal-session";
import { getEventBySlug } from "@/data/events";
import {
  getRegisterableEvent,
  registrationIsOpen,
  seatsLeft,
} from "@/lib/events/db-events";
import { RegistrationForm } from "./RegistrationForm";

export const dynamic = "force-dynamic";

function formatWhen(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

async function isMember(): Promise<boolean> {
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  if (!token) return false;
  return (await verifyPortalSession(token)) !== null;
}

export default async function EventRegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // The URL slug is the static (public) slug; resolve it to the DB event via the
  // shared GrowthZone id (static eventId === DB gzId), since the two systems'
  // slug conventions differ.
  const staticEvent = getEventBySlug(slug);
  const [event, member] = await Promise.all([
    staticEvent
      ? getRegisterableEvent(staticEvent.title, staticEvent.dateISO)
      : Promise.resolve(null),
    isMember(),
  ]);
  if (!event) notFound();

  const open = registrationIsOpen(event);
  const seats = seatsLeft(event);
  const full = seats === 0;

  return (
    <section className="mx-auto max-w-2xl px-6 lg:px-8 pt-f55 pb-f89">
      <nav className="flex items-center gap-2 text-caption text-text-tertiary mb-f21">
        <Link href="/events" className="hover:text-text-primary transition-colors">
          Events
        </Link>
        <span>/</span>
        <Link href={`/events/${slug}`} className="hover:text-text-primary transition-colors truncate">
          {event.title}
        </Link>
        <span>/</span>
        <span className="text-text-secondary">Register</span>
      </nav>

      <h1 className="text-h2 leading-tight">{event.title}</h1>
      <p className="text-body text-text-secondary mt-f8">{formatWhen(event.startsAt)}</p>
      {event.location && (
        <p className="text-body-sm text-text-tertiary mt-f3">{event.location}</p>
      )}
      {event.isMembersOnly && (
        <p className="inline-block mt-f8 text-caption font-bold px-2.5 py-1 rounded-full"
           style={{ background: "#eff6ff", color: "#1e40af" }}>
          Members only
        </p>
      )}

      <div className="mt-f34">
        {!open ? (
          <div className="bg-bg-primary rounded-2xl p-6 border border-border-secondary">
            <p className="text-body-sm text-text-secondary">
              Registration for this event is closed.{" "}
              <Link href={`/events/${slug}`} className="underline font-bold" style={{ color: "#0C1B33" }}>
                Back to event details
              </Link>
            </p>
          </div>
        ) : full ? (
          <div className="bg-bg-primary rounded-2xl p-6 border border-border-secondary">
            <p className="text-body-sm text-text-secondary mb-3">
              This event is currently full. Join the waitlist and we&apos;ll email you if a
              spot opens up — no payment is taken to waitlist.
            </p>
            <RegistrationForm eventId={event.id} tickets={event.tickets} isMember={member} returnSlug={slug} />
          </div>
        ) : (
          <>
            {seats != null && seats <= 10 && (
              <p className="text-caption mb-f13" style={{ color: "#c2410c" }}>
                Only {seats} {seats === 1 ? "spot" : "spots"} left
              </p>
            )}
            <RegistrationForm eventId={event.id} tickets={event.tickets} isMember={member} returnSlug={slug} />
          </>
        )}
      </div>
    </section>
  );
}
