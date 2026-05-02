/**
 * Icebreaker question loader.
 *
 * Pulls the question list from a public Google Sheet so Jaclyn can edit
 * questions without anyone touching code. She updates the sheet → within
 * the cache TTL the live site picks up the change.
 *
 * Source: https://docs.google.com/spreadsheets/d/e/2PACX-...pub?output=csv
 *
 * Caching: Next.js `fetch` with `next.revalidate` keeps the CSV cached
 * for 1 hour per origin. First request after TTL expiry triggers a
 * background refetch; every other request serves the cached value.
 *
 * Resilience: any fetch/parse failure falls back to a baked-in list so
 * /icebreaker never shows an empty state. Sentry captures the error so
 * we know the sync broke.
 */

import * as Sentry from "@sentry/nextjs";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRKKx5FGx821Cy5mvgradDXBLqlk2h1S90_MdnURM5h-smXnvOegJonV05aROX1hd6nZ7jwiv49AHHz/pub?output=csv";

const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Fallback — matches what used to be hardcoded in the page, kept here
 * verbatim as a safety net. If the Sheet ever goes away, these still
 * ship. Update rarely — the sheet is the source of truth.
 */
const FALLBACK_QUESTIONS: string[] = [
  "What's the best business advice you've ever ignored?",
  "If your business had a theme song, what would it be?",
  "What's the weirdest thing a customer has ever asked you?",
  "What did you want to be when you were 10?",
  "If you could have lunch with any business owner in Medina, who?",
  "What's the one thing about your business most people don't know?",
  "Describe your Monday morning in three words.",
  "What's the most underrated restaurant on the Square?",
  "If you weren't in your industry, what would you do?",
  "What's the best purchase you've made for your business under $50?",
  "Coffee order, go.",
  "What's one skill you wish you had for your business?",
  "Worst networking event experience, spill it.",
  "What's the most Medina thing about you?",
  "If your business was a Medina landmark, which one?",
  "What brought you to Medina County?",
  "What's your unpopular business opinion?",
  "If you could instantly master one tool or software, what?",
  "Best thing about doing business in a small town?",
  "What would your employees say is your catchphrase?",
  "If the Chamber had a mascot, what should it be?",
  "What's the first thing you do when you get to work?",
  "Name a local business you think everyone should know about.",
  "What's on your desk right now that says a lot about you?",
  "If you could add one thing to the Medina Square, what?",
  "What's the hardest lesson you learned in your first year of business?",
  "Elevator pitch, but make it weird.",
  "What's the best compliment a customer has ever given you?",
  "If your business had a secret menu item, what would it be?",
  "What do you do in Medina when you're NOT working?",
];

/**
 * Minimal CSV parser — handles the one dialect Google Sheets emits:
 *   - fields with commas or newlines are wrapped in double quotes
 *   - literal double quotes inside a field are doubled ("")
 *
 * Returns rows as arrays of cell strings. We then take cell[0] of each
 * row as the question.
 *
 * Yes, this reinvents a tiny slice of csv-parse — but the full parser
 * is 30kb and we're running in edge. 40 lines beats a dep here.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Fetches the question list from the published Google Sheet.
 * Returns FALLBACK_QUESTIONS on any failure — never throws.
 */
export async function getIcebreakerQuestions(): Promise<string[]> {
  try {
    const res = await fetch(SHEET_CSV_URL, {
      next: { revalidate: CACHE_TTL_SECONDS },
    });
    if (!res.ok) {
      throw new Error(`Sheet fetch returned ${res.status}`);
    }
    const text = await res.text();
    const rows = parseCsv(text);

    // First row may be a header ("question"). Drop it if it looks like one.
    const first = rows[0]?.[0]?.trim().toLowerCase();
    const startAt = first === "question" || first === "questions" ? 1 : 0;

    const questions = rows
      .slice(startAt)
      .map((r) => r[0]?.trim() ?? "")
      .filter((q) => q.length > 0);

    if (questions.length === 0) {
      throw new Error("Sheet returned 0 usable rows");
    }
    return questions;
  } catch (err) {
    console.error("[icebreaker] failed to load from sheet, using fallback:", err);
    Sentry.captureException(err, {
      tags: { feature: "icebreaker", path: "sheet-load" },
      extra: { sheetUrl: SHEET_CSV_URL },
    });
    return FALLBACK_QUESTIONS;
  }
}
