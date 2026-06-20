"use client";

import { useState } from "react";

export interface CommitteeData {
  id: string;
  name: string;
  description: string | null;
  meetingSchedule: string | null;
  isPublic: boolean;
  isActive: boolean;
}

export interface RosterRow {
  memberId: string;
  role: string;
  orgName: string;
  contactName: string | null;
  contactEmail: string | null;
  joinedAt: string;
}

const inputClass =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400";

export function CommitteeEditor({
  committee,
  roster,
}: {
  committee: CommitteeData;
  roster: RosterRow[];
}) {
  const [name, setName] = useState(committee.name);
  const [meetingSchedule, setMeetingSchedule] = useState(committee.meetingSchedule ?? "");
  const [description, setDescription] = useState(committee.description ?? "");
  const [isPublic, setIsPublic] = useState(committee.isPublic);
  const [isActive, setIsActive] = useState(committee.isActive);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [members, setMembers] = useState(roster);
  const [removing, setRemoving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/committees/${committee.id}`, {
        method: "PATCH",
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
        setSaved(true);
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(d.error ?? "Failed to save.");
      }
    } catch {
      setErr("Connection error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(memberId: string, orgName: string) {
    if (!confirm(`Remove ${orgName} from this committee?`)) return;
    setRemoving(memberId);
    try {
      const res = await fetch(`/api/admin/committees/${committee.id}/members/${memberId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) {
        setMembers((ms) => ms.filter((m) => m.memberId !== memberId));
      } else {
        alert("Remove failed.");
      }
    } catch {
      alert("Connection error.");
    } finally {
      setRemoving(null);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${committee.name}"? Its roster is removed too. This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/committees/${committee.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) {
        window.location.href = "/admin/committees";
      } else {
        alert("Delete failed.");
        setDeleting(false);
      }
    } catch {
      alert("Connection error.");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <form onSubmit={handleSave} className="rounded-xl border border-gray-100 bg-white px-6 py-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Committee details</h2>
        <div>
          <label htmlFor="ce-name" className="block text-xs font-medium text-gray-500 mb-1">Name</label>
          <input id="ce-name" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} required className={inputClass} />
        </div>
        <div>
          <label htmlFor="ce-sched" className="block text-xs font-medium text-gray-500 mb-1">Meeting schedule</label>
          <input id="ce-sched" value={meetingSchedule} onChange={(e) => { setMeetingSchedule(e.target.value); setSaved(false); }} className={inputClass} />
        </div>
        <div>
          <label htmlFor="ce-desc" className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          <textarea id="ce-desc" value={description} onChange={(e) => { setDescription(e.target.value); setSaved(false); }} rows={3} className={inputClass} />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={isPublic} onChange={(e) => { setIsPublic(e.target.checked); setSaved(false); }} />
            Shown on the public site
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={isActive} onChange={(e) => { setIsActive(e.target.checked); setSaved(false); }} />
            Active (open to join)
          </label>
        </div>
        {err && <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{err}</p>}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50" style={{ background: "#0C1B33" }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <span className="text-sm text-emerald-700">Saved ✓</span>}
          <button type="button" onClick={handleDelete} disabled={deleting} className="ml-auto text-xs text-red-600 hover:text-red-700 disabled:opacity-40">
            {deleting ? "Deleting…" : "Delete committee"}
          </button>
        </div>
      </form>

      <section className="rounded-xl border border-gray-100 bg-white px-6 py-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Roster ({members.length})</h2>
        {members.length === 0 ? (
          <p className="text-sm text-gray-400">No members yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                <th className="py-2">Member</th>
                <th className="py-2">Role</th>
                <th className="py-2">Joined</th>
                <th className="py-2 text-right" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.memberId} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5">
                    <p className="font-medium text-gray-900">{m.orgName}</p>
                    {m.contactName && <p className="text-xs text-gray-400">{m.contactName}{m.contactEmail ? ` · ${m.contactEmail}` : ""}</p>}
                  </td>
                  <td className="py-2.5 text-gray-600 capitalize">{m.role.replace(/_/g, " ")}</td>
                  <td className="py-2.5 text-xs text-gray-500">{new Date(m.joinedAt).toLocaleDateString()}</td>
                  <td className="py-2.5 text-right">
                    <button type="button" onClick={() => handleRemove(m.memberId, m.orgName)} disabled={removing === m.memberId}
                      aria-label={`Remove ${m.orgName}`}
                      className="text-xs text-red-600 hover:text-red-700 disabled:opacity-40">
                      {removing === m.memberId ? "Removing…" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
