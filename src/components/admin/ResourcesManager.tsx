"use client";

import { useState } from "react";

export interface AdminResource {
  id: string;
  title: string;
  description: string | null;
  category: string;
  url: string;
  linkLabel: string | null;
  isMemberOnly: boolean;
  isPublished: boolean;
  sortOrder: number;
}

const SUGGESTED_CATEGORIES = [
  "Starting a Business",
  "Funding & Grants",
  "Workforce & Hiring",
  "Forms & Documents",
  "Member Guides",
  "Local Programs",
];

interface FormState {
  title: string;
  category: string;
  url: string;
  linkLabel: string;
  description: string;
  isMemberOnly: boolean;
  isPublished: boolean;
  sortOrder: string;
}

const BLANK: FormState = {
  title: "",
  category: "",
  url: "",
  linkLabel: "",
  description: "",
  isMemberOnly: false,
  isPublished: true,
  sortOrder: "0",
};

function groupByCategory(rows: AdminResource[]) {
  const groups: { category: string; items: AdminResource[] }[] = [];
  const index = new Map<string, number>();
  for (const r of rows) {
    let i = index.get(r.category);
    if (i === undefined) {
      i = groups.length;
      index.set(r.category, i);
      groups.push({ category: r.category, items: [] });
    }
    groups[i].items.push(r);
  }
  return groups;
}

export function ResourcesManager({ initial }: { initial: AdminResource[] }) {
  const [rows, setRows] = useState(initial);
  // null = form closed, "new" = create, otherwise the id being edited
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openNew() {
    setForm(BLANK);
    setEditing("new");
    setError(null);
  }
  function openEdit(r: AdminResource) {
    setForm({
      title: r.title,
      category: r.category,
      url: r.url,
      linkLabel: r.linkLabel ?? "",
      description: r.description ?? "",
      isMemberOnly: r.isMemberOnly,
      isPublished: r.isPublished,
      sortOrder: String(r.sortOrder),
    });
    setEditing(r.id);
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      title: form.title,
      category: form.category,
      url: form.url,
      linkLabel: form.linkLabel,
      description: form.description,
      isMemberOnly: form.isMemberOnly,
      isPublished: form.isPublished,
      sortOrder: Number(form.sortOrder) || 0,
    };
    const isNew = editing === "new";
    try {
      const res = await fetch(isNew ? "/api/admin/resources" : `/api/admin/resources/${editing}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
        setBusy(false);
        return;
      }
      window.location.reload(); // re-fetch server truth (re-grouped, re-sorted)
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this resource permanently?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/resources/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) setRows((rs) => rs.filter((r) => r.id !== id));
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-gray-500";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1";
  const groups = groupByCategory(rows);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{rows.length} resource{rows.length === 1 ? "" : "s"}</p>
        {editing === null && (
          <button
            type="button"
            onClick={openNew}
            className="text-sm font-semibold px-4 py-2 rounded-md text-white"
            style={{ background: "#0C1B33" }}
          >
            + New resource
          </button>
        )}
      </div>

      {/* Create / edit form */}
      {editing !== null && (
        <form onSubmit={save} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">
            {editing === "new" ? "New resource" : "Edit resource"}
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="res-title" className={labelClass}>Title *</label>
              <input id="res-title" required value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label htmlFor="res-category" className={labelClass}>Category *</label>
              <input id="res-category" required list="res-cats" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} />
              <datalist id="res-cats">
                {SUGGESTED_CATEGORIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          <div>
            <label htmlFor="res-url" className={labelClass}>Link URL * (http/https)</label>
            <input id="res-url" required type="url" value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://…" className={inputClass} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="res-link-label" className={labelClass}>Link label (optional)</label>
              <input id="res-link-label" value={form.linkLabel}
                onChange={(e) => setForm({ ...form, linkLabel: e.target.value })}
                placeholder="Download PDF / Visit site" className={inputClass} />
            </div>
            <div>
              <label htmlFor="res-sort" className={labelClass}>Sort order (within category)</label>
              <input id="res-sort" type="number" min={0} value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className={inputClass} />
            </div>
          </div>

          <div>
            <label htmlFor="res-desc" className={labelClass}>Description (optional)</label>
            <textarea id="res-desc" rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={`${inputClass} resize-none`} />
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isPublished}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isMemberOnly}
                onChange={(e) => setForm({ ...form, isMemberOnly: e.target.checked })} />
              Members only
            </label>
          </div>

          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={busy}
              className="text-sm font-semibold px-4 py-2 rounded-md text-white disabled:opacity-50"
              style={{ background: "#0C1B33" }}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(null)} disabled={busy}
              className="text-sm font-medium px-4 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List grouped by category */}
      {rows.length === 0 ? (
        <p className="text-gray-500 text-sm py-8 text-center">
          No resources yet. Add one — it appears on the public Resource Library page.
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.category}>
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{g.category}</h3>
              <div className="space-y-2">
                {g.items.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-3 bg-white border border-gray-200 rounded-lg p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{r.title}</span>
                        {!r.isPublished && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#f3f4f6", color: "#4b5563" }}>Draft</span>
                        )}
                        {r.isMemberOnly && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#dbeafe", color: "#1e40af" }}>Members</span>
                        )}
                      </div>
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-700 hover:underline break-all">{r.url}</a>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button type="button" onClick={() => openEdit(r)} disabled={busy}
                        className="text-xs font-medium px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                        Edit
                      </button>
                      <button type="button" onClick={() => remove(r.id)} disabled={busy}
                        className="text-xs font-medium px-3 py-1.5 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
