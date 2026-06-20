"use client";

import { useState } from "react";

export interface AdminDealRow {
  id: string;
  title: string;
  description: string;
  discountLabel: string | null;
  orgName: string;
  isActive: boolean;
  isApproved: boolean;
  startsAt: string | null;
  endsAt: string | null;
  dealUrl: string | null;
  terms: string | null;
  redemptionInstructions: string | null;
}

export function DealsModeration({ deals }: { deals: AdminDealRow[] }) {
  const [rows, setRows] = useState(deals);
  const [busy, setBusy] = useState<string | null>(null);

  async function setApproval(id: string, approved: boolean) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/deals/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: approved }),
      });
      if (res.ok) {
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, isApproved: approved } : r)));
      } else {
        alert("Update failed.");
      }
    } catch {
      alert("Connection error.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/deals/${id}`, { method: "DELETE", credentials: "same-origin" });
      if (res.ok) {
        setRows((rs) => rs.filter((r) => r.id !== id));
      } else {
        alert("Delete failed.");
      }
    } catch {
      alert("Connection error.");
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white text-center py-12">
        <p className="text-sm text-gray-400">No deals submitted yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((d) => (
        <div
          key={d.id}
          className="rounded-xl border bg-white px-5 py-4"
          style={{ borderColor: d.isApproved ? "#e5e7eb" : "#fcd34d" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {!d.isApproved && (
                  <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: "#fef3c7", color: "#92400e" }}>
                    Pending
                  </span>
                )}
                {!d.isActive && <span className="text-xs text-gray-400">Paused by member</span>}
                {d.discountLabel && (
                  <span className="text-xs font-bold" style={{ color: "#FF4000" }}>{d.discountLabel}</span>
                )}
              </div>
              <p className="font-medium text-gray-900 mt-1">{d.title}</p>
              <p className="text-xs text-gray-400">{d.orgName}</p>
              <p className="text-sm text-gray-600 mt-1">{d.description}</p>
              {d.redemptionInstructions && (
                <p className="text-xs text-gray-500 mt-1"><strong>Redeem:</strong> {d.redemptionInstructions}</p>
              )}
              {d.terms && <p className="text-xs text-gray-400 mt-1">{d.terms}</p>}
              {(d.startsAt || d.endsAt) && (
                <p className="text-xs text-gray-400 mt-1">
                  {d.startsAt ? `From ${d.startsAt}` : "Available now"}
                  {d.endsAt ? ` · through ${d.endsAt}` : " · ongoing"}
                </p>
              )}
              {d.dealUrl && (
                <a href={d.dealUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block break-all">
                  {d.dealUrl}
                </a>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {d.isApproved ? (
                <button type="button" onClick={() => setApproval(d.id, false)} disabled={busy === d.id}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  Unapprove
                </button>
              ) : (
                <button type="button" onClick={() => setApproval(d.id, true)} disabled={busy === d.id}
                  className="text-xs px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: "#047857" }}>
                  Approve
                </button>
              )}
              <button type="button" onClick={() => handleDelete(d.id, d.title)} disabled={busy === d.id}
                aria-label={`Delete ${d.title}`}
                className="text-xs text-red-600 hover:text-red-700 disabled:opacity-40">
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
