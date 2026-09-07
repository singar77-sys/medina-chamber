/**
 * Shared upload limits for the admin media uploaders and the route they post to.
 *
 * The numbers used to disagree with the platform. Both uploaders advertised
 * "up to 15 MB" and POSTed the ORIGINAL file as multipart form data to
 * /api/admin/media/upload, where sharp converts it to WebP — but the conversion
 * only happens once the bytes reach the function, and Vercel caps a function's
 * request body at 4.5 MB. Anything between 4.5 MB and the promised 15 MB was
 * rejected by the platform before a single line of our validation ran, so the
 * route's own "File exceeds the 15 MB limit" message could never fire for the
 * files it was written for. A modern phone photo clears 4.5 MB routinely.
 *
 * So: the browser downscales anything over REQUEST_BUDGET_BYTES before it is
 * sent (see components/admin/prepare-upload.ts), the route enforces the same
 * budget, and the UI quotes the real ceiling — the largest file we are willing
 * to decode in the browser, not a number the request could never carry.
 */

/** Vercel's hard cap on a serverless function's request body. Requests above
 *  this never reach the route: the platform answers, usually with HTML. */
export const PLATFORM_REQUEST_LIMIT_BYTES = 4.5 * 1024 * 1024;

/** What we actually send. Under the platform cap with room for the multipart
 *  boundaries, the other form fields, and headers. */
export const REQUEST_BUDGET_BYTES = 4 * 1024 * 1024;

/** Largest original we will try to decode and downscale in the browser.
 *  Beyond this the tab is likely to run out of memory mid-decode, so refuse
 *  clearly and up front instead of failing halfway through. */
export const MAX_SOURCE_BYTES = 40 * 1024 * 1024;

/** Matches the route's ALLOWED_TYPES and the file inputs' accept attributes. */
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

/** Longest edge we downscale to — the same width the server's sharp pipeline
 *  resizes to, so shrinking client-side costs no quality the upload would keep. */
export const MAX_IMAGE_WIDTH = 2400;

/** Largest canvas we will ask a browser to allocate, in pixels.
 *
 *  Safari (iOS especially) caps total canvas AREA, not just each dimension, and
 *  over the cap it does not throw — it hands back a blank canvas, so the upload
 *  succeeds and stores a white rectangle. A very tall panorama or a stitched
 *  scan clears the cap at 2400px wide. 16.7M px (4096x4096) is the documented
 *  iOS ceiling; staying under it is cheaper than trying to detect a blank
 *  result after the fact. */
export const MAX_CANVAS_AREA = 16_777_216;

export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

/**
 * Pre-flight validation, run BEFORE anything is uploaded so an unsupported or
 * hopeless file gets a real sentence instead of a failed request.
 * Returns null when the file is acceptable.
 */
export function checkSourceFile(file: { type: string; size: number }): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Only JPEG, PNG, WebP, GIF, and AVIF images are accepted.";
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return `That image is ${formatBytes(file.size)} — too large to process. Export it under ${formatBytes(MAX_SOURCE_BYTES)} and try again.`;
  }
  return null;
}

/**
 * Turn a failed upload response into something a person can act on.
 *
 * The uploaders used to call res.json() unconditionally, so any non-JSON
 * failure — the platform's own 413 for an oversized body, a 502 HTML page, an
 * auth redirect — surfaced as "Unexpected token '<'". Read the content type
 * first and name the actual problem.
 */
export async function uploadErrorFromResponse(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const data = (await res.json()) as { error?: unknown };
      if (typeof data?.error === "string" && data.error) return data.error;
    } catch {
      // Malformed JSON — fall through to the status-based message.
    }
  }
  if (res.status === 413) {
    return `That image was still over the ${formatBytes(PLATFORM_REQUEST_LIMIT_BYTES)} upload limit after resizing. Export it smaller and try again.`;
  }
  if (res.status === 401 || res.status === 403) {
    return "Your admin session expired. Sign in again and retry the upload.";
  }
  return `Upload failed (HTTP ${res.status}).`;
}
