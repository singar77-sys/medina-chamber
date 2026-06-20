"use client";

import { useState } from "react";

type Status = "new" | "contacted" | "won" | "declined";

export interface SponsorshipInquiry {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string | null;
  interest: string | null;
  message: string | null;
  status: Status;
  staffNote: string | null;
  createdAt: string;
}

const STATUS_META: Record<Status, { label: string; bg: string; fg: string }> = {
  new: { label: "New", bg: "#fef3c7", fg: "#92400e" },
  contacted: { label: "Contacted", bg: "#dbeafe", fg: "#1e40af" },
  won: { label: "Won", bg: "#dcfce7", fg: "#166534" },
  declined: { label: "Declined", bg: "#f3f4f6", fg: "#4b5563" },
};

const FLOW: Status[] = ["new", "contacted", "won", "declined"];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function SponsorshipQueue({ initial }: { initial: SponsorshipInquiry[] }) {
  const [rows, setRows] = useState(initial);
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(initial.map((r) => [r.id, r.staffNote ?? ""])),
  );
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/sponsorships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      return res.ok;
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(id: string, status: Status) {
    const ok = await patch(id, { status });
    if (ok) setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  async function saveNote(id: string) {
    const ok = await patch(id, { staffNote: notes[id] ?? "" });
    if (ok) setRows((rs) => rs.map((r) => (r.id === id ? { ...r, staffNote: notes[id] ?? "" } : r)));
  }

  async function remove(id: string) {
    if (!confirm("Delete this inquiry permanently?")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/sponsorships/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) setRows((rs) => rs.filter((r) => r.id !== id));
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-12 text-center">
        No sponsorship inquiries yet. Submissions from the public sponsorship page land here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((r) => {
        const meta = STATUS_META[r.status];
        return (
          <div
            key={r.id}
            className="bg-white border rounded-lg p-5"
            style={{ borderColor: r.status === "new" ? "#fcd34d" : "#e5e7eb" }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{r.businessName}</h3>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: meta.bg, color: meta.fg }}
                  >
                    {meta.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-0.5">
                  {r.contactName} ·{" "}
                  <a href={`mailto:${r.email}`} className="text-blue-700 hover:underline">
                    {r.email}
                  </a>
                  {r.phone ? ` · ${r.phone}` : ""}
                </p>
              </div>
              <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
            </div>

            {r.interest && (
              <p className="text-sm text-gray-700 mt-3">
                <span className="text-gray-500">Interested in:</span> {r.interest}
              </p>
            )}
            {r.message && (
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{r.message}</p>
            )}

            {/* Status pipeline */}
            <div className="flex flex-wrap gap-2 mt-4">
              {FLOW.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy === r.id || r.status === s}
                  onClick={() => setStatus(r.id, s)}
                  className="text-xs font-medium px-3 py-1.5 rounded-md border disabled:opacity-100 enabled:hover:bg-gray-50 transition-colors"
                  style={
                    r.status === s
                      ? { background: STATUS_META[s].bg, color: STATUS_META[s].fg, borderColor: "transparent" }
                      : { borderColor: "#e5e7eb", color: "#4b5563" }
                  }
                >
                  {STATUS_META[s].label}
                </button>
              ))}
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => remove(r.id)}
                className="text-xs font-medium px-3 py-1.5 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors ml-auto"
              >
                Delete
              </button>
            </div>

            {/* Staff note */}
            <div className="mt-4 flex items-start gap-2">
              <textarea
                rows={2}
                value={notes[r.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                placeholder="Internal note…"
                className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-gray-500 resize-none"
              />
              <button
                type="button"
                disabled={busy === r.id || (notes[r.id] ?? "") === (r.staffNote ?? "")}
                onClick={() => saveNote(r.id)}
                className="text-xs font-semibold px-3 py-2 rounded-md text-white disabled:opacity-40"
                style={{ background: "#0C1B33" }}
              >
                Save note
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
