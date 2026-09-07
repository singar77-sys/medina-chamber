"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { MediaItem } from "@/lib/media-store";
import { NamingModal } from "@/components/admin/NamingModal";
import { prepareImageForUpload } from "@/components/admin/prepare-upload";
import {
  MAX_SOURCE_BYTES,
  checkSourceFile,
  formatBytes,
  uploadErrorFromResponse,
} from "@/lib/upload-limits";

interface Props {
  eventSlug: string;
  eventTitle?: string;   // pre-fills the naming modal description
  initialPhotos: MediaItem[];
}

interface UploadingFile {
  id: string;
  name: string;
  progress: "uploading" | "done" | "error";
  error?: string;
}

/** "Golf Outing 2026" → "golf outing" (strip year, lower) */
function defaultDescFromTitle(title: string): string {
  return title
    .replace(/\b\d{4}\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function EventPhotoUploader({ eventSlug, eventTitle, initialPhotos }: Props) {
  const [photos, setPhotos] = useState<MediaItem[]>(initialPhotos);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const captionInputRef = useRef<HTMLInputElement>(null);

  // Move focus into the caption dialog when it opens. Done with a ref rather
  // than autoFocus: autoFocus would also fire on the initial page render if the
  // dialog were ever open on mount, and it gives no control over the timing.
  useEffect(() => {
    if (!editingCaption) return;
    captionInputRef.current?.focus();
  }, [editingCaption]);

  const defaultDesc = eventTitle ? defaultDescFromTitle(eventTitle) : "";

  // Reject what can never work BEFORE the naming modal, so an unsupported or
  // unprocessably large file gets a sentence rather than a failed request
  // several clicks later. Silently dropping non-images (the old behaviour) left
  // staff staring at a drop zone that had apparently ignored them.
  const queueFiles = useCallback((files: FileList | File[]) => {
    const accepted: File[] = [];
    const rejected: UploadingFile[] = [];

    for (const file of Array.from(files)) {
      const problem = checkSourceFile(file);
      if (problem) {
        rejected.push({
          id: Math.random().toString(36).slice(2),
          name: file.name,
          progress: "error",
          error: problem,
        });
      } else {
        accepted.push(file);
      }
    }

    if (rejected.length) setUploading((prev) => [...prev, ...rejected]);
    if (accepted.length) setPendingFiles(accepted);
  }, []);

  const uploadFiles = useCallback(
    async (files: File[], description: string) => {
      setPendingFiles(null);
      const ids = files.map(() => Math.random().toString(36).slice(2));

      setUploading((prev) => [
        ...prev,
        ...files.map((f, i) => ({ id: ids[i], name: f.name, progress: "uploading" as const })),
      ]);

      // Sequential, but no longer load-bearing. The store used to keep each
      // event's photo list as one JSON array in Redis (GET -> prepend -> SET),
      // so parallel uploads clobbered each other and this loop was the only
      // thing preventing it — a client-side convention standing in for a server
      // guarantee, which two admin tabs defeated. media-store.ts now indexes
      // photos with per-item sorted-set/hash writes, so overlap is safe. One at
      // a time is kept because it bounds the memory the in-browser resize needs
      // and keeps the progress list honest.
      for (let i = 0; i < files.length; i++) {
        {
          const file = files[i];
          const id = ids[i];

          try {
            const prepared = await prepareImageForUpload(file);
            const fd = new FormData();
            fd.append("file", prepared);
            fd.append("eventSlug", eventSlug);
            fd.append("description", description);
            fd.append("type", "photo");

            const res = await fetch("/api/admin/media/upload", {
              method: "POST",
              credentials: "same-origin",
              body: fd,
            });
            if (!res.ok) throw new Error(await uploadErrorFromResponse(res));
            const data = await res.json();

            setPhotos((prev) => [data.item, ...prev]);
            setUploading((prev) =>
              prev.map((u) => (u.id === id ? { ...u, progress: "done" } : u)),
            );
          } catch (err) {
            setUploading((prev) =>
              prev.map((u) =>
                u.id === id
                  ? { ...u, progress: "error", error: err instanceof Error ? err.message : "Failed" }
                  : u,
              ),
            );
          }
        }
      }

      // Clear the ticks, keep the failures on screen. Errors used to disappear
      // with everything else after three seconds, which is how an opaque upload
      // failure became "nothing happened".
      setTimeout(() => {
        setUploading((prev) => prev.filter((u) => u.progress !== "done"));
      }, 3000);
    },
    [eventSlug],
  );

  async function deletePhoto(url: string) {
    if (!confirm("Remove this photo?")) return;
    await fetch(
      `/api/admin/media?url=${encodeURIComponent(url)}&eventSlug=${encodeURIComponent(eventSlug)}`,
      { method: "DELETE", credentials: "same-origin" },
    );
    setPhotos((prev) => prev.filter((p) => p.url !== url));
  }

  async function saveCaption(url: string) {
    await fetch("/api/admin/media", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({ url, eventSlug, caption: captionDraft }),
    });
    setPhotos((prev) =>
      prev.map((p) => (p.url === url ? { ...p, caption: captionDraft } : p)),
    );
    setEditingCaption(null);
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length) queueFiles(e.dataTransfer.files);
    },
    [queueFiles],
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xs uppercase tracking-widest font-semibold text-gray-400">
        Event Photos
      </h2>

      {/* Drop zone */}
      <button
        type="button"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="block w-full cursor-pointer rounded-xl border-2 border-dashed transition-colors px-6 py-8 text-center"
        style={{
          borderColor: dragging ? "var(--color-cambridge)" : "#e5e7eb",
          background: dragging ? "rgba(131,188,169,0.05)" : "transparent",
        }}
      >
        {/* <span>, not <p>: a <button> may only contain phrasing content. */}
        <span className="block text-sm text-gray-500">
          Drop photos here or{" "}
          <span style={{ color: "var(--color-cambridge)" }} className="font-medium">browse</span>
        </span>
        <span className="block text-xs text-gray-400 mt-1">
          JPEG, PNG, WebP, GIF, AVIF up to {formatBytes(MAX_SOURCE_BYTES)} · Resized in your
          browser, then converted to WebP
        </span>
      </button>

      {/* Sibling of the drop zone, not a child: form controls cannot nest
          inside a <button>. */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(e) => e.target.files && queueFiles(e.target.files)}
      />

      {/* Upload progress */}
      {uploading.length > 0 && (
        <div className="space-y-1">
          {uploading.map((u) => (
            <div key={u.id} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md"
              style={{
                background: u.progress === "error" ? "#fef2f2" : "#f0fdf4",
                color: u.progress === "error" ? "#991b1b" : "#166534",
              }}>
              {u.progress === "uploading" && (
                <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
              )}
              {u.progress === "done" && <span>✓</span>}
              {u.progress === "error" && <span>✗</span>}
              <span className="truncate">{u.name}</span>
              {u.error && <span className="ml-auto shrink-0">{u.error}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div key={photo.url} className="group relative rounded-lg overflow-hidden bg-gray-100 aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.alt ?? photo.caption ?? photo.filename}
                className="w-full h-full object-cover"
              />

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => {
                    setEditingCaption(photo.url);
                    setCaptionDraft(photo.caption ?? "");
                  }}
                  className="text-[10px] text-white bg-black/50 rounded px-2 py-1 hover:bg-black/70"
                >
                  Caption
                </button>
                <button
                  onClick={() => deletePhoto(photo.url)}
                  className="text-[10px] text-white bg-red-500/80 rounded px-2 py-1 hover:bg-red-600"
                >
                  Remove
                </button>
              </div>

              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-[10px] text-white truncate">
                  {photo.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && uploading.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">No photos uploaded yet.</p>
      )}

      {/* Caption editor modal */}
      {editingCaption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-5 w-80 space-y-3 shadow-xl">
            <p className="text-sm font-semibold text-gray-800">Edit caption</p>
            <input
              ref={captionInputRef}
              type="text"
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveCaption(editingCaption)}
              placeholder="Optional photo caption"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-cambridge)]"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditingCaption(null)}
                className="flex-1 py-2 text-sm border border-gray-300 rounded-md text-gray-600 hover:border-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => saveCaption(editingCaption)}
                className="flex-1 py-2 text-sm text-white rounded-md"
                style={{ background: "var(--color-oxford)" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* "What is this?" naming modal */}
      {pendingFiles && (
        <NamingModal
          files={pendingFiles}
          defaultDescription={defaultDesc}
          onConfirm={(desc) => uploadFiles(pendingFiles, desc)}
          onCancel={() => setPendingFiles(null)}
        />
      )}
    </div>
  );
}
