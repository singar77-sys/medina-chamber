export interface Inductee {
  name: string;
  /** Omitted for inductees without a photo yet — falls back to an initials avatar. */
  photo?: string;
  year?: number;
  category?: "Posthumous Individual" | "Living Individual" | "Outstanding Organization";
  /** Only inductees with a bio get a clickable tile + detail modal. */
  bio?: string;
}

/**
 * First + last name initial. Unlike the business-name getInitials (first two
 * words), this skips middle names, quoted nicknames, and initials so
 * "Norbert “Nobby” Lewandowski" reads as NL, not N + the opening quote mark.
 */
export function personInitials(name: string): string {
  const words = name.replace(/[“”"'‘’]/g, "").trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words[words.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase();
}
