/**
 * Shared validation for admin campaign fields.
 *
 * Single-line fields (name/subject/from name) are bound into the email envelope
 * and the From header, so they must not carry control characters (CR/LF would
 * malform the From rendering or DMARC alignment) and must be length-capped. The
 * control-char check iterates char codes rather than a regex with \u escapes —
 * those escapes have a habit of decoding to literal invisible bytes in source.
 */

export const MAX_NAME = 150;
export const MAX_SUBJECT = 300;
export const MAX_FROM_NAME = 100;
export const MAX_HTML = 500_000;

/** Trim, reject control chars + over-length; null = invalid/empty. */
export function cleanLine(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > max) return null;
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return null; // C0 controls (incl CR/LF/tab) + DEL
  }
  return t;
}
