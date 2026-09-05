/**
 * Shared GrowthZone event-subtitle parser for scrape-events.mjs.
 *
 * The `.gz-subtitle` node carries the whole date/time line as one string:
 *
 *   "Wednesday, April 15, 2026 (8:30 AM - 10:00 AM) (EDT)"   full range
 *   "Wednesday, September 30, 2026"                          date only
 *
 * Every chronological listing, the homepage date chip, and the JSON-LD
 * `startDate` are downstream of what this returns, and the scraper rewrites
 * src/data/events.json unattended every night. Lifted out of the scraper (which
 * runs its whole pipeline at module load and therefore cannot be imported) so
 * the parse has regression cover, matching the scripts/lib-html-to-text.mjs
 * pattern. Behavior is byte-for-byte what parseDetailPage did inline.
 */

const MONTHS = {
  January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
  July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
};

/**
 * Full "Day, Month D, YYYY (H:MM AM - H:MM PM)" line. The dash may be an ASCII
 * hyphen or an en dash; GrowthZone emits both.
 */
const DATE_WITH_RANGE =
  /(\w+),\s+(\w+)\s+(\d+),\s+(\d+)\s+\((\d+:\d+\s*[AP]M)\s*[-–]\s*(\d+:\d+\s*[AP]M)\)/i;

/** "Day, Month D, YYYY" with no time range at all. */
const DATE_ONLY = /^(\w+),\s+(\w+)\s+(\d+),\s+(\d+)/;

const toISO = (year, month, day) =>
  new Date(parseInt(year), MONTHS[month] ?? 0, parseInt(day))
    .toISOString()
    .split('T')[0];

/**
 * @param {string | undefined | null} rawSubtitle Raw `.gz-subtitle` text.
 * @returns {{dateString: string, dayOfWeek: string, month: string, day: number,
 *            year: number, startTime: string, endTime: string, dateISO: string}}
 */
export function parseEventSubtitle(rawSubtitle) {
  // The trailing parenthesised group is the timezone abbreviation ("(EDT)").
  // NOTE: this strips the LAST group only, so a subtitle that ends with the
  // time range instead of a timezone loses its times and falls through to the
  // date-only branch. That is the shipped behavior; live GrowthZone pages
  // always append the zone.
  const dateString = (rawSubtitle ?? '')
    .trim()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();

  let dayOfWeek = '', month = '', day = '', year = '', startTime = '', endTime = '', dateISO = '';

  const withRange = dateString.match(DATE_WITH_RANGE);
  if (withRange) {
    [, dayOfWeek, month, day, year, startTime, endTime] = withRange;
    dateISO = toISO(year, month, day);
  } else {
    // Date-only subtitles — no "(6:00 PM - 8:00 PM)" range. All-day items like
    // enrollment deadlines ("Wednesday, September 30, 2026") used to fail the
    // full match above and ship with a blank dateISO, which knocked them off
    // every chronological listing on the site.
    const dateOnly = dateString.match(DATE_ONLY);
    if (dateOnly) {
      [, dayOfWeek, month, day, year] = dateOnly;
      dateISO = toISO(year, month, day);
    }
  }

  return {
    dateString,
    dayOfWeek,
    month,
    // parseInt('') is NaN; `|| 0` is what the homepage chip renders, so a
    // subtitle this parser fails on shows up as a literal "0".
    day: parseInt(day) || 0,
    year: parseInt(year) || 0,
    startTime,
    endTime,
    dateISO,
  };
}
