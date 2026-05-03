/**
 * RecentPhotoStrip — "Life at the Chamber" homepage photo grid.
 *
 * Async Server Component. Reads the last 8 uploaded photos from the Redis
 * recent feed (cms:media:recent) and renders them as a 4×2 image grid.
 * Returns null when fewer than 4 photos are available so the section never
 * renders as an empty shell.
 *
 * Photos come from Vercel Blob (CDN URLs). The *.public.blob.vercel-storage.com
 * remote pattern is registered in next.config.ts so next/image can serve them.
 */

import Image from "next/image";
import Link from "next/link";
import { getStaticPhotos } from "@/lib/static-media";
import { FadeIn } from "@/components/FadeIn";

export async function RecentPhotoStrip() {
  const photos = await getStaticPhotos(
    "photos",
    "Chamber members at a community event, Greater Medina Chamber of Commerce, Medina Ohio",
    8,
  );
  if (photos.length < 4) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
      <FadeIn>
        <div className="flex items-end justify-between mb-f21 gap-f13 flex-wrap">
          <div>
            <p className="text-overline text-cambridge mb-f8">Community</p>
            <h2 className="text-h2">Life at the Chamber</h2>
          </div>
          <Link
            href="/events"
            className="hidden sm:inline-flex text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
          >
            View all events →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-1.5">
          {photos.map((photo, i) => (
            <div
              key={photo.url}
              className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-sm)]"
            >
              <Image
                src={photo.url}
                alt={
                  photo.alt ||
                  "Chamber event, Greater Medina Chamber of Commerce, Medina Ohio"
                }
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover hover:scale-105 transition-transform duration-700"
                loading={i < 4 ? "eager" : "lazy"}
              />
            </div>
          ))}
        </div>

        <div className="mt-f13 sm:hidden text-center">
          <Link
            href="/events"
            className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
          >
            View all events →
          </Link>
        </div>
      </FadeIn>
    </section>
  );
}
