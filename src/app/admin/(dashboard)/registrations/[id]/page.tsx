/**
 * /admin/registrations/[id] — manage one DB event's on-site registration.
 *
 * Loads the event, its tickets, and its roster, then hands them to the
 * TicketManager + RegistrationRoster client islands. Gated by proxy.ts (admin
 * cookie); mutations re-check the admin_session cookie at /api/admin/reg/*.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, eventTickets, eventRegistrations, contacts } from "@/lib/db/schema";
import { TicketManager, type AdminTicket } from "@/components/admin/TicketManager";
import { RegistrationRoster, type RosterRow } from "@/components/admin/RegistrationRoster";

export const dynamic = "force-dynamic";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function AdminEventRegistrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [event] = await db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      status: events.status,
      maxCapacity: events.maxCapacity,
      registrationCount: events.registrationCount,
      waitlistCount: events.waitlistCount,
    })
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!event) notFound();

  const [tickets, regRows] = await Promise.all([
    db
      .select({
        id: eventTickets.id,
        name: eventTickets.name,
        description: eventTickets.description,
        priceCents: eventTickets.priceCents,
        isMemberOnly: eventTickets.isMemberOnly,
        maxQuantity: eventTickets.maxQuantity,
        soldCount: eventTickets.soldCount,
      })
      .from(eventTickets)
      .where(eq(eventTickets.eventId, id))
      .orderBy(asc(eventTickets.sortOrder)),

    db
      .select({
        id: eventRegistrations.id,
        status: eventRegistrations.status,
        quantity: eventRegistrations.quantity,
        checkedInAt: eventRegistrations.checkedInAt,
        guestName: eventRegistrations.guestName,
        guestEmail: eventRegistrations.guestEmail,
        cFirst: contacts.firstName,
        cLast: contacts.lastName,
        cEmail: contacts.email,
        ticketName: eventTickets.name,
      })
      .from(eventRegistrations)
      .leftJoin(contacts, eq(eventRegistrations.contactId, contacts.id))
      .leftJoin(eventTickets, eq(eventRegistrations.ticketId, eventTickets.id))
      .where(eq(eventRegistrations.eventId, id))
      .orderBy(desc(eventRegistrations.createdAt)),
  ]);

  const roster: RosterRow[] = regRows.map((r) => ({
    id: r.id,
    name: r.cFirst ? `${r.cFirst} ${r.cLast ?? ""}`.trim() : (r.guestName ?? "—"),
    email: r.cEmail ?? r.guestEmail,
    isMember: r.cFirst != null,
    ticketName: r.ticketName,
    quantity: r.quantity,
    status: r.status,
    checkedIn: r.checkedInAt != null,
  }));

  return (
    <div className="px-6 py-6 max-w-3xl space-y-6">
      <div>
        <Link href="/admin/registrations" className="text-sm text-[#83BCA9] hover:underline">
          ← Registrations
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-3">{event.title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {fmtDate(event.startsAt)} · {event.status} · {event.registrationCount} registered
          {event.waitlistCount > 0 && `, ${event.waitlistCount} waitlisted`}
        </p>
      </div>

      <TicketManager
        eventId={event.id}
        initialStatus={event.status}
        initialCapacity={event.maxCapacity}
        initialTickets={tickets as AdminTicket[]}
      />

      <RegistrationRoster initialRegistrations={roster} />
    </div>
  );
}
