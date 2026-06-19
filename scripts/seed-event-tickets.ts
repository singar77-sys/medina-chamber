/**
 * Dev seed: make one DB event registerable on our site so /events/[slug]/register
 * is exercisable end-to-end before the admin ticket UI (Phase 4c) exists.
 *
 * Picks the soonest upcoming event (or one named by slug arg), ensures it's
 * published, and gives it two tickets — a free "General Admission" and a paid
 * "Reserved Seating" — if it has none yet. Idempotent (skips if tickets exist).
 * Targets whatever DATABASE_URL points at in .env.local (staging).
 *
 *   pnpm exec tsx scripts/seed-event-tickets.ts [slug]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { asc, eq, gt } from "drizzle-orm";
import { db } from "../src/lib/db";
import { events, eventTickets } from "../src/lib/db/schema";

async function main() {
  const slugArg = process.argv[2];

  const cols = {
    id: events.id,
    slug: events.slug,
    title: events.title,
    status: events.status,
    startsAt: events.startsAt,
  };

  const [target] = slugArg
    ? await db.select(cols).from(events).where(eq(events.slug, slugArg)).limit(1)
    : await db
        .select(cols)
        .from(events)
        .where(gt(events.startsAt, new Date()))
        .orderBy(asc(events.startsAt))
        .limit(1);

  if (!target) {
    throw new Error(
      slugArg ? `no event with slug "${slugArg}"` : "no upcoming events in the DB to seed",
    );
  }

  if (target.status !== "published") {
    await db
      .update(events)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(events.id, target.id));
  }

  const existing = await db
    .select({ id: eventTickets.id })
    .from(eventTickets)
    .where(eq(eventTickets.eventId, target.id))
    .limit(1);

  if (existing.length > 0) {
    console.log(
      JSON.stringify({ slug: target.slug, title: target.title, note: "already has tickets" }),
    );
    return;
  }

  await db.insert(eventTickets).values([
    {
      eventId: target.id,
      name: "General Admission",
      description: "Free RSVP",
      priceCents: 0,
      sortOrder: 0,
    },
    {
      eventId: target.id,
      name: "Reserved Seating",
      description: "Includes lunch",
      priceCents: 2500,
      sortOrder: 1,
    },
  ]);

  console.log(
    JSON.stringify({
      slug: target.slug,
      title: target.title,
      seeded: ["General Admission ($0)", "Reserved Seating ($25)"],
      registerUrl: `/events/${target.slug}/register`,
    }),
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
