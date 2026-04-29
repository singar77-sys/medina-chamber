"use client";

import { useState } from "react";
import type { MediaItem } from "@/lib/media-store";

interface Props {
  photos: MediaItem[];
  title?: string;
}

export function EventGallery({ photos, title = "Photos" }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (photos.length === 0) return null;

  function prev() {
    setLightbox((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  }
  function next() {
    setLightbox((i) => (i === null ? null : (i + 1) % photos.length));
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-[#0C1B33] mb-4">{title}</h2>

      {/* Masonry grid via CSS columns */}
      <div
        style={{
          columns: photos.length === 1 ? 1 : photos.length === 2 ? 2 : 3,
          columnGap: "12px",
        }}
      >
        {photos.map((photo, i) => (
          <div
            key={photo.url}
            className="mb-3 break-inside-avoid cursor-pointer rounded-lg overflow-hidden group relative"
            onClick={() => setLightbox(i)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.alt ?? photo.caption ?? photo.filename}
              className="w-full block transition-transform duration-300 group-hover:scale-[1.02]"
              style={{ display: "block" }}
            />
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white">{photo.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(null)}
        >
          {/* Prev / Next */}
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl font-light px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                ‹
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl font-light px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                ›
              </button>
            </>
          )}

          {/* Close */}
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl leading-none w-11 h-11 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          >
            ×
          </button>

          {/* Image */}
          <div
            className="max-w-5xl max-h-[90dvh] px-4 sm:px-16"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[lightbox].url}
              alt={photos[lightbox].alt ?? photos[lightbox].caption ?? photos[lightbox].filename}
              className="max-w-full max-h-[80dvh] object-contain rounded-lg"
            />
            {photos[lightbox].caption && (
              <p className="text-white/70 text-sm text-center mt-3">
                {photos[lightbox].caption}
              </p>
            )}
            {photos.length > 1 && (
              <p className="text-white/40 text-xs text-center mt-1">
                {lightbox + 1} / {photos.length}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
