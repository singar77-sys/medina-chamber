/**
 * Google Places ratings lookup for ChamberBot.
 * Only exposes ratings 4.0+ — lower-rated members are silently omitted.
 */

export interface MemberRating {
  chamberSlug: string;
  found: boolean;
  fetchedAt: string;
  placeId?: string;
  googleName?: string;
  rating?: number;
  reviewCount?: number;
  businessStatus?: string;
  hours?: string[];
  googleAddress?: string;
}

let _index: Record<string, MemberRating> | null = null;

function getIndex(): Record<string, MemberRating> {
  if (_index) return _index;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raw = require("@/data/member-ratings.json");
    _index = {};
    (raw.members as MemberRating[]).forEach((m) => {
      _index![m.chamberSlug] = m;
    });
  } catch {
    _index = {};
  }
  return _index;
}

/** Returns rating data only if the business has a 4.0+ Google rating. */
export function getPublicRating(chamberSlug: string): MemberRating | null {
  const r = getIndex()[chamberSlug];
  if (!r || !r.found || !r.rating || r.rating < 4.0) return null;
  return r;
}

/** Format rating for ChamberBot prompt context */
export function formatRatingLine(chamberSlug: string): string {
  const r = getPublicRating(chamberSlug);
  if (!r) return "";

  const stars = "★".repeat(Math.round(r.rating!));
  const reviews = r.reviewCount ? ` across ${r.reviewCount.toLocaleString()} Google reviews` : "";
  return `  Google rating: ${r.rating!.toFixed(1)}/5 ${stars}${reviews}`;
}
