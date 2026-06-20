"use client";

import { useState } from "react";

export interface DealRow {
  id: string;
  title: string;
  description: string;
  terms: string | null;
  discountLabel: string | null;
  redemptionInstructions: string | null;
  dealUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  isApproved: boolean;
}

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-500";
const labelClass = "block text-xs font-medium text-gray-500 mb-1";

const emptyForm = {
  title: "",
  discountLabel: "",
  description: "",
  redemptionInstructions: "",
  terms: "",
  dealUrl: "",
  startsAt: "",
  endsAt: "",
};

function statusOf(d: DealRow): { label: string; color: string } {
  if (!d.isActive) return { label: "Paused", color: "#64748b" };
  if (!d.isApproved) return { label: "Pending review", color: "#a16207" };
  if (d.endsAt && d.endsAt < new Date().toISOString().slice(0, 10)) {
    return { label: "Expired", color: "#b91c1c" };
  }
  return { label: "Live", color: "#15803d" };
}

export function DealsManager({ deals }: { deals: DealRow[] }) {
  const [rows, setRows] = useState(deals);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startEdit(d: DealRow) {
    setEditingId(d.id);
    setForm({
      title: d.title,
      discountLabel: d.discountLabel ?? "",
      description: d.description,
      redemptionInstructions: d.redemptionInstructions ?? "",
      terms: d.terms ?? "",
      dealUrl: d.dealUrl ?? "",
      startsAt: d.startsAt ?? "",
      endsAt: d.endsAt ?? "",
    });
    setErr("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setErr("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    const body = {
      title: form.title.trim(),
      discountLabel: form.discountLabel.trim() || null,
      description: form.description.trim(),
      redemptionInstructions: form.redemptionInstructions.trim() || null,
      terms: form.terms.trim() || null,
      dealUrl: form.dealUrl.trim() || null,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
    };
    try {
      const res = await fetch(editingId ? `/api/portal/deals/${editingId}` : "/api/portal/deals", {
        method: editingId ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(d.error ?? "Failed to save the deal.");
        setSaving(false);
      }
    } catch {
      setErr("Connection error. Please try again.");
      setSaving(false);
    }
  }

  async function togglePause(d: DealRow) {
    setBusy(d.id);
    try {
      const res = await fetch(`/api/portal/deals/${d.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !d.isActive }),
      });
      if (res.ok) {
        setRows((rs) => rs.map((r) => (r.id === d.id ? { ...r, isActive: !d.isActive } : r)));
      } else {
        alert("Update failed.");
      }
    } catch {
      alert("Connection error.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(d: DealRow) {
    if (!confirm(`Delete "${d.title}"? This cannot be undone.`)) return;
    setBusy(d.id);
    try {
      const res = await fetch(`/api/portal/deals/${d.id}`, { method: "DELETE", credentials: "same-origin" });
      if (res.ok) {
        setRows((rs) => rs.filter((r) => r.id !== d.id));
      } else {
        alert("Delete failed.");
      }
    } catch {
      alert("Connection error.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-bg-primary rounded-2xl p-6 shadow-sm border border-border-secondary">
        <h2 className="text-sm font-bold text-text-primary mb-1">
          {editingId ? "Edit deal" : "Post a deal"}
        </h2>
        <p className="text-xs text-text-tertiary mb-4">
          Deals are reviewed by chamber staff before appearing on the public deals page.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="d-title" className={labelClass}>Title</label>
              <input id="d-title" value={form.title} onChange={(e) => set("title", e.target.value)} required
                placeholder="20% off all catering orders" className={inputClass} />
            </div>
            <div>
              <label htmlFor="d-discount" className={labelClass}>Offer label</label>
              <input id="d-discount" value={form.discountLabel} onChange={(e) => set("discountLabel", e.target.value)}
                placeholder="20% off" className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="d-desc" className={labelClass}>Description</label>
            <textarea id="d-desc" value={form.description} onChange={(e) => set("description", e.target.value)} required rows={3}
              placeholder="What the deal is, who it's for…" className={inputClass} />
          </div>
          <div>
            <label htmlFor="d-redeem" className={labelClass}>How to redeem (optional)</label>
            <input id="d-redeem" value={form.redemptionInstructions} onChange={(e) => set("redemptionInstructions", e.target.value)}
              placeholder="Mention the chamber at checkout" className={inputClass} />
          </div>
          <div>
            <label htmlFor="d-terms" className={labelClass}>Fine print (optional)</label>
            <input id="d-terms" value={form.terms} onChange={(e) => set("terms", e.target.value)}
              placeholder="One per customer. Not valid with other offers." className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="d-url" className={labelClass}>Link (optional)</label>
              <input id="d-url" value={form.dealUrl} onChange={(e) => set("dealUrl", e.target.value)} type="url"
                placeholder="https://…" className={inputClass} />
            </div>
            <div>
              <label htmlFor="d-start" className={labelClass}>Starts (optional)</label>
              <input id="d-start" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} type="date" className={inputClass} />
            </div>
            <div>
              <label htmlFor="d-end" className={labelClass}>Ends (optional)</label>
              <input id="d-end" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} type="date" className={inputClass} />
            </div>
          </div>
          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50" style={{ background: "#0C1B33" }}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Submit deal"}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="text-sm text-text-tertiary hover:text-text-secondary">
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3">Your deals</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-text-tertiary">You haven&apos;t posted any deals yet.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((d) => {
              const st = statusOf(d);
              return (
                <div key={d.id} className="bg-bg-primary rounded-2xl p-5 shadow-sm border border-border-secondary flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: st.color }}>{st.label}</span>
                      {d.discountLabel && <span className="text-xs font-bold" style={{ color: "#FF4000" }}>{d.discountLabel}</span>}
                    </div>
                    <p className="text-sm font-bold text-text-primary mt-0.5">{d.title}</p>
                    <p className="text-sm text-text-secondary mt-1 leading-relaxed">{d.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0 text-xs">
                    <button type="button" onClick={() => startEdit(d)} disabled={busy === d.id} className="text-text-secondary hover:underline disabled:opacity-50">Edit</button>
                    <button type="button" onClick={() => togglePause(d)} disabled={busy === d.id} className="text-text-secondary hover:underline disabled:opacity-50">
                      {d.isActive ? "Pause" : "Resume"}
                    </button>
                    <button type="button" onClick={() => handleDelete(d)} disabled={busy === d.id} className="text-red-600 hover:text-red-700 disabled:opacity-40">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
