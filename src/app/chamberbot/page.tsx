import type { Metadata } from "next";
import { ChamberBotRoute } from "./ChamberBotRoute";
import { totalCount } from "@/data/members";

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
  title: "ChamberBot — Immersive Experience",
  description:
    `Talk to the Greater Medina Chamber's AI assistant. Ask about members, events, programs, advocacy, or anything Medina-business — backed by ${totalCount}+ live member records and the full chamber calendar.`,
  alternates: { canonical: "/chamberbot" },
  robots: { index: true, follow: true },
};

export default function ChamberBotPage() {
  return <ChamberBotRoute />;
}
