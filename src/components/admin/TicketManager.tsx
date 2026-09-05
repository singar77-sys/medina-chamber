"use client";

/**
 * TicketManager — admin control for a DB event's on-site registration.
 *
 * Publish/unpublish + capacity (PATCH /api/admin/reg/events/[id]) and ticket
 * add/delete (POST .../tickets, DELETE /api/admin/reg/tickets/[id]). All calls
 * authenticate via the httpOnly admin_session cookie (sent automatically on
 * same-origin fetch). Adding the first ticket is what makes the event
 * registerable on the public site, so this is where staff turn an imported
 * event "live".
 */

import { useState } from "react";
import { formatCents } from "@/lib/format";

export interface AdminTicket {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  isMemberOnly: boolean;
  maxQuantity: number | null;
  soldCount: number;
}

const EVENT_STATUSES = ["draft", "published", "cancelled", "completed"] as const;

function dollars(cents: number): string {
  if (!cents) return "Free";
  // toFixed(2) has no thousands separator, so a $1,234 sponsorship ticket
  // rendered as "$1234.00". formatCents is the shared Intl formatter.
  return formatCents(cents);
}

export function TicketManager({
  eventId,
  initialStatus,
  initialCapacity,
  initialTickets,
}: {
  eventId: string;
  initialStatus: string;
  initialCapacity: number | null;
  initialTickets: AdminTicket[];
}) {
  const [status, setStatus] = useState(initialStatus);
  const [capacity, setCapacity] = useState(initialCapacity?.toString() ?? "");
  const [tickets, setTickets] = useState<AdminTicket[]>(initialTickets);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

  // New-ticket form
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [memberOnly, setMemberOnly] = useState(false);
  const [maxQty, setMaxQty] = useState("");
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState("");

  function authFetch(url: string, method: string, body?: unknown) {
    return fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async function saveSettings() {
    setSavingSettings(true);
    setSettingsMsg("");
    const cap = capacity.trim() === "" ? null : Number(capacity);
    if (cap !== null && (!Number.isInteger(cap) || cap < 0)) {
      setSettingsMsg("Capacity must be a whole number.");
      setSavingSettings(false);
      return;
    }
    const res = await authFetch(`/api/admin/reg/events/${eventId}`, "PATCH", {
      status,
      maxCapacity: cap,
    });
    setSettingsMsg(res.ok ? "Saved." : "Could not save settings.");
    setSavingSettings(false);
  }

  async function addTicket(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddErr("");
    const priceCents = Math.round(Number(price || "0") * 100);
    const body = {
      name: name.trim(),
      priceCents,
      isMemberOnly: memberOnly,
      maxQuantity: maxQty.trim() === "" ? null : Number(maxQty),
      sortOrder: tickets.length,
    };
    const res = await authFetch(`/api/admin/reg/events/${eventId}/tickets`, "POST", body);
    if (res.ok) {
      const { ticket } = (await res.json()) as { ticket: AdminTicket };
      setTickets((t) => [...t, ticket]);
      setName("");
      setPrice("");
      setMemberOnly(false);
      setMaxQty("");
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setAddErr(d.error ?? "Could not add ticket.");
    }
    setAdding(false);
  }

  async function removeTicket(id: string) {
    const res = await authFetch(`/api/admin/reg/tickets/${id}`, "DELETE");
    if (res.ok) {
      setTickets((t) => t.filter((x) => x.id !== id));
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      alert(d.error ?? "Could not delete ticket.");
    }
  }

  const inputClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400";

  return (
    <div className="space-y-6">
      {/* ── Registration settings ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-100 bg-white px-6 py-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Registration settings</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              {EVENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Capacity (blank = unlimited)</label>
            <input
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              inputMode="numeric"
              placeholder="—"
              className={`${inputClass} w-40`}
            />
          </div>
          <button
            onClick={saveSettings}
            disabled={savingSettings}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ background: "#0C1B33" }}
          >
            {savingSettings ? "Saving…" : "Save settings"}
          </button>
          {settingsMsg && <span className="text-xs text-gray-500">{settingsMsg}</span>}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          An event must be <strong>published</strong> and have at least one ticket to accept on-site
          registration.
        </p>
      </section>

      {/* ── Tickets ───────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-100 bg-white px-6 py-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Tickets</h2>

        {tickets.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">No tickets yet — add one below to open registration.</p>
        ) : (
          <div className="divide-y divide-gray-100 mb-4">
            {tickets.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {t.name}{" "}
                    {t.isMemberOnly && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded ml-1" style={{ background: "#eff6ff", color: "#1e40af" }}>
                        Members
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {dollars(t.priceCents)}
                    {t.maxQuantity != null && ` · ${t.soldCount}/${t.maxQuantity} sold`}
                    {t.maxQuantity == null && t.soldCount > 0 && ` · ${t.soldCount} sold`}
                  </p>
                </div>
                <button
                  onClick={() => removeTicket(t.id)}
                  className="text-xs text-red-600 hover:text-red-800 px-2 py-1"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add ticket */}
        <form onSubmit={addTicket} className="border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Add a ticket</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Name (e.g. Member Rate)" className={inputClass} />
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="Price (USD, 0 = free)" className={inputClass} />
            <input value={maxQty} onChange={(e) => setMaxQty(e.target.value)} inputMode="numeric" placeholder="Max quantity (blank = unlimited)" className={inputClass} />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={memberOnly} onChange={(e) => setMemberOnly(e.target.checked)} />
              Members only
            </label>
          </div>
          {addErr && <p className="text-xs text-red-600 mt-2">{addErr}</p>}
          <button
            type="submit"
            disabled={adding}
            className="mt-3 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ background: "#0C1B33" }}
          >
            {adding ? "Adding…" : "Add ticket"}
          </button>
        </form>
      </section>
    </div>
  );
}
