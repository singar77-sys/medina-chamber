"use client";

/**
 * RegistrationRoster — admin roster + day-of check-in for an event.
 *
 * Lists every registration (member or guest) with status, and toggles check-in
 * via POST /api/admin/reg/checkin/[id] (confirmed ↔ attended). Authenticates via
 * the httpOnly admin_session cookie (sent automatically on same-origin fetch).
 */

import { useState } from "react";

export interface RosterRow {
  id: string;
  name: string;
  email: string | null;
  isMember: boolean;
  ticketName: string | null;
  quantity: number;
  status: string;
  checkedIn: boolean;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  confirmed: { bg: "#f0fdf4", color: "#15803d" },
  attended: { bg: "#eff6ff", color: "#1d4ed8" },
  waitlisted: { bg: "#fefce8", color: "#a16207" },
  pending: { bg: "#fff7ed", color: "#c2410c" },
  cancelled: { bg: "#f8fafc", color: "#64748b" },
};

export function RegistrationRoster({
  initialRegistrations,
}: {
  initialRegistrations: RosterRow[];
}) {
  const [rows, setRows] = useState<RosterRow[]>(initialRegistrations);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleCheckIn(row: RosterRow) {
    setBusy(row.id);
    const res = await fetch(`/api/admin/reg/checkin/${row.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ checkedIn: !row.checkedIn }),
    });
    if (res.ok) {
      setRows((rs) =>
        rs.map((r) =>
          r.id === row.id
            ? { ...r, checkedIn: !r.checkedIn, status: !r.checkedIn ? "attended" : "confirmed" }
            : r,
        ),
      );
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      alert(d.error ?? "Could not update check-in.");
    }
    setBusy(null);
  }

  const confirmedCount = rows.filter((r) => r.status === "confirmed" || r.status === "attended").length;
  const checkedInCount = rows.filter((r) => r.checkedIn).length;

  return (
    <section className="rounded-xl border border-gray-100 bg-white px-6 py-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Roster</h2>
        <p className="text-xs text-gray-400">
          {checkedInCount}/{confirmedCount} checked in · {rows.length} total
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">No registrations yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {rows.map((r) => {
            const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.cancelled;
            const canCheckIn = r.status === "confirmed" || r.status === "attended";
            return (
              <div key={r.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {r.name}
                    {!r.isMember && <span className="text-xs text-gray-400 font-normal"> · guest</span>}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {r.email}
                    {r.ticketName && ` · ${r.ticketName}`}
                    {r.quantity > 1 && ` ×${r.quantity}`}
                  </p>
                </div>
                <span
                  className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded shrink-0"
                  style={{ background: s.bg, color: s.color }}
                >
                  {r.status}
                </span>
                {canCheckIn && (
                  <button
                    onClick={() => toggleCheckIn(r)}
                    disabled={busy === r.id}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg border shrink-0 disabled:opacity-50"
                    style={
                      r.checkedIn
                        ? { borderColor: "#bfdbfe", color: "#1d4ed8", background: "#eff6ff" }
                        : { borderColor: "#e2e8f0", color: "#334155" }
                    }
                  >
                    {busy === r.id ? "…" : r.checkedIn ? "✓ In" : "Check in"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
