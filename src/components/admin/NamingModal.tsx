"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  files: File[];
  defaultDescription?: string;
  onConfirm: (description: string) => void;
  onCancel: () => void;
}

/** "golf outing" → "golf-outing" (mirrors server-side toSlug) */
function toPreviewSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function toTitleCase(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function NamingModal({ files, defaultDescription = "", onConfirm, onCancel }: Props) {
  const [description, setDescription] = useState(defaultDescription);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const year = new Date().getFullYear();
  const slug = toPreviewSlug(description);
  const hasDescription = slug.length > 0;

  const filenamePreview = hasDescription
    ? `chamber-${slug}-${year}-***.webp`
    : "(original name).webp";

  const altPreview = hasDescription
    ? `Greater Medina Chamber of Commerce ${toTitleCase(description)} ${year}`
    : "—";

  // Object URLs for thumbnail previews (revoke on unmount)
  const [previews] = useState<string[]>(() =>
    files.slice(0, 5).map((f) => URL.createObjectURL(f)),
  );
  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p));
  }, [previews]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "#ffffff" }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <p className="text-base font-semibold text-gray-900">
            What {files.length === 1 ? "is this" : `are these ${files.length} files`}?
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Describe the photo{files.length > 1 ? "s" : ""} to generate a clean filename and alt tag.
          </p>
        </div>

        {/* Thumbnails */}
        {previews.length > 0 && (
          <div className="px-6 pb-4 flex gap-2">
            {previews.map((src, i) => (
              <div
                key={i}
                className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {files.length > 5 && (
              <div className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-400 shrink-0">
                +{files.length - 5}
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div className="px-6 pb-4">
          <input
            ref={inputRef}
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirm(description);
              if (e.key === "Escape") onCancel();
            }}
            placeholder="e.g. golf outing, chamber chat, ribbon cutting…"
            className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#83BCA9] text-gray-800 placeholder:text-gray-400"
          />
        </div>

        {/* Preview */}
        <div
          className="mx-6 mb-5 rounded-lg px-4 py-3 space-y-2"
          style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
        >
          <div className="flex items-start gap-3">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 w-14 shrink-0 pt-0.5">File</span>
            <span
              className="text-xs font-mono break-all"
              style={{ color: hasDescription ? "#0C1B33" : "#9ca3af" }}
            >
              {filenamePreview}
              {files.length > 1 && hasDescription && (
                <span className="text-gray-400 ml-1">(×{files.length})</span>
              )}
            </span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 w-14 shrink-0 pt-0.5">Alt</span>
            <span
              className="text-xs break-all"
              style={{ color: hasDescription ? "#374151" : "#9ca3af" }}
            >
              {altPreview}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(description)}
            disabled={!hasDescription}
            className="flex-1 py-2.5 text-sm text-white rounded-lg font-medium transition-colors disabled:opacity-40"
            style={{ background: "#0C1B33" }}
          >
            Upload {files.length > 1 ? `${files.length} files` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
