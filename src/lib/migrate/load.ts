/**
 * Spreadsheet loading helpers for the GrowthZone → Postgres import.
 *
 * loadRows() does the only I/O in this module (reads an .xlsx off disk);
 * stripFooterRows() is pure so it can be unit-tested without a file.
 *
 * GrowthZone exports append footer/junk rows beneath the real data — a
 * "Count\Average\Totals" summary line, a "Generated <date> by <user>"
 * provenance line, and assorted stray cells.
 *
 * In some exports (e.g. Membership Invoices) the footer markers land in the
 * ContactId column as non-numeric text.  In others (Contacts Report, Event
 * Attendees Report) the marker appears in a DIFFERENT column (e.g.
 * "Contact Membership Status" or "Event Name") while ContactId is simply
 * blank.  stripFooterRows handles both shapes via a two-stage check:
 *   1. Any cell in any column whose value matches a known GrowthZone footer
 *      signature → drop the row regardless of which column it lives in.
 *   2. A present-but-non-numeric ContactId → also drop (catches the invoice
 *      footer pattern where the marker is already in ContactId).
 */
import XLSX from "xlsx";

/** A header-keyed spreadsheet row. */
export type Row = Record<string, unknown>;

/** True if v is a non-empty all-digits string (a valid GrowthZone ContactId). */
function isAllDigits(v: string): boolean {
  return v.length > 0 && /^\d+$/.test(v);
}

/** True if a single cell value is blank (null/undefined/empty-after-trim). */
function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  return String(v).trim() === "";
}

/**
 * True if a cell value matches a known GrowthZone footer signature.
 *
 * GrowthZone appends two footer rows to every export:
 *   - "Count\Average\Totals" — a summary/aggregate row
 *   - "Generated <date> by <user>" — a provenance row
 *
 * These appear in ContactId in some exports but in other columns (e.g.
 * "Contact Membership Status" or "Event Name") in others.  We check every
 * cell so the shape of the export doesn't matter.
 */
function isGzFooterSignature(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  if (s === "") return false;
  // "Count\Average\Totals" — literal backslashes in the GrowthZone data.
  if (/^Count\\Average\\Totals/i.test(s)) return true;
  // "Generated 6/17/2026 5:52:05 PM by Mark Hunter"
  if (/^Generated\b.*\bby\b/i.test(s)) return true;
  return false;
}

/** True if ANY cell in the row carries a GrowthZone footer signature. */
function hasFooterSignature(row: Row): boolean {
  return Object.values(row).some(isGzFooterSignature);
}

/** True if every field in the row is blank. */
function isEmptyRow(row: Row): boolean {
  return Object.values(row).every(isBlank);
}

/** True if every field EXCEPT 'ContactId' is blank — i.e. a lone-id row. */
function hasNoDataBesidesContactId(row: Row): boolean {
  return Object.entries(row).every(([key, v]) => key === "ContactId" || isBlank(v));
}

/**
 * Drop GrowthZone footer/junk rows from an array of header-keyed rows.
 *
 * Rules (applied in order):
 *  1. Drop any row that contains a GrowthZone footer signature in ANY cell —
 *     "Count\Average\Totals" or "Generated ... by ..." — regardless of which
 *     column the marker lands in.  This catches exports where the footer text
 *     is in ContactId (invoices) AND exports where it is in a different column
 *     (orgs: "Contact Membership Status"; events: "Event Name") with a blank
 *     ContactId.
 *  2. Drop fully-empty rows (every field blank).
 *  3. Drop rows whose 'ContactId' is present (non-empty) but NOT an all-digits
 *     string — belt-and-suspenders for any footer variant not caught above.
 *  4. Drop "lone-id" rows that carry a ContactId but no other data (e.g. a
 *     stray '736' summary cell). Real data rows always have other populated
 *     columns alongside the id, so this is safe.
 *  5. Keep rows with a blank ContactId that otherwise look like data (some
 *     other field is populated); a blank-id row that is otherwise empty is
 *     caught by rule 2.
 *
 * Note on the spec contradiction: the prose calls '736' a "stray value" to
 * drop, yet '736' is all-digits and so passes a pure all-digits test. The
 * distinguishing signal in the GrowthZone footer is that those stray cells
 * sit ALONE with no accompanying data columns, whereas a real ContactId row
 * has populated data fields. The lone-id rule resolves the contradiction and
 * matches the stated test outcome (drop the 3 junk rows, keep the numeric
 * data row and the blank-id data row).
 *
 * Pure: does not mutate the input array.
 */
export function stripFooterRows<T extends Row>(rows: T[]): T[] {
  return rows.filter((row) => {
    // Rule 1: drop rows that carry a GrowthZone footer signature in any cell.
    if (hasFooterSignature(row)) return false;

    // Rule 2: drop fully-empty rows.
    if (isEmptyRow(row)) return false;

    const hasContactIdKey = Object.prototype.hasOwnProperty.call(row, "ContactId");
    if (!hasContactIdKey) return true; // no key to judge on — keep as data

    const raw = row.ContactId;
    const id = raw === null || raw === undefined ? "" : String(raw).trim();

    // Rule 5: Blank ContactId on a non-empty row without a footer signature:
    // legitimately-blank data, keep it.
    if (id === "") return true;

    // Rule 3: Present ContactId that is not a numeric join key: footer text,
    // drop it (belt-and-suspenders; rule 1 should have caught it already).
    if (!isAllDigits(id)) return false;

    // Rule 4: Numeric ContactId but no other data alongside it: a lone footer cell.
    if (hasNoDataBesidesContactId(row)) return false;

    return true;
  });
}

/**
 * Read the first sheet of an .xlsx file into header-keyed row objects and
 * strip GrowthZone footer/junk rows. Blank cells become '' (defval).
 */
export function loadRows(filePath: string): Row[] {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
  return stripFooterRows(rows);
}
