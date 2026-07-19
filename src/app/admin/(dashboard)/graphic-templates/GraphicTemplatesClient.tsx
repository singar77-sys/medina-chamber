"use client";

import { useState } from "react";
import Link from "next/link";
import { FluidGraphicFrame } from "@/components/events/graphics/FluidGraphicFrame";
import { DynamicGraphic } from "@/components/events/graphics/DynamicGraphic";
import { GraphicTemplateCreator } from "@/components/admin/GraphicTemplateCreator";
import type { GraphicConfig } from "@/lib/graphic-template";

const EVENT_TYPE_LABELS: Record<string, string> = {
  "chamber-chat": "Chamber Chat",
  "networking-wow": "Networking WOW",
  "safety-council": "Safety Council",
  "business-brew": "Business Brew",
  "eggs-expertise": "Eggs & Expertise",
  "member-meeting": "Member Meeting",
  "golf-outing": "Golf Outing",
  "athena-awards": "Athena Awards",
  "social-connect": "Social Connect",
  "ribbon-cutting": "Ribbon Cutting",
  "get-to-know": "Get to Know the Chamber",
};

interface Props {
  initialTemplates: GraphicConfig[];
}

export function GraphicTemplatesClient({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState<GraphicConfig[]>(initialTemplates);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template? Events will fall back to the built-in graphic.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/graphic-templates?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) {
        alert("Failed to delete template. Please try again.");
        return;
      }
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert("Failed to delete template. Check your connection and try again.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleSaved(config: GraphicConfig) {
    setTemplates((prev) => [config, ...prev.filter((t) => t.id !== config.id)]);
    setCreating(false);
  }

  return (
    <div className="px-6 py-6 max-w-5xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Graphic Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            AI-generated templates override the built-in graphic for each event type.
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 rounded-md text-sm font-medium text-white"
            style={{ background: "#0C1B33" }}
          >
            + New Template
          </button>
        )}
      </div>

      {creating && (
        <GraphicTemplateCreator
          onSaved={handleSaved}
          onCancel={() => setCreating(false)}
        />
      )}

      {templates.length === 0 && !creating ? (
        <div className="border border-dashed border-gray-200 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-400 mb-1">No custom templates yet.</p>
          <p className="text-xs text-gray-400">
            Create one to override any event type&apos;s built-in graphic.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              label={EVENT_TYPE_LABELS[tpl.eventTypeSlug] ?? tpl.eventTypeSlug}
              deleting={deletingId === tpl.id}
              onDelete={() => deleteTemplate(tpl.id)}
            />
          ))}
        </div>
      )}

      {templates.length > 0 && !creating && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Only one custom template is active per event type. The most recently saved template
          overrides the built-in graphic and all older custom templates for that event type.
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  label,
  deleting,
  onDelete,
}: {
  template: GraphicConfig;
  label: string;
  deleting: boolean;
  onDelete: () => void;
}) {
  const date = new Date(template.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div className="grid grid-cols-[320px_1fr] gap-0">
        <div className="border-r border-gray-100">
          <FluidGraphicFrame mode="social">
            <DynamicGraphic config={template} mode="social" />
          </FluidGraphicFrame>
        </div>

        <div className="px-5 py-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                {template.name}
              </h3>
              <span
                className="shrink-0 text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded"
                style={{ background: "#d1fae5", color: "#065f46" }}
              >
                Active
              </span>
            </div>

            <div className="space-y-0.5">
              <InfoRow label="Event type" value={label} />
              <InfoRow label="Style" value={template.stylePrompt} />
              <InfoRow label="Created" value={date} />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
            <Link
              href="/admin/events"
              className="text-xs text-[#83BCA9] hover:underline"
            >
              View events →
            </Link>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
            >
              {deleting ? "Deleting…" : "Remove template"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="w-20 text-gray-400 shrink-0">{label}</span>
      <span className="text-gray-700 truncate">{value}</span>
    </div>
  );
}
