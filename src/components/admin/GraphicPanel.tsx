"use client";

import { useState } from "react";
import { FluidGraphicFrame } from "@/components/events/graphics/FluidGraphicFrame";
import { GraphicEditor } from "@/components/admin/GraphicEditor";
import { EventGraphicUploader } from "@/components/admin/EventGraphicUploader";
import { DynamicGraphic } from "@/components/events/graphics/DynamicGraphic";
import { getEventGraphicRenderer } from "@/components/events/graphics/registry";
import type { ChamberEvent } from "@/data/events";
import type { EventInfo } from "@/components/events/graphics/shared";
import type { GraphicConfig } from "@/lib/graphic-template";

interface Props {
  event: ChamberEvent;
  adminToken: string;
  initialInfo: EventInfo;
  hasSavedOverride: boolean;
  customTemplate?: GraphicConfig | null;
  initialGraphicImageUrl?: string | null;
}

export function GraphicPanel({
  event,
  adminToken,
  initialInfo,
  hasSavedOverride,
  customTemplate,
  initialGraphicImageUrl,
}: Props) {
  const [currentInfo, setCurrentInfo] = useState<EventInfo>(initialInfo);
  const [savedOverride, setSavedOverride] = useState(hasSavedOverride);
  const [graphicImageUrl, setGraphicImageUrl] = useState<string | null>(
    initialGraphicImageUrl ?? null,
  );

  const Graphic = getEventGraphicRenderer(event);
  if (!Graphic && !customTemplate && !graphicImageUrl) return null;

  // Priority: uploaded image > AI template > built-in static graphic
  const previewLabel = graphicImageUrl
    ? "Custom uploaded image"
    : customTemplate
    ? "AI template active"
    : "Built-in template";

  return (
    <div className="space-y-3">
      <h2 className="text-xs uppercase tracking-widest font-semibold text-gray-400">
        Social Graphic
      </h2>

      {savedOverride && !graphicImageUrl && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
          <span>✓</span>
          <span>Custom graphic info is saved. Preview reflects current values.</span>
        </div>
      )}

      <div className="grid grid-cols-[1fr_360px] gap-6 items-start">
        {/* Live preview */}
        <div>
          <p className="text-xs text-gray-400 mb-2">
            Preview — Social (1200×630)
            <span className="ml-2" style={{ color: "#83BCA9" }}>· {previewLabel}</span>
          </p>
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            {graphicImageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={graphicImageUrl}
                alt="Custom graphic"
                className="w-full block"
                style={{ aspectRatio: "1200/630", objectFit: "cover" }}
              />
            ) : (
              <FluidGraphicFrame mode="social">
                {customTemplate ? (
                  <DynamicGraphic config={customTemplate} mode="social" eventInfo={currentInfo} />
                ) : Graphic ? (
                  <Graphic mode="social" />
                ) : null}
              </FluidGraphicFrame>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-5">
          {/* Custom image upload (Canva / external) */}
          <EventGraphicUploader
            eventSlug={event.slug}
            adminToken={adminToken}
            initialImageUrl={graphicImageUrl}
            onImageChange={(url) => setGraphicImageUrl(url)}
          />

          {/* AI command editor — only shown when not overridden by a custom image */}
          {!graphicImageUrl && (
            <>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs uppercase tracking-widest font-semibold text-gray-400 mb-2">
                  Edit via Command
                </p>
                <GraphicEditor
                  slug={event.slug}
                  eventTitle={event.title}
                  adminToken={adminToken}
                  initialInfo={currentInfo}
                  onInfoChange={(info) => {
                    setCurrentInfo(info);
                    setSavedOverride(true);
                  }}
                />

                <div className="mt-4 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500">Current graphic info</p>
                  <InfoRow
                    label="Date"
                    value={
                      currentInfo.dayOfWeek && currentInfo.month && currentInfo.day
                        ? `${currentInfo.dayOfWeek}, ${currentInfo.month} ${currentInfo.day}${currentInfo.year ? `, ${currentInfo.year}` : ""}`
                        : "—"
                    }
                  />
                  <InfoRow label="Time" value={currentInfo.time ?? "—"} />
                  <InfoRow label="Venue" value={currentInfo.venue ?? "—"} />
                  <InfoRow label="Note" value={currentInfo.note ?? "—"} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="w-12 text-gray-400 shrink-0">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}
