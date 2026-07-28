"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * EventsCalendar — month-grid calendar for the /events page.
 *
 * Client component so the visitor can page between months; the event data
 * itself is a slim server-provided prop (slug/title/dateISO/startTime), so
 * events.json never ships to the client. Months span the current month
 * through the last month that has an upcoming event.
 *
 * `initialYm` and `todayISO` come from the server render (daily ISR), never
 * from client-side `new Date()`, so SSR and hydration always agree.
 */

export interface CalendarEvent {
  slug: string;
  title: string;
  dateISO: string; // YYYY-MM-DD
  startTime: string;
  location: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ymOf(dateISO: string): string {
  return dateISO.slice(0, 7);
}

/** List of "YYYY-MM" strings from `from` through `to`, inclusive. */
function monthRange(from: string, to: string): string[] {
  const months: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [toY, toM] = to.split("-").map(Number);
  while (y < toY || (y === toY && m <= toM)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return months;
}

export function EventsCalendar({
  events,
  initialYm,
  todayISO,
}: {
  events: CalendarEvent[];
  initialYm: string;
  todayISO: string;
}) {
  const lastYm = events.length ? ymOf(events[events.length - 1].dateISO) : initialYm;
  const months = monthRange(initialYm, lastYm);
  const [monthIdx, setMonthIdx] = useState(0);

  const ym = months[monthIdx];
  const [year, month] = ym.split("-").map(Number);
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const byDay = new Map<number, CalendarEvent[]>();
  for (const e of events) {
    if (ymOf(e.dateISO) !== ym) continue;
    const day = Number(e.dateISO.slice(8, 10));
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(e);
  }
  const monthEvents = events.filter((e) => ymOf(e.dateISO) === ym);

  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Month header + pager */}
      <div className="flex items-center justify-between mb-f13">
        <h3 className="text-h4">
          {MONTH_NAMES[month - 1]} {year}
        </h3>
        <div className="flex gap-f8">
          <button
            type="button"
            onClick={() => setMonthIdx((i) => Math.max(0, i - 1))}
            disabled={monthIdx === 0}
            aria-label="Previous month"
            className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] border border-border-primary text-text-secondary hover:border-cambridge hover:text-cambridge disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setMonthIdx((i) => Math.min(months.length - 1, i + 1))}
            disabled={monthIdx === months.length - 1}
            aria-label="Next month"
            className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] border border-border-primary text-text-secondary hover:border-cambridge hover:text-cambridge disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <p key={d} className="text-caption font-bold uppercase tracking-wider text-text-tertiary text-center py-f5">
            {d}
          </p>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-px bg-border-secondary border border-border-secondary rounded-[var(--radius-lg)] overflow-hidden">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`pad-${i}`} className="bg-bg-secondary/60 min-h-[64px] sm:min-h-[96px] lg:min-h-[108px]" />;
          }
          const iso = `${ym}-${String(day).padStart(2, "0")}`;
          const isToday = iso === todayISO;
          const dayEvents = byDay.get(day) ?? [];
          return (
            <div key={iso} className="bg-bg-primary min-h-[64px] sm:min-h-[96px] lg:min-h-[108px] p-1 sm:p-1.5">
              <p
                className={
                  isToday
                    ? "inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent text-white text-caption font-bold"
                    : "text-caption text-text-tertiary px-1"
                }
              >
                {day}
              </p>
              {dayEvents.length > 0 && (
                <div className="mt-1 space-y-1">
                  {dayEvents.map((e) => (
                    <Link
                      key={e.slug}
                      href={`/events/${e.slug}`}
                      title={`${e.title}${e.startTime ? ` · ${e.startTime}` : ""}`}
                      className="block truncate rounded px-1 py-0.5 text-[10px] sm:text-[11px] leading-tight font-semibold bg-cambridge/15 text-cambridge hover:bg-cambridge/30 transition-colors"
                    >
                      {e.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* This month's events, readable form (also the mobile-friendly view) */}
      {monthEvents.length > 0 ? (
        <ul className="mt-f21 border-t border-border-secondary">
          {monthEvents.map((e) => (
            <li key={e.slug} className="border-b border-border-secondary">
              <Link
                href={`/events/${e.slug}`}
                className="group flex items-baseline gap-f13 py-f8 min-w-0"
              >
                <span className="flex-shrink-0 w-16 text-caption font-bold text-cambridge tabular-nums">
                  {MONTH_NAMES[month - 1].slice(0, 3)} {Number(e.dateISO.slice(8, 10))}
                </span>
                <span className="text-body-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate">
                  {e.title}
                </span>
                {e.startTime && (
                  <span className="hidden sm:inline flex-shrink-0 ml-auto text-caption text-text-tertiary">
                    {e.startTime}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-f21 text-body-sm text-text-tertiary">
          Nothing scheduled in {MONTH_NAMES[month - 1]} yet — new events are added
          as the chamber announces them.
        </p>
      )}
    </div>
  );
}
