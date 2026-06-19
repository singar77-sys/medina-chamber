/**
 * /admin/registrations — DB-event registration management (gated by proxy.ts).
 *
 * Lists upcoming DB events with their registration counts so staff can open one
 * to add tickets, set capacity, publish it, and work the roster. This is keyed
 * on the DB event (not the static scrape) — the source of truth for on-site
 * registration.
 */

import Link from "next/link";
import { asc, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  published: { bg: "#f0fdf4", color: "#15803d" },
  draft: { bg: "#f8fafc", color: "#64748b" },
  cancelled: { bg: "#fef2f2", color: "#b91c1c" },
  completed: { bg: "#eff6ff", color: "#1d4ed8" },
};

export default async function AdminRegistrationsListPage() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      status: events.status,
      registrationCount: events.registrationCount,
      maxCapacity: events.maxCapacity,
    })
    .from(events)
    .where(gte(events.startsAt, today))
    .orderBy(asc(events.startsAt))
    .limit(100);

  return (
    <div className="px-6 py-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Event Registrations</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage tickets, capacity, and check-ins for upcoming events. Publish an event with at
          least one ticket to open on-site registration.
        </p>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white divide-y divide-gray-100">
        {rows.length === 0 ? (
          <p className="px-4 py-4 text-sm text-gray-400">No upcoming events.</p>
        ) : (
          rows.map((e) => {
            const s = STATUS_STYLE[e.status] ?? STATUS_STYLE.draft;
            return (
              <div key={e.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{e.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtDate(e.startsAt)}</p>
                </div>
                <span
                  className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded shrink-0"
                  style={{ background: s.bg, color: s.color }}
                >
                  {e.status}
                </span>
                <span className="text-xs text-gray-500 shrink-0 tabular-nums">
                  {e.registrationCount}
                  {e.maxCapacity != null ? `/${e.maxCapacity}` : ""} reg
                </span>
                <Link
                  href={`/admin/registrations/${e.id}`}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-opacity hover:opacity-80"
                  style={{ background: "#0C1B33" }}
                >
                  Manage
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
