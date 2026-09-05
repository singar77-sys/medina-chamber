"use client";

import { useRouter } from "next/navigation";
import { ChamberBotPortal } from "@/components/holographic/ChamberBotPortal";
import { PostHogProvider } from "@/components/PostHogProvider";

/**
 * /chamberbot route surface — auto-opens the ChamberBotPortal directly,
 * no on-ramp hero. Closing the portal navigates back: previous history
 * entry if available, otherwise the homepage. The portal renders into
 * document.body via createPortal so this client component returns nothing
 * visible itself; it just orchestrates the portal's lifecycle.
 *
 * Earlier iteration of this route rendered a HolographicChamber hero
 * (badge, headline, mascot, suggestion form) that opened the portal as
 * an additional step. The hero was a vestibule, not a destination —
 * users came expecting "the immersive experience" and got an on-ramp
 * to it. Now the page IS the portal.
 */
export function ChamberBotRoute({
  upcomingEventCount,
}: {
  /** Counted on the server so the events dataset stays out of this bundle. */
  upcomingEventCount: number;
}) {
  const router = useRouter();

  function handleClose() {
    // Prefer back-nav so users return to whatever page led them here
    // (homepage, footer link, etc.). Fall back to "/" if there's no
    // history (direct nav, deep link, refresh on this route).
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  // PostHog is mounted HERE rather than in the root layout: the portal is its
  // only consumer, and a root-level provider put the whole posthog-js bundle
  // (~62 KB gzip) into the shared chunk for all 49 public pages — for a
  // library that no-ops entirely unless NEXT_PUBLIC_POSTHOG_KEY is set.
  return (
    <PostHogProvider>
      <ChamberBotPortal
        open
        initialQuery={null}
        onClose={handleClose}
        upcomingEventCount={upcomingEventCount}
      />
    </PostHogProvider>
  );
}
