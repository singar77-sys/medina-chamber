"use client";

import { useState } from "react";
import Link from "next/link";

export interface CampaignRow {
  id: string;
  name: string;
  subject: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  unsubscribeCount: number;
  bounceCount: number;
  sentAt: string | null;
  createdAt: string;
}

const STATUS_STYLE: Record<string, { background: string; color: string }> = {
  draft: { background: "#f1f5f9", color: "#475569" },
  scheduled: { background: "#dbeafe", color: "#1e40af" },
  sending: { background: "#fef3c7", color: "#92400e" },
  sent: { background: "#d1fae5", color: "#065f46" },
  sent_with_errors: { background: "#ffedd5", color: "#9a3412" },
  cancelled: { background: "#f1f5f9", color: "#94a3b8" },
};

/** A campaign that has gone out (fully, partially, or mid-send) shows metrics. */
function hasSent(status: string): boolean {
  return status === "sent" || status === "sending" || status === "sent_with_errors";
}

export function CampaignsTable({ campaigns, adminToken }: { campaigns: CampaignRow[]; adminToken: string }) {
  const [rows, setRows] = useState(campaigns);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string, campaignName: string) {
    if (!confirm(`Delete draft "${campaignName}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        setRows((rs) => rs.filter((r) => r.id !== id));
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        alert(d.error ?? "Delete failed.");
      }
    } catch {
      alert("Connection error.");
    } finally {
      setDeleting(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white text-center py-12">
        <p className="text-sm text-gray-400">No campaigns yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500">
            <th className="px-4 py-2.5">Campaign</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5 text-right">Recipients</th>
            <th className="px-4 py-2.5 text-right">Opens</th>
            <th className="px-4 py-2.5">Created</th>
            <th className="px-4 py-2.5 text-right" />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const style = STATUS_STYLE[c.status] ?? STATUS_STYLE.draft;
            return (
              <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/campaigns/${c.id}`} className="font-medium text-gray-900 hover:underline">
                    {c.name}
                  </Link>
                  <p className="text-xs text-gray-400 truncate max-w-xs">{c.subject}</p>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs px-2 py-0.5 rounded font-medium capitalize" style={style}>
                    {c.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600">
                  {hasSent(c.status) ? c.sentCount : "—"}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600">
                  {c.sentCount > 0 ? `${Math.round((c.openCount / c.sentCount) * 100)}%` : "—"}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {c.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id, c.name)}
                      disabled={deleting === c.id}
                      aria-label={`Delete draft ${c.name}`}
                      className="text-xs text-red-600 hover:text-red-700 disabled:opacity-40"
                    >
                      {deleting === c.id ? "Deleting…" : "Delete"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
