/**
 * Small string-formatting helpers used across the site.
 * Keep this file pure: no React, no Next imports.
 */

/**
 * Strip the protocol and trailing slash from a URL for display.
 * "https://www.example.com/" -> "www.example.com"
 */
export function domainOnly(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * Build a `mailto:` href. Percent-encodes the local-part so unusual
 * characters don't break the URL, then restores the `@` for readability.
 * Subjects (when provided) are always encoded.
 */
export function mailto(address: string, subject?: string): string {
  const base = `mailto:${encodeURIComponent(address).replace(/%40/g, "@")}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
}

// ── Money ──────────────────────────────────────────────────────────────────────

/**
 * Format an amount in cents as US currency: 5750 -> "$57.50".
 *
 * BOTH fraction digits are pinned to 2 so every money surface — the invoice
 * table on /portal/billing, the receipt and renewal emails, the admin roster —
 * renders the same amount for the same cents.
 *
 * The shape this replaces was `` `$${(cents / 100).toLocaleString("en-US")}` ``:
 * no `style: "currency"`, so no minor-unit default, so 5750 printed as "$57.5".
 * (Under `style: "currency"` USD already caps at 2, which is why the call sites
 * that set only minimumFractionDigits were never actually affected.)
 */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Dates ──────────────────────────────────────────────────────────────────────
//
// Membership and event records hold DATE-ONLY values: a "YYYY-MM-DD" string, or
// a Date pinned to midnight UTC (that's how the event import stores startsAt —
// there is no real clock time in it). Formatting midnight UTC in Eastern time
// lands on 8pm the PREVIOUS day, which is the bug that once showed events on the
// wrong date, so every helper below both parses and renders in UTC — for a
// date-only value, UTC *is* the intended calendar day.
//
// A timestamp that carries a real clock time must NOT use these. Format that in
// "America/New_York" at the call site.

const LONG_DATE = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const WEEKDAY_DATE = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

/** A "YYYY-MM-DD" string becomes midnight UTC; a Date passes through. */
function asDateOnly(value: Date | string): Date {
  return typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
}

/**
 * Intl throws RangeError on an invalid Date, where the toLocaleDateString calls
 * these replaced returned "Invalid Date". Every caller is a Server Component or
 * an email builder, so a throw is a 500 or a dropped send over one malformed
 * string. Degrade the way the old code did instead.
 */
function safeFormat(fmt: Intl.DateTimeFormat, value: Date | string): string {
  const d = asDateOnly(value);
  return Number.isNaN(d.getTime()) ? "—" : fmt.format(d);
}

/** "September 5, 2026". Nullish renders as an em dash. */
export function formatDateLong(value: Date | string | null | undefined): string {
  return value ? safeFormat(LONG_DATE, value) : "—";
}

/** "Sep 5, 2026". Nullish renders as an em dash. */
export function formatDateShort(value: Date | string | null | undefined): string {
  return value ? safeFormat(SHORT_DATE, value) : "—";
}

/** "Saturday, September 5, 2026". */
export function formatDateWithWeekday(value: Date | string): string {
  return safeFormat(WEEKDAY_DATE, value);
}
