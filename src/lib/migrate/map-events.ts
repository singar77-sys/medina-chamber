/**
 * GrowthZone "Event Attendees Report" → Postgres mappers.
 *
 * The export is one row per registration (8114 rows across 169 distinct
 * events). It has NO event-id and NO registration-id column — the only event
 * identity is (Event Name + Event Start Date), and a registration has no
 * stable id at all. So we synthesize stable keys from those natural fields:
 *
 *   - deriveEvents(rows)  → one `events` insert per distinct (name + date),
 *     with a synthetic gzId so re-import is idempotent against events.gz_id.
 *   - mapRegistration(row) → one `eventRegistrations` insert, carrying the
 *     parent event key (eventKey) and a gzContactId so an orchestrator can
 *     resolve the event FK and link the attendee to a contact.
 *
 * Pure functions only — no DB, no I/O. The .xlsx is read elsewhere (load.ts).
 *
 * Schema gaps (see also the importer recon): events HAS gz_id, but
 * event_registrations does NOT have any gz id / idempotency column, so the
 * gzContactId / eventKey we emit live only on the output object for the
 * orchestrator to consume — they are not (yet) persistable columns.
 */
import type { InferInsertModel } from "drizzle-orm";
import { excelDateToISO, parseCents } from "./coerce";
import type { events, eventRegistrations } from "@/lib/db/schema/events";
import type { Row } from "./load";

type EventInsert = InferInsertModel<typeof events>;
type RegistrationInsert = InferInsertModel<typeof eventRegistrations>;

/** Spreadsheet column names (verbatim headers from the GrowthZone export). */
const COL = {
  eventName: "Event Name",
  attendeeName: "Attendee Name",
  membershipStatus: "Primary Membership Status",
  orgName: "Attendee Organization Name",
  eventStartDate: "Event Start Date",
  registrationStatus: "Registration Status",
  registeredCount: "Registered Count",
  attendedCount: "Attended Count",
  paidFees: "Paid Fees",
  contactId: "ContactId",
  individualPurchaseAmount: "Individual Purchase Amount",
  registrationType: "Registration Type",
} as const;

/** The registration_status enum values, as defined in the Drizzle schema. */
type RegistrationStatus =
  | "pending"
  | "confirmed"
  | "waitlisted"
  | "cancelled"
  | "attended";

/** The event_status enum values, as defined in the Drizzle schema. */
type EventStatus = "draft" | "published" | "cancelled" | "completed";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Kebab-case a string: lowercase, non-alphanumerics → single hyphen, trimmed. */
function kebab(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Trim a cell to a string; "" for blank/null/undefined. */
function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/** Parse a cell to a finite number, or 0 when blank / non-numeric. */
function num(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const s = String(value).trim();
  if (s === "") return 0;
  const n = Number(s.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Stable natural key for an event: "<event name>|<event start ISO date>".
 *
 * Date is reduced to its calendar day via excelDateToISO (drops the fractional
 * time), so every registration row for the same event collapses to one key.
 * When the date is missing/unparseable we fall back to "no-date" so rows still
 * group by name rather than throwing.
 */
export function eventKeyFor(row: Row): string {
  const name = str(row[COL.eventName]);
  const isoDate = excelDateToISO(row[COL.eventStartDate]) ?? "no-date";
  return `${name}|${isoDate}`;
}

/** Synthetic GrowthZone-style event id: gz-event-<kebab(name)>-<isoDate>. */
function syntheticEventGzId(name: string, isoDate: string): string {
  return `gz-event-${kebab(name)}-${isoDate}`;
}

/** URL slug for an event: kebab(name) + "-" + isoDate. */
function eventSlug(name: string, isoDate: string): string {
  const base = kebab(name);
  return base ? `${base}-${isoDate}` : `event-${isoDate}`;
}

/**
 * Map a GrowthZone Registration Status (+ attended count) to the
 * registration_status enum.
 *
 * Real distinct source values: Registered, Canceled, No Show, Waiting List,
 * Declined, Attended, "" (blank).
 *
 *   Attended                → attended
 *   Registered / No Show     → confirmed (they were confirmed; "no show" has
 *                              no enum, and is not a cancellation)
 *   Canceled / Declined      → cancelled
 *   Waiting List             → waitlisted
 *   "" / anything unknown    → pending (schema default)
 *
 * An Attended Count > 0 forces 'attended' regardless of the status text — the
 * report sometimes carries attendance on a row still labelled "Registered".
 */
export function mapRegistrationStatus(
  rawStatus: unknown,
  attendedCount: number,
): RegistrationStatus {
  if (attendedCount > 0) return "attended";

  const s = str(rawStatus).toLowerCase();
  switch (s) {
    case "attended":
      return "attended";
    case "registered":
    case "no show":
      return "confirmed";
    case "canceled":
    case "cancelled":
    case "declined":
      return "cancelled";
    case "waiting list":
    case "waitlist":
    case "waitlisted":
      return "waitlisted";
    default:
      return "pending";
  }
}

// ── (a) deriveEvents ───────────────────────────────────────────────────────────

/** An `events` insert plus the natural key used to dedupe/link registrations. */
export type DerivedEvent = EventInsert & { eventKey: string };

/**
 * Reduce the registration rows to a unique set of `events` inserts, keyed by
 * (Event Name + Event Start Date). All events in this historical export are in
 * the past, so status is 'completed'.
 *
 * `gzId` is a synthetic-but-stable key (events.gz_id is .unique()), giving the
 * importer idempotency: re-running the import upserts on gz_id rather than
 * duplicating events.
 */
export function deriveEvents(rows: Row[]): DerivedEvent[] {
  const byKey = new Map<string, DerivedEvent>();

  for (const row of rows) {
    const name = str(row[COL.eventName]);
    if (name === "") continue; // no name → not a real event row

    // startsAt is timestamptz-notNull in the schema. Rows whose Event Start
    // Date is blank or unparseable cannot produce a valid insert, and they
    // are always footer/junk rows (e.g. "Generated … by …" in Event Name
    // lands here with an empty start date). Skip them so null never reaches
    // a notNull column.
    const isoDate = excelDateToISO(row[COL.eventStartDate]);
    if (isoDate === null) continue;

    const key = `${name}|${isoDate}`;
    if (byKey.has(key)) continue;

    // Anchor the calendar day at UTC midnight — the column is satisfied and
    // the day is preserved regardless of the reader's local zone.
    const startsAt = new Date(`${isoDate}T00:00:00.000Z`);

    byKey.set(key, {
      eventKey: key,
      title: name,
      slug: eventSlug(name, isoDate),
      gzId: syntheticEventGzId(name, isoDate),
      // Every row in this export is a past event.
      status: "completed" satisfies EventStatus,
      startsAt,
    });
  }

  return [...byKey.values()];
}

// ── (b) mapRegistration ─────────────────────────────────────────────────────────

/**
 * An `eventRegistrations` insert, plus orchestration-only fields the schema
 * has no column for:
 *   - eventKey     : links this registration to its parent event (deriveEvents)
 *   - gzContactId  : numeric GrowthZone ContactId, when present, so the
 *                    orchestrator can resolve contact_id / organization_id.
 */
export type MappedRegistration = Omit<
  RegistrationInsert,
  // FKs are resolved by the orchestrator (after events/contacts are inserted),
  // not at map time — so they are not part of what this pure mapper produces.
  "eventId" | "ticketId" | "contactId" | "organizationId"
> & {
  eventKey: string;
  gzContactId: number | null;
};

/**
 * Map a single GrowthZone attendee row to an `eventRegistrations` insert.
 *
 *   - amountCents : parseCents(Individual Purchase Amount), falling back to
 *                   parseCents(Paid Fees); 0 when neither parses (col default).
 *   - quantity    : Registered Count (defaults to 1 when absent/zero).
 *   - status      : mapped from Registration Status (+ Attended Count).
 *   - guestName / guestEmail : ALWAYS set from the attendee fields so
 *                   non-member guests still import via the schema's guest
 *                   columns. (The export has no email column, so guestEmail is
 *                   effectively null today.)
 *   - gzContactId : numeric ContactId when present; null otherwise.
 *   - eventKey    : (name + date) so the orchestrator can resolve event_id.
 */
export function mapRegistration(row: Row): MappedRegistration {
  const attendedCount = num(row[COL.attendedCount]);

  // amountCents: Individual Purchase Amount first, then Paid Fees, else 0.
  const amountCents =
    parseCents(row[COL.individualPurchaseAmount]) ??
    parseCents(row[COL.paidFees]) ??
    0;

  // quantity: Registered Count, but never below 1 (schema default is 1).
  const registered = num(row[COL.registeredCount]);
  const quantity = registered > 0 ? registered : 1;

  const status = mapRegistrationStatus(row[COL.registrationStatus], attendedCount);

  // ContactId is the numeric GrowthZone join key; keep only all-digit values.
  const rawContactId = str(row[COL.contactId]);
  const gzContactId = /^\d+$/.test(rawContactId) ? Number(rawContactId) : null;

  // guestName / guestEmail always populated for guest-path import.
  const attendeeName = str(row[COL.attendeeName]);

  return {
    eventKey: eventKeyFor(row),
    gzContactId,
    guestName: attendeeName === "" ? null : attendeeName,
    // No email column exists in this export; emit null so the guest path is
    // intact and a later source can backfill it.
    guestEmail: null,
    status,
    quantity,
    amountCents,
  };
}
