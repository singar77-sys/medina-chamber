/**
 * Validation for hot-deal create/update bodies, shared by the member + admin
 * routes. Returns the whitelisted fields to write, or a 400 error message.
 * dealUrl is scheme-validated (http/https only) because it renders as a link on
 * the PUBLIC deals page — a javascript:/data: URL would be a stored-XSS vector.
 */

export interface DealValues {
  title?: string;
  description?: string;
  terms?: string | null;
  discountLabel?: string | null;
  redemptionInstructions?: string | null;
  dealUrl?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Trim an optional free-text field; null when empty; "ERR" when over `max`. */
function optText(v: unknown, max: number): string | null | "ERR" {
  if (v == null || v === "") return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > max ? "ERR" : t;
}

function optDate(v: unknown): string | null | "ERR" {
  if (v == null || v === "") return null;
  if (typeof v !== "string" || !ISO_DATE.test(v)) return "ERR";
  // JS Date rolls impossible days over (2024-02-31 → 2024-03-02) instead of NaN,
  // but a Postgres `date` column rejects them → an unhandled 500 on insert. Require
  // the parsed date to round-trip to the same string so 2024-02-31 et al are 400s.
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? "ERR" : v;
}

function optUrl(v: unknown): string | null | "ERR" {
  if (v == null || v === "") return null;
  if (typeof v !== "string") return "ERR";
  const t = v.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : "ERR";
  } catch {
    return "ERR";
  }
}

export function buildDealValues(
  body: Record<string, unknown>,
  opts: { requireCore: boolean },
): { values: DealValues } | { error: string } {
  const values: DealValues = {};

  if (opts.requireCore || "title" in body) {
    const t = typeof body.title === "string" ? body.title.trim() : "";
    if (opts.requireCore && !t) return { error: "Title is required." };
    if (t.length > 120) return { error: "Title is too long (max 120)." };
    if (t) values.title = t;
  }
  if (opts.requireCore || "description" in body) {
    const d = typeof body.description === "string" ? body.description.trim() : "";
    if (opts.requireCore && !d) return { error: "Description is required." };
    if (d.length > 4000) return { error: "Description is too long." };
    if (d) values.description = d;
  }

  const optionals: [keyof DealValues, unknown, number][] = [
    ["terms", body.terms, 2000],
    ["discountLabel", body.discountLabel, 60],
    ["redemptionInstructions", body.redemptionInstructions, 2000],
  ];
  for (const [key, raw, max] of optionals) {
    if (!(key in body)) continue;
    const r = optText(raw, max);
    if (r === "ERR") return { error: `${key} is too long.` };
    (values[key] as string | null) = r;
  }

  if ("dealUrl" in body) {
    const u = optUrl(body.dealUrl);
    if (u === "ERR") return { error: "The deal link must be a valid http(s) URL." };
    values.dealUrl = u;
  }
  if ("startsAt" in body) {
    const s = optDate(body.startsAt);
    if (s === "ERR") return { error: "Invalid start date (use YYYY-MM-DD)." };
    values.startsAt = s;
  }
  if ("endsAt" in body) {
    const e = optDate(body.endsAt);
    if (e === "ERR") return { error: "Invalid end date (use YYYY-MM-DD)." };
    values.endsAt = e;
  }
  // ISO date strings compare chronologically.
  if (values.startsAt && values.endsAt && values.endsAt < values.startsAt) {
    return { error: "The end date must be on or after the start date." };
  }
  if ("isActive" in body) values.isActive = body.isActive === true;

  return { values };
}
