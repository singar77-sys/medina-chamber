import type { Metadata } from "next";
import { getUpcomingEvents } from "@/data/events";
import { ChamberBotRoute } from "./ChamberBotRoute";
import { OG_IMAGE } from "@/lib/og";

/**
 * /chamberbot — direct entry to the ChamberBot full-viewport portal.
 *
 * The page renders nothing in its own document flow. ChamberBotRoute
 * mounts the ChamberBotPortal (which uses createPortal to document.body)
 * with `open={true}` so the user lands directly inside the immersive
 * conversation surface — no hero, no on-ramp, no extra click.
 *
 * Closing the portal routes the user back to the previous page (or
 * the homepage if there's no history).
 */
export const metadata: Metadata = {
  title: "ChamberBot, Immersive Experience",
  description:
    "Talk to the Greater Medina Chamber's AI assistant. Ask about members, events, programs, advocacy, or anything Medina-business, backed by live member records and the full chamber calendar.",
  openGraph: {
    images: OG_IMAGE,
    title: "ChamberBot | Greater Medina Chamber of Commerce",
    description:
      "An AI assistant for Medina County business — members, events, programs, advocacy. Live records, full calendar, instant answers.",
  },
  alternates: { canonical: "/chamberbot" },
  robots: { index: true, follow: true },
};

export default function ChamberBotPage() {
  return (
    <>
      {/*
        The portal is client-only and covers the viewport, so without this
        block the indexed document is an empty <main> with no h1: a soft-404
        candidate on a page the sitemap advertises at priority 0.4. Kept
        sr-only so it never flashes before the portal mounts.
      */}
      <section className="sr-only">
        <h1>ChamberBot</h1>
        <p>
          ChamberBot is the Greater Medina Chamber of Commerce AI assistant.
          Ask it about member businesses, upcoming events, membership tiers,
          Safety Council, Compass, or anything else about doing business in
          Medina County, and it answers from live chamber records and the
          full chamber calendar.
        </p>
      </section>
      {/* Counted here, in the Server Component. The portal rail shows this
          one number; importing @/data/events client-side to get it pulled
          the whole ~70 KB dataset into the bundle. */}
      <ChamberBotRoute upcomingEventCount={getUpcomingEvents().length} />
    </>
  );
}
