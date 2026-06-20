"use client";

import { useState } from "react";
import Link from "next/link";

export interface CommitteeRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  meetingSchedule: string | null;
  isPublic: boolean;
  isActive: boolean;
  memberCount: number;
}

const inputClass =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400";

export function CommitteesManager({ committees }: { committees: CommitteeRow[] }) {
  const [rows, setRows] = useState(committees);
  const [name, setName] = useState("");
  const [meetingSchedule, setMeetingSchedule] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/committees", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          meetingSchedule: meetingSchedule.trim() || null,
          description: description.trim() || null,
          isPublic,
          isActive,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(d.error ?? "Failed to create committee.");
        setCreating(false);
      }
    } catch {
      setErr("Connection error. Please try again.");
      setCreating(false);
    }
  }

  async function handleDelete(id: string, committeeName: string) {
    if (!confirm(`Delete "${committeeName}"? Its roster is removed too. This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/committees/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
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

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-100 bg-white px-6 py-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">New committee</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label htmlFor="cm-name" className="block text-xs font-medium text-gray-500 mb-1">Name</label>
            <input id="cm-name" value={name} onChange={(e) => setName(e.target.value)} required
              placeholder="e.g. Finance Committee" className={inputClass} />
          </div>
          <div>
            <label htmlFor="cm-sched" className="block text-xs font-medium text-gray-500 mb-1">Meeting schedule (optional)</label>
            <input id="cm-sched" value={meetingSchedule} onChange={(e) => setMeetingSchedule(e.target.value)}
              placeholder="First Tuesday of each month, 8:00am" className={inputClass} />
          </div>
          <div>
            <label htmlFor="cm-desc" className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
            <textarea id="cm-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="What this committee does" className={inputClass} />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              Shown on the public site
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active (open to join)
            </label>
          </div>
          {err && <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{err}</p>}
          <button type="submit" disabled={creating}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ background: "#0C1B33" }}>
            {creating ? "Creating…" : "Create committee"}
          </button>
        </form>
      </section>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white text-center py-12">
          <p className="text-sm text-gray-400">No committees yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500">
                <th className="px-4 py-2.5">Committee</th>
                <th className="px-4 py-2.5">Visibility</th>
                <th className="px-4 py-2.5 text-right">Members</th>
                <th className="px-4 py-2.5 text-right" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/committees/${c.id}`} className="font-medium text-gray-900 hover:underline">
                      {c.name}
                    </Link>
                    {c.meetingSchedule && <p className="text-xs text-gray-400 truncate max-w-xs">{c.meetingSchedule}</p>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs">
                      {c.isActive ? <span className="text-emerald-700">Active</span> : <span className="text-gray-400">Inactive</span>}
                      {" · "}
                      {c.isPublic ? "Public" : "Private"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{c.memberCount}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button type="button" onClick={() => handleDelete(c.id, c.name)} disabled={deleting === c.id}
                      aria-label={`Delete ${c.name}`}
                      className="text-xs text-red-600 hover:text-red-700 disabled:opacity-40">
                      {deleting === c.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
