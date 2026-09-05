"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { MediaItem } from "@/lib/media-store";

interface Props {
  photos: MediaItem[];
  title?: string;
}

export function EventGallery({ photos: allPhotos, title = "Photos" }: Props) {
  // Cap every gallery at 12 photos — enough to convey the event without an
  // overwhelming wall. Curate the source order to control which 12 show.
  const photos = allPhotos.slice(0, 12);

  const [lightbox, setLightbox] = useState<number | null>(null);

  // Accessible focus management: the lightbox <div> is focused on open so
  // its onKeyDown (Escape + Arrow nav) is live immediately, and focus is
  // returned to the thumbnail that opened it on close.
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isOpen = lightbox !== null;

  // Keyed on isOpen — not the index — so navigating between photos while
  // the lightbox is open does not steal focus back to the overlay.
  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => dialogRef.current?.focus());
  }, [isOpen]);

  if (photos.length === 0) return null;

  function close() {
    const i = lightbox;
    setLightbox(null);
    // Restore focus to the thumbnail for the photo last viewed.
    if (i !== null) {
      requestAnimationFrame(() => triggerRefs.current[i]?.focus());
    }
  }

  function prev() {
    setLightbox((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  }
  function next() {
    setLightbox((i) => (i === null ? null : (i + 1) % photos.length));
  }

  // The upload route now derives an `alt` when the admin leaves the description
  // blank, but every photo uploaded before that change still has none — and the
  // old `filename` fallback made screen readers announce raw device names
  // ("IMG 4521 webp"). A positional description is the useful answer for those.
  function altFor(photo: MediaItem, i: number) {
    return photo.alt ?? photo.caption ?? `Photo ${i + 1} of ${photos.length}`;
  }

  // Keyboard nav for lightbox
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
    if (e.key === "Escape") close();
  }

  const cols =
    photos.length === 1 ? "grid-cols-1" :
    photos.length === 2 ? "grid-cols-2" :
    "grid-cols-2 sm:grid-cols-3";

  return (
    <section aria-label={title || "Photo gallery"}>
      {title && (
        <h2 className="text-lg font-bold text-oxford [[data-theme=dark]_&]:text-white mb-4">
          {title}
        </h2>
      )}

      {/* Responsive grid — fixed 4:3 aspect, object-cover */}
      <div className={`grid ${cols} gap-3`}>
        {photos.map((photo, i) => (
          <button
            key={photo.url}
            ref={(el) => {
              triggerRefs.current[i] = el;
            }}
            className="relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer group focus-visible:ring-2 focus-visible:ring-cambridge focus-visible:outline-none"
            onClick={() => setLightbox(i)}
            aria-label={`View photo ${i + 1} of ${photos.length}${photo.caption ? `: ${photo.caption}` : ""}`}
          >
            <Image
              src={photo.url}
              alt={altFor(photo, i)}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              loading={i < 6 ? "eager" : "lazy"}
            />
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <p className="text-xs text-white">{photo.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
          ref={dialogRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={close}
          onKeyDown={handleKey}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: lightbox overlay needs focus for keyboard nav
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Photo lightbox"
        >
          {/* Prev / Next */}
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl font-light px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl font-light px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Next photo"
              >
                ›
              </button>
            </>
          )}

          {/* Close */}
          <button
            onClick={close}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl leading-none w-11 h-11 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close lightbox"
          >
            ×
          </button>

          {/* Image — explicit width/height let next/image size the optimization
              pipeline; CSS max-constraints control the actual display size.   */}
          <div
            className="max-w-5xl w-full px-4 sm:px-16"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[lightbox].url}
              alt={altFor(photos[lightbox], lightbox)}
              width={1920}
              height={1440}
              className="max-w-full max-h-[80dvh] w-auto h-auto object-contain rounded-lg mx-auto block"
              sizes="90vw"
              quality={85}
            />
            {photos[lightbox].caption && (
              <p className="text-white/70 text-sm text-center mt-3">
                {photos[lightbox].caption}
              </p>
            )}
            {/* white/60, not /40: at 12px this counts as normal text, so it
                needs 4.5:1. /40 measured 3.81:1 against the black/90 scrim. */}
            {photos.length > 1 && (
              <p className="text-white/60 text-xs text-center mt-1">
                {lightbox + 1} / {photos.length}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
