"use client";

import { useState } from "react";
import { FluidGraphicFrame } from "@/components/events/graphics/FluidGraphicFrame";
import { DynamicGraphic } from "@/components/events/graphics/DynamicGraphic";
import type { GraphicConfigDraft, GraphicConfig } from "@/lib/graphic-template";

const EVENT_TYPE_OPTIONS = [
  { slug: "chamber-chat", label: "Chamber Chat" },
  { slug: "networking-wow", label: "Networking WOW" },
  { slug: "safety-council", label: "Safety Council" },
  { slug: "business-brew", label: "Business Brew" },
  { slug: "eggs-expertise", label: "Eggs & Expertise" },
  { slug: "member-meeting", label: "Member Meeting" },
  { slug: "golf-outing", label: "Golf Outing" },
  { slug: "athena-awards", label: "Athena Awards" },
  { slug: "social-connect", label: "Social Connect" },
  { slug: "ribbon-cutting", label: "Ribbon Cutting" },
  { slug: "get-to-know", label: "Get to Know the Chamber" },
];

interface Props {
  onSaved: (config: GraphicConfig) => void;
  onCancel: () => void;
}

export function GraphicTemplateCreator({ onSaved, onCancel }: Props) {
  const [eventTypeSlug, setEventTypeSlug] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<GraphicConfigDraft | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!eventTypeSlug || !stylePrompt.trim()) return;
    setGenerating(true);
    setError(null);
    setDraft(null);

    try {
      const res = await fetch("/api/admin/graphic-templates/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ eventTypeSlug, stylePrompt }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed.");
        return;
      }

      setDraft(data.config);
      setName(data.config.name ?? "");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/graphic-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ config: draft, name }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
        return;
      }

      onSaved(data.config);
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">New AI Template</h3>
        <button
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Step 1: Event type + style prompt */}
      <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Event Type</label>
          <select
            value={eventTypeSlug}
            onChange={(e) => setEventTypeSlug(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-cambridge)] bg-white"
          >
            <option value="">Select type…</option>
            {EVENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.slug} value={opt.slug}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Style Prompt</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              placeholder='e.g. "in the style of Star Wars" or "Art Deco gold and black"'
              className="flex-1 text-sm px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-cambridge)]"
            />
            <button
              onClick={generate}
              disabled={!eventTypeSlug || !stylePrompt.trim() || generating}
              className="px-4 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-40"
              style={{ background: "var(--color-oxford)" }}
            >
              {generating ? "Generating…" : "Generate"}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Describe any visual style, brand colors and logo are always enforced.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Generating spinner */}
      {generating && (
        <div className="flex items-center gap-3 py-4">
          <div
            className="w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--color-cambridge)", borderTopColor: "transparent" }}
          />
          <span className="text-sm text-gray-500">
            Claude is designing your template, this takes 10–20 seconds…
          </span>
        </div>
      )}

      {/* Preview + save */}
      {draft && (
        <div className="grid grid-cols-[1fr_320px] gap-6 items-start">
          {/* Preview */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Preview, Social (1200×630)</p>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <FluidGraphicFrame mode="social">
                <DynamicGraphic config={draft as GraphicConfig} mode="social" />
              </FluidGraphicFrame>
            </div>
          </div>

          {/* Save panel */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Template Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-cambridge)]"
              />
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 space-y-1">
              <p className="text-xs font-semibold text-gray-500">Applied to</p>
              <p className="text-sm text-gray-700">
                {EVENT_TYPE_OPTIONS.find((o) => o.slug === draft.eventTypeSlug)?.label ??
                  draft.eventTypeSlug}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                This template will be used for all {draft.eventTypeSlug} events until removed.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={generate}
                disabled={generating}
                className="flex-1 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-600 hover:border-gray-400 transition-colors disabled:opacity-40"
              >
                Regenerate
              </button>
              <button
                onClick={save}
                disabled={saving || !name.trim()}
                className="flex-1 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-40"
                style={{ background: "var(--color-cambridge)" }}
              >
                {saving ? "Saving…" : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
