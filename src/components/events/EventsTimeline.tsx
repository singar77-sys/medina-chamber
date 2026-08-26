import Link from "next/link";

/**
 * EventsTimeline — the "signal rail" that replaced the month-grid calendar
 * (client feedback 2026-08-25: a 35-cell grid with two visible events was
 * ~94% dead space, hid the pipeline's depth behind arrow clicks, and
 * duplicated itself in a list below).
 *
 * Design: a luminous vertical rail. Every upcoming event is a card on the
 * rail with its decision data — day, time, venue, price — at a glance. The
 * next event pulses coquelicot as NEXT UP. A mono month-pip strip up top
 * does the calendar's one real job (how far out does the pipeline go?) in
 * one row, and each pip anchor-jumps to its month group.
 *
 * Server component, zero client JS: jumps are #anchors, glow/pulse are CSS.
 * Band Book: lives inside the /events sigil band; cards are opaque
 * bg-secondary per the T4 rules (no /75 outside CTA bands).
 */

export interface TimelineEvent {
  slug: string;
  title: string;
  dateISO: string; // YYYY-MM-DD
  dayOfWeek: string;
  day: number;
  startTime: string;
  location?: string;
  /** Pre-trimmed server-side: "Free", "$24", "$230", … */
  priceLine?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ymOf(dateISO: string): string {
  return dateISO.slice(0, 7);
}

function monthLabel(ym: string): { short: string; long: string; year: string } {
  const [y, m] = ym.split("-").map(Number);
  const name = MONTH_NAMES[m - 1] ?? "";
  return { short: name.slice(0, 3).toUpperCase(), long: name, year: String(y) };
}

/** Trim a venue string to its name — drop the street address tail. */
function venueName(location?: string): string | null {
  if (!location) return null;
  const name = location.split(",")[0].trim();
  // A bare street address ("139 N. Court Street…") isn't a venue name worth
  // a chip — the chamber office is the default and reads as noise.
  return /^\d/.test(name) ? "Chamber Office" : name;
}

export function EventsTimeline({ events }: { events: TimelineEvent[] }) {
  const sorted = [...events].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const months: { ym: string; items: TimelineEvent[] }[] = [];
  for (const e of sorted) {
    const ym = ymOf(e.dateISO);
    const last = months[months.length - 1];
    if (last && last.ym === ym) last.items.push(e);
    else months.push({ ym, items: [e] });
  }
  const nextSlug = sorted[0]?.slug;

  return (
    <div>
      {/* Month density strip — the pipeline at a glance, one pip row per
          month, each an anchor jump. Replaces the entire month-grid. */}
      <nav
        aria-label="Jump to month"
        className="flex flex-wrap gap-f8 mb-f34"
      >
        {months.map(({ ym, items }) => {
          const { short, year } = monthLabel(ym);
          return (
            <a
              key={ym}
              href={`#tl-${ym}`}
              className="
                group inline-flex items-center gap-f8 px-f13 py-f8
                bg-bg-secondary border border-border-secondary
                rounded-[var(--radius-md)]
                hover:border-cambridge/60 transition-colors
              "
            >
              <span className="font-mono text-caption font-bold tracking-widest text-text-secondary group-hover:text-cambridge transition-colors">
                {short} <span className="text-text-tertiary">{year.slice(2)}</span>
              </span>
              <span className="flex gap-[3px]" aria-label={`${items.length} events`}>
                {items.slice(0, 6).map((_, i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-cambridge/70"
                  />
                ))}
                {items.length > 6 && (
                  <span className="font-mono text-caption text-cambridge/70 leading-none">+</span>
                )}
              </span>
            </a>
          );
        })}
      </nav>

      {/* The rail */}
      <div className="relative">
        {/* Luminous spine — gradient fades in at the top, out at the bottom */}
        <div
          aria-hidden="true"
          className="absolute left-[7px] sm:left-[9px] top-2 bottom-2 w-px
            bg-gradient-to-b from-transparent via-cambridge/45 to-transparent"
        />

        <div className="space-y-f34">
          {months.map(({ ym, items }) => {
            const { long, year } = monthLabel(ym);
            return (
              <section key={ym} id={`tl-${ym}`} className="scroll-mt-f89">
                <h3 className="pl-f34 sm:pl-f55 font-mono text-caption font-bold uppercase tracking-[0.22em] text-text-tertiary mb-f13">
                  {long} <span className="text-cambridge">{year}</span>
                </h3>
                <div className="space-y-f13">
                  {items.map((e) => {
                    const isNext = e.slug === nextSlug;
                    const venue = venueName(e.location);
                    return (
                      <div key={e.slug} className="relative pl-f34 sm:pl-f55">
                        {/* Node on the spine */}
                        <span
                          aria-hidden="true"
                          className={
                            isNext
                              ? "absolute left-0 sm:left-[2px] top-[26px] w-[15px] h-[15px] rounded-full bg-accent shadow-[0_0_12px_rgba(255,64,0,0.55)] animate-pulse motion-reduce:animate-none"
                              : "absolute left-[3px] sm:left-[5px] top-[29px] w-[9px] h-[9px] rounded-full bg-cambridge/80"
                          }
                        />
                        <Link
                          href={`/events/${e.slug}`}
                          className={`
                            group grid grid-cols-[3.5rem_1fr] sm:grid-cols-[4.5rem_1fr_auto] gap-f13 sm:gap-f21 items-center
                            p-f13 sm:px-f21
                            bg-bg-secondary border rounded-[var(--radius-lg)]
                            transition-all
                            ${
                              isNext
                                ? "border-accent/50 hover:border-accent hover:shadow-[0_0_28px_-6px_rgba(255,64,0,0.35)]"
                                : "border-border-secondary hover:border-cambridge/50 hover:shadow-cambridge"
                            }
                          `}
                        >
                          {/* Date block */}
                          <div className="text-center">
                            <div className="font-mono text-caption font-bold uppercase tracking-widest text-text-tertiary">
                              {e.dayOfWeek.slice(0, 3)}
                            </div>
                            <div className="text-h2 font-bold leading-none text-text-primary tabular-nums">
                              {e.day}
                            </div>
                          </div>

                          {/* Body */}
                          <div className="min-w-0">
                            {isNext && (
                              <p className="font-mono text-caption font-bold tracking-[0.22em] text-accent mb-f3">
                                ▸ NEXT UP
                              </p>
                            )}
                            <p className="text-body font-bold text-text-primary leading-snug group-hover:text-cambridge transition-colors">
                              {e.title}
                            </p>
                            <p className="font-mono text-caption text-text-tertiary mt-f3 truncate">
                              {e.startTime}
                              {venue ? <> · {venue}</> : null}
                              {/* price inline on mobile (3rd column hidden) */}
                              {e.priceLine ? (
                                <span className="sm:hidden"> · {e.priceLine}</span>
                              ) : null}
                            </p>
                          </div>

                          {/* Price chip + chevron (≥sm) */}
                          <div className="hidden sm:flex items-center gap-f13">
                            {e.priceLine && (
                              <span
                                className={`
                                  font-mono text-caption font-bold px-f8 py-[3px]
                                  rounded-full border
                                  ${
                                    e.priceLine === "Free"
                                      ? "text-cambridge border-cambridge/40"
                                      : "text-text-secondary border-border-primary"
                                  }
                                `}
                              >
                                {e.priceLine}
                              </span>
                            )}
                            <span
                              aria-hidden="true"
                              className="text-text-tertiary group-hover:text-cambridge group-hover:translate-x-1 transition-all"
                            >
                              →
                            </span>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
