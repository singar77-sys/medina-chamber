"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import type { MediaItem } from "@/lib/media-store";
import { NamingModal } from "@/components/admin/NamingModal";

interface Props {
  items: MediaItem[];
  adminToken: string;
}

export function MediaLibraryClient({ items: initialItems, adminToken }: Props) {
  const [items, setItems] = useState<MediaItem[]>(initialItems);
  const [filter, setFilter] = useState<string>("all");
  const [dragging, setDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const eventSlugs = Array.from(
    new Set(items.map((i) => i.eventSlug).filter(Boolean) as string[]),
  );

  const visible =
    filter === "all"
      ? items
      : filter === "none"
      ? items.filter((i) => !i.eventSlug)
      : items.filter((i) => i.eventSlug === filter);

  const queueFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length) setPendingFiles(arr);
  }, []);

  async function uploadAll(files: File[], description: string) {
    setPendingFiles(null);
    setUploading(true);
    setUploadErrors([]);

    const results = await Promise.allSettled(
      files.map(async (file) => {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("description", description);
        fd.append("type", "photo");

        const res = await fetch("/api/admin/media/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${adminToken}` },
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        return data.item as MediaItem;
      }),
    );

    const uploaded = results
      .filter((r): r is PromiseFulfilledResult<MediaItem> => r.status === "fulfilled")
      .map((r) => r.value);

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => (r.reason instanceof Error ? r.reason.message : "Upload failed"));

    setItems((prev) => [...uploaded, ...prev]);
    if (errors.length) setUploadErrors(errors);
    setUploading(false);
  }

  async function deleteItem(url: string, eventSlug?: string) {
    if (!confirm("Delete this file permanently?")) return;

    const params = new URLSearchParams({ url });
    if (eventSlug) params.set("eventSlug", eventSlug);

    await fetch(`/api/admin/media?${params.toString()}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    setItems((prev) => prev.filter((i) => i.url !== url));
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="px-6 py-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Media Library</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} file{items.length !== 1 ? "s" : ""}
            {uploading && (
              <span className="ml-2 text-[#83BCA9]">Uploading…</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter */}
          {eventSlugs.length > 0 && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#83BCA9]"
            >
              <option value="all">All media</option>
              {eventSlugs.map((slug) => (
                <option key={slug} value={slug}>{slug}</option>
              ))}
              {items.some((i) => !i.eventSlug) && (
                <option value="none">No event</option>
              )}
            </select>
          )}

          <button
            onClick={() => inputRef.current?.click()}
            className="text-sm px-4 py-2 rounded-lg text-white font-medium"
            style={{ background: "#0C1B33" }}
          >
            Upload
          </button>
        </div>
      </div>

      {/* Drop zone (full area when empty, subtle border when has items) */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); queueFiles(e.dataTransfer.files); }}
        className="rounded-xl border-2 border-dashed transition-colors mb-6"
        style={{
          borderColor: dragging ? "#83BCA9" : "#e5e7eb",
          background: dragging ? "rgba(131,188,169,0.05)" : "transparent",
          padding: visible.length === 0 ? "3rem 2rem" : "1rem 1.5rem",
        }}
      >
        {visible.length === 0 ? (
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Drop images here or{" "}
              <button
                onClick={() => inputRef.current?.click()}
                className="font-medium hover:underline"
                style={{ color: "#83BCA9" }}
              >
                browse
              </button>
            </p>
            <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP up to 15 MB · Converted to WebP automatically</p>
          </div>
        ) : (
          <p className="text-xs text-center text-gray-400">
            Drop images here to upload · or{" "}
            <button
              onClick={() => inputRef.current?.click()}
              className="hover:underline"
              style={{ color: "#83BCA9" }}
            >
              browse
            </button>
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => e.target.files && queueFiles(e.target.files)}
      />

      {/* Upload errors */}
      {uploadErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 mb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-red-800 mb-1">Upload failed</p>
              {uploadErrors.map((e, i) => (
                <p key={i} className="text-xs text-red-700">{e}</p>
              ))}
            </div>
            <button
              onClick={() => setUploadErrors([])}
              className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {visible.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {visible.map((item) => (
            <MediaCard
              key={item.url}
              item={item}
              onDelete={() => deleteItem(item.url, item.eventSlug)}
              formatBytes={formatBytes}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {visible.length === 0 && !uploading && filter !== "all" && (
        <p className="text-sm text-center text-gray-400 py-8">No files match this filter.</p>
      )}

      {/* Upload with no files yet */}
      {items.length === 0 && !uploading && (
        <div className="text-center pt-4">
          <p className="text-xs text-gray-400">
            Or upload photos from an{" "}
            <Link href="/admin/events" className="text-[#83BCA9] hover:underline">
              event page
            </Link>
            .
          </p>
        </div>
      )}

      {/* "What is this?" modal */}
      {pendingFiles && (
        <NamingModal
          files={pendingFiles}
          onConfirm={(description) => uploadAll(pendingFiles, description)}
          onCancel={() => setPendingFiles(null)}
        />
      )}
    </div>
  );
}

function MediaCard({
  item,
  onDelete,
  formatBytes,
  formatDate,
}: {
  item: MediaItem;
  onDelete: () => void;
  formatBytes: (n: number) => string;
  formatDate: (s: string) => string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.url}
        alt={item.alt ?? item.caption ?? item.filename}
        className="w-full aspect-video object-cover"
      />

      <div
        className="absolute inset-0 flex flex-col justify-between p-2 transition-opacity"
        style={{ opacity: hovered ? 1 : 0, background: "rgba(0,0,0,0.55)" }}
      >
        <div className="flex justify-end">
          <button
            onClick={onDelete}
            className="text-[10px] bg-red-500/80 hover:bg-red-600 text-white rounded px-2 py-1"
          >
            Delete
          </button>
        </div>
        <div>
          {item.eventSlug && (
            <Link
              href={`/admin/events/${item.eventSlug}`}
              className="block text-[10px] text-[#83BCA9] hover:underline truncate"
            >
              {item.eventSlug}
            </Link>
          )}
          {item.alt && (
            <p className="text-[10px] text-white/60 truncate">{item.alt}</p>
          )}
        </div>
      </div>

      <div className="px-2 py-1.5 bg-white border-t border-gray-100">
        <p className="text-[10px] text-gray-500 truncate">{item.filename}</p>
        <p className="text-[10px] text-gray-400">
          {formatBytes(item.size)} · {formatDate(item.uploadedAt)}
        </p>
      </div>
    </div>
  );
}
