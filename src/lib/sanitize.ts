/**
 * Shared input sanitization helpers for public form routes.
 *
 * escHtml, pickString, and pickOptional were duplicated across
 * contact/route.ts and apply/route.ts. Centralized here so both
 * routes enforce the same validation contract.
 */

/** HTML-escape &, <, >, and " so values are safe inside attribute or
 *  text contexts in rendered email HTML. */
export function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Returns the trimmed string if valid (non-empty, within length cap),
 * or null otherwise. Used for required fields where empty/invalid
 * input should reject the request.
 */
export function pickString(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) return null;
  return trimmed;
}

/**
 * Same as pickString but returns "" instead of null. Used for optional
 * fields where missing input should render as empty rather than reject.
 */
export function pickOptional(raw: unknown, max: number): string {
  return pickString(raw, max) ?? "";
}
