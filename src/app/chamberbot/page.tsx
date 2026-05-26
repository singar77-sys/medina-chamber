import type { Metadata } from "next";
import { ChamberBotRoute } from "./ChamberBotRoute";

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
    "Talk to the Greater Medina Chamber's AI assistant. Ask about members, events, programs, advocacy, or anything Medina-business, backed by 500+ live member records and the full chamber calendar.",
  openGraph: {
    title: "ChamberBot | Greater Medina Chamber of Commerce",
    description:
      "An AI assistant for Medina County business — members, events, programs, advocacy. 500+ live records, full calendar, instant answers.",
  },
  alternates: { canonical: "/chamberbot" },
  robots: { index: true, follow: true },
};

export default function ChamberBotPage() {
  return <ChamberBotRoute />;
}
