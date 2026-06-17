/**
 * Pure coercion helpers for the GrowthZone → Postgres import.
 *
 * No database access, no I/O — every function takes a raw cell value
 * (string | number | null | undefined) and returns a normalized primitive.
 * GrowthZone .xlsx exports give us Excel serial dates, dollar-string money,
 * and whitespace-padded strings; these turn that into ISO dates, integer
 * cents, and trimmed-or-null strings.
 */

/** Days between the Unix epoch (1970-01-01) and the Excel epoch (1899-12-30). */
const EXCEL_UNIX_OFFSET_DAYS = 25569;
const MS_PER_DAY = 86400 * 1000;
/** Excel's max serial date (1899-12-30 + 2958465 days = 9999-12-31). */
const EXCEL_MAX_SERIAL = 2958465;

/**
 * Convert an Excel serial date number to an ISO 'YYYY-MM-DD' (UTC) string.
 *
 * Accepts a serial number (which may carry a fractional time component, e.g.
 * 45859.39 for a time-of-day) or a numeric string. Returns null for blank /
 * null / undefined / non-numeric / out-of-range input.
 *
 * Uses the standard offset of 25569 days, which already accounts for Excel's
 * 1900 leap-year bug as the values are actually stored in the file.
 */
export function excelDateToISO(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;

  const serial = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(serial)) return null;
  // Valid Excel dates start at serial 1; reject zero/negative and absurd values.
  if (serial < 1 || serial > EXCEL_MAX_SERIAL) return null;

  const ms = Math.round((serial - EXCEL_UNIX_OFFSET_DAYS) * MS_PER_DAY);
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
}

/**
 * Parse a dollar amount into integer cents.
 *
 * Accepts a number (12) or string ('295', '$1,118.50') with optional '$' and
 * comma group separators. Returns null for blank / null / undefined /
 * non-numeric input. Money is always stored as integer cents — never floats.
 */
export function parseCents(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  let s = String(value).trim();
  if (s === "") return null;

  // Strip currency symbols and thousands separators.
  s = s.replace(/[$,]/g, "").trim();
  if (s === "") return null;

  const dollars = Number(s);
  if (!Number.isFinite(dollars)) return null;

  return Math.round(dollars * 100);
}

/**
 * Trim a string value; return null for empty (or whitespace-only) strings.
 * Pass-through null/undefined as null. Non-strings are coerced via String().
 */
export function cleanStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}
