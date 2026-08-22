import { readdirSync } from "fs";
import { join } from "path";

/**
 * Curated member logos live at public/images/members/logos/{chamberSlug}.{ext}
 * (the same set the home-page Community Investor marquee shows). They are NOT in
 * the DB `organizations.logoUrl` column, so any surface that wants them — the
 * directory cards, a member's detail page — overlays this map onto its members.
 *
 * Built once at module load; server-only (uses fs). Restart the dev server to
 * pick up a newly added logo file.
 */
function buildMemberLogoMap(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const dir = join(process.cwd(), "public", "images", "members", "logos");
    for (const file of readdirSync(dir)) {
      const dot = file.lastIndexOf(".");
      if (dot === -1) continue;
      map.set(file.substring(0, dot), `/images/members/logos/${file}`);
    }
  } catch {
    /* directory absent — graceful no-logo fallback */
  }
  return map;
}

export const MEMBER_LOGOS = buildMemberLogoMap();

/** Curated logo path for a member slug, if a logo file exists on disk. */
export function memberLogo(slug: string): string | undefined {
  return MEMBER_LOGOS.get(slug);
}
