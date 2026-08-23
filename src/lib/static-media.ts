/**
 * static-media.ts — Server-side utility for static photo galleries.
 *
 * Reads image files from public/images/ at build/render time and returns
 * MediaItem[] so program pages can feed the same EventGallery component
 * used for CMS-uploaded event photos — one gallery component, two data sources.
 *
 * Call ONLY from Server Components. Uses fs.readdir, not safe on the client.
 */

import { readdir } from "fs/promises";
import { join } from "path";
import type { MediaItem } from "@/lib/media-store";

/**
 * Return MediaItem[] for all images in a single public/images/ subfolder.
 *
 * @param folder  Path relative to public/images/  e.g. "programs/compass/class-day-2"
 * @param alt     Alt text applied to every photo in this batch
 * @param limit   Optional cap on how many photos to return (takes first N after sort)
 * @param files   Optional explicit, ordered filename list — a curated subset of
 *                the folder (used verbatim, in order). Overrides folder read +
 *                limit. Lets a gallery hand-pick which photos show and skip
 *                rotated/low-quality ones the auto folder read would include.
 */
export async function getStaticPhotos(
  folder: string,
  alt: string,
  limit?: number,
  files?: string[],
): Promise<MediaItem[]> {
  let imageFiles: string[];
  if (files && files.length > 0) {
    imageFiles = files;
  } else {
    const dir = join(process.cwd(), "public", "images", folder);
    let all: string[];
    try {
      all = await readdir(dir);
    } catch {
      // Folder missing or unreadable — degrade gracefully rather than crash the page
      return [];
    }
    imageFiles = all
      .filter((f) => /\.(webp|jpg|jpeg|png|gif)$/i.test(f))
      .sort()                          // sequential numbered names sort correctly
      .slice(0, limit ?? all.length);
  }

  return imageFiles.map((filename) => ({
    url: `/images/${folder}/${filename}`,
    pathname: `images/${folder}/${filename}`,
    filename,
    size: 0,
    uploadedAt: "",
    alt,
  }));
}

/**
 * Merge photos from multiple folders into a single MediaItem[].
 * Useful for e.g. combining class-day-2 + class-day-3 into one gallery.
 */
export async function getMergedStaticPhotos(
  sources: Array<{ folder: string; alt: string; limit?: number; files?: string[] }>,
): Promise<MediaItem[]> {
  const batches = await Promise.all(
    sources.map(({ folder, alt, limit, files }) => getStaticPhotos(folder, alt, limit, files)),
  );
  return batches.flat();
}
