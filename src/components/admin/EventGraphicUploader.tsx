"use client";

import { useState, useRef } from "react";

interface Props {
  eventSlug: string;
  initialImageUrl: string | null;
  onImageChange: (url: string | null) => void;
}

export function EventGraphicUploader({
  eventSlug,
  initialImageUrl,
  onImageChange,
}: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("eventSlug", eventSlug);
    fd.append("type", "graphic");

    try {
      const res = await fetch("/api/admin/media/upload", {
        method: "POST",
        credentials: "same-origin",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      setImageUrl(data.item.url);
      onImageChange(data.item.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function clear() {
    if (!confirm("Remove the custom graphic? The AI-generated or built-in template will be used instead.")) return;

    await fetch(`/api/admin/events/graphic-image?slug=${encodeURIComponent(eventSlug)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });

    setImageUrl(null);
    onImageChange(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500">Custom Graphic (upload)</p>
        {imageUrl && (
          <button onClick={clear} className="text-xs text-red-400 hover:text-red-600 transition-colors">
            Remove
          </button>
        )}
      </div>

      {imageUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Custom graphic" className="w-full block" />
          <div className="absolute top-2 right-2">
            <span
              className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded"
              style={{ background: "rgba(12,27,51,0.85)", color: "var(--color-cambridge)" }}
            >
              Active
            </span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-xl border-2 border-dashed border-gray-200 transition-colors px-4 py-6 text-center disabled:opacity-50"
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-cambridge)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-cambridge) transparent transparent transparent" }} />
              <span className="text-sm text-gray-500">Uploading…</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">
                Upload a Canva export or custom image
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Replaces AI template · JPEG, PNG, WebP up to 15 MB
              </p>
            </>
          )}
        </button>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
    </div>
  );
}
