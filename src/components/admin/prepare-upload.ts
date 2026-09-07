"use client";

/**
 * Shrink an image in the browser so the POST fits inside the platform's
 * request-body cap.
 *
 * Chosen over an authenticated direct-to-Blob client upload because the route
 * does more than store bytes: it normalises every image to WebP at 2400px,
 * mints the SEO filename and alt text from the description, and pulls the
 * per-description sequence number out of a Redis counter. Moving the transfer
 * off the function would either lose that normalisation or need a second
 * round-trip to reapply it. Shrinking first keeps the whole pipeline intact and
 * changes one thing: what leaves the browser.
 *
 * Nothing under the budget is touched, so a normal photo is byte-for-byte what
 * it always was. Only oversized files get re-encoded, and only down to the same
 * 2400px WebP the server would have produced from them anyway.
 */

import {
  MAX_CANVAS_AREA,
  MAX_IMAGE_WIDTH,
  REQUEST_BUDGET_BYTES,
  formatBytes,
} from "@/lib/upload-limits";

/** Quality ladder, then a size ladder. Stops at the first result under budget. */
const QUALITY_STEPS = [0.85, 0.7, 0.55];
const SCALE_STEPS = [1, 0.75, 0.5, 0.35];

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

function webpName(name: string): string {
  return `${name.replace(/\.[^.]+$/, "") || "image"}.webp`;
}

/**
 * Returns the file to upload: the original when it already fits, otherwise a
 * downscaled WebP. Throws with a readable message when the image cannot be
 * brought under budget, so the caller can show it instead of a failed POST.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (file.size <= REQUEST_BUDGET_BYTES) return file;

  if (typeof createImageBitmap !== "function") {
    throw new Error(
      `This browser can't resize images before upload, and ${formatBytes(file.size)} is over the ${formatBytes(REQUEST_BUDGET_BYTES)} limit. Export it smaller and try again.`,
    );
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That image could not be read. Try re-exporting it as JPEG or PNG.");
  }

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image resizing is unavailable in this browser.");

    // Cap the WIDTH by the canvas AREA as well as MAX_IMAGE_WIDTH. Safari
    // silently returns a blank canvas past its area cap rather than throwing, so
    // an extremely tall image would upload as a white rectangle.
    const aspect = bitmap.height / bitmap.width;
    const areaLimitedWidth = Math.floor(Math.sqrt(MAX_CANVAS_AREA / Math.max(aspect, 1e-6)));
    const fitWidth = Math.max(1, Math.min(bitmap.width, MAX_IMAGE_WIDTH, areaLimitedWidth));

    for (const scale of SCALE_STEPS) {
      const width = Math.max(1, Math.round(fitWidth * scale));
      const height = Math.max(1, Math.round((width / bitmap.width) * bitmap.height));
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);

      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, quality);
        if (blob && blob.size <= REQUEST_BUDGET_BYTES) {
          return new File([blob], webpName(file.name), { type: "image/webp" });
        }
      }
    }

    throw new Error(
      `That image is still over ${formatBytes(REQUEST_BUDGET_BYTES)} after resizing. Export it smaller and try again.`,
    );
  } finally {
    bitmap.close();
  }
}
