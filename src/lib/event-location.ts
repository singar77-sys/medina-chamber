/**
 * One place that decides what an event's venue is called.
 *
 * Before this module, three surfaces each guessed on their own and disagreed:
 * the /events timeline and the homepage cards treated ANY location string
 * starting with a digit as the chamber office (16 of 28 upcoming events are
 * somewhere else — Safety Council at 787 Lafayette Road, Business Brew at a
 * different member venue every month), while /events/[slug] tested the street
 * against the real office address. The calendar therefore sent people to the
 * wrong building for more than half the pipeline.
 *
 * The test is the ACTUAL office address, not "starts with a digit". The
 * chamber moved to 139 N. Court Street, and the scrape spells it three ways
 * ("139 North Court Street Suite A", "139 N. Court Street Suite A", and the
 * abbreviated "139 N Court St" used in hand-written fallbacks), so the match
 * is spelling-tolerant.
 *
 * FIELD PRECEDENCE — this is the load-bearing part, see resolveLocation():
 * `street` is the field the admin editor writes; `location` is scrape-only and
 * can never be corrected by a human. So `street` decides the address, and the
 * scraped `location` is consulted only for the venue NAME it sometimes carries
 * ("Foundry Social, 333 Foundry St, …"), and only while it still agrees with
 * `street`. Preferring `location` made every street override inert: an admin
 * could move an event to 787 Lafayette Road and the card still said
 * "Chamber Office".
 */

/** Full organisation name — detail pages and JSON-LD `Place.name`. */
export const CHAMBER_OFFICE_VENUE = "Greater Medina Chamber of Commerce";

/** Compact chip form — cards and the timeline rail, where a full org name
 *  would eat the whole line. */
export const CHAMBER_OFFICE_SHORT = "Chamber Office";

/** The subset of ChamberEvent / CmsEventData this module reads. */
export interface EventLocationFields {
  /** Explicit venue name when staff have set one (CMS override). */
  venue?: string;
  /** Scraped "STREET, City, ST, ZIP" one-liner. NOT editable by staff — the
   *  admin event editor never sends it, so it is always scrape-fresh at best
   *  and stale the moment `street` is corrected. */
  location?: string;
  /** Street line on its own — scraped, and the field the admin editor writes. */
  street?: string;
}

// "north" first: ordered alternation, and `n\.?` would otherwise consume the
// "N" of "North" before failing on the required whitespace. `ct\.?` covers the
// "139 N Ct St" spelling, which used to fall through to a bare street address.
const CHAMBER_OFFICE_RE = /\b139\s+(?:north|n\.?)\s+(?:court|ct\.?)\s+(?:street|st)\b/i;

// Deliberately unanchored: that is what tolerates the "Suite A" tail and the
// "Some Venue, 139 N Court St" form the scrape occasionally produces. The one
// way mid-string matching goes wrong is a prefix that puts the office NEAR the
// event rather than AT it, so those prepositions are rejected explicitly.
const NOT_AT_ADDRESS_RE =
  /(?:across from|opposite|behind|next to|adjacent to|in front of|near|around the corner from|down (?:the )?(?:street|road) from)[\s,]*$/i;

/** Does this address line point at the chamber's own office? */
export function isChamberOfficeAddress(value?: string): boolean {
  if (!value) return false;
  const match = CHAMBER_OFFICE_RE.exec(value);
  if (!match) return false;
  return !NOT_AT_ADDRESS_RE.test(value.slice(0, match.index));
}

// Scraped placeholders that are not venue names. Without this guard they would
// be emitted as a structured JSON-LD `Place.name` next to a real PostalAddress,
// and the scrape is unvalidated weekly output.
const NON_VENUE_RE =
  /^(?:t\.?b\.?[ad]\.?|n\/?a|none|online|virtual|zoom|webinar|hybrid|various(?:\s+locations?)?|multiple\s+locations?|to\s+be\s+(?:determined|announced|confirmed)|unknown|off[-\s]?site|suite\s+\S+)$/i;

/** Is this text usable as a venue NAME (as opposed to an address fragment or
 *  a scraper placeholder)? */
function isVenueName(value: string): boolean {
  const v = value.trim();
  return (
    v.length > 2 &&
    v.length <= 120 &&
    /[a-z]/i.test(v) &&
    !/^\d/.test(v) &&
    !NON_VENUE_RE.test(v)
  );
}

/** Casing/punctuation-insensitive form, for asking whether the scraped
 *  one-liner still describes the same place as `street`. */
function normalizeAddress(value: string): string {
  return value.toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
}

interface ResolvedLocation {
  /** The address line we trust: the editable `street` whenever it is set,
   *  otherwise the first segment of the scraped `location`. */
  address: string;
  /** A venue NAME carried by the scraped `location` prefix — only when that
   *  scrape still agrees with `street`, because an admin street correction
   *  leaves the whole scraped one-liner stale. */
  namedVenue?: string;
}

function resolveLocation(e: EventLocationFields): ResolvedLocation {
  const street = (e.street ?? "").trim();
  const location = (e.location ?? "").trim();
  const locationFirst = location.split(",")[0].trim();

  const locationAgrees =
    !street || normalizeAddress(location).includes(normalizeAddress(street));

  return {
    address: street || locationFirst,
    namedVenue:
      locationAgrees && isVenueName(locationFirst) ? locationFirst : undefined,
  };
}

/**
 * Venue NAME, or undefined when we genuinely don't know it.
 *
 * Used where a wrong name is worse than no name: the detail page's location
 * card and JSON-LD `Place.name`. An off-site event with no explicit venue
 * gets an address-only Place rather than a fabricated venue.
 */
export function eventVenueName(e: EventLocationFields): string | undefined {
  if (e.venue?.trim()) return e.venue.trim();
  const { address, namedVenue } = resolveLocation(e);
  if (isChamberOfficeAddress(address)) return CHAMBER_OFFICE_VENUE;
  if (namedVenue) return namedVenue;
  // A trusted address that isn't a street number is already a venue name.
  if (isVenueName(address)) return address;
  return undefined;
}

/**
 * One-line venue LABEL for cards and the timeline rail — never undefined when
 * there is any location at all, because "where" is the decision data those
 * surfaces exist to show. Falls back to the real street address rather than
 * mislabelling it as the chamber office.
 */
export function eventVenueLabel(e: EventLocationFields): string | null {
  if (e.venue?.trim()) return e.venue.trim();
  const { address, namedVenue } = resolveLocation(e);
  if (isChamberOfficeAddress(address)) return CHAMBER_OFFICE_SHORT;
  if (namedVenue) return namedVenue;
  return address || null;
}
