"use client";

import { useState } from "react";
import type { ContentFieldDef } from "@/lib/cms-store";

interface Props {
  def: ContentFieldDef;
  currentValue: string;
  isOverridden: boolean;
  adminToken: string;
}

export function ContentField({ def, currentValue, isOverridden, adminToken }: Props) {
  const [value, setValue] = useState(currentValue);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [overridden, setOverridden] = useState(isOverridden);

  const isDirty = value !== currentValue;
  const remaining = def.maxLength - value.length;

  async function save() {
    if (!isDirty || saving) return;
    setSaving(true);
    setStatus("idle");

    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ page: def.page, field: def.field, value }),
      });

      if (res.ok) {
        setStatus("saved");
        setOverridden(true);
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        const data = await res.json();
        alert(data.error ?? "Save failed.");
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!confirm("Reset to default value?")) return;
    setSaving(true);

    try {
      await fetch(`/api/admin/content?page=${def.page}&field=${def.field}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      setValue(def.defaultValue);
      setOverridden(false);
      setStatus("idle");
    } catch {
      alert("Reset failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Field header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700">{def.label}</span>
        {overridden && (
          <span className="ml-1 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
            style={{ background: "#d1fae5", color: "#065f46" }}>
            Custom
          </span>
        )}
        {def.hint && <span className="ml-auto text-xs text-gray-400">{def.hint}</span>}
      </div>

      {/* Editor */}
      <div className="p-4">
        {def.type === "textarea" ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            maxLength={def.maxLength}
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-[#83BCA9]"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={def.maxLength}
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#83BCA9]"
          />
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs ${remaining < 20 ? "text-red-500" : "text-gray-400"}`}>
            {remaining} chars remaining
          </span>

          <div className="flex items-center gap-2">
            {status === "saved" && (
              <span className="text-xs text-green-600">✓ Saved</span>
            )}
            {overridden && (
              <button
                onClick={reset}
                disabled={saving}
                className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-40"
              >
                Reset to default
              </button>
            )}
            <button
              onClick={save}
              disabled={!isDirty || saving}
              className="px-3 py-1 text-xs font-medium text-white rounded-md transition-opacity disabled:opacity-40"
              style={{ background: "#0C1B33" }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
