/**
 * Event-graphic routing + registry.
 *
 * Maps a chamber event (by slug + optional title) to the right graphic
 * component. Returns a plain `{ mode }`-accepting component so callers
 * don't need to think about per-graphic props — event-info and topic
 * bindings are wrapped internally.
 */

import type { ComponentType, FC } from "react";
import type { EventInfo, GraphicMode } from "./shared";
import {
  AthenaAwardsGraphic,
  BusinessBrewGraphic,
  ChamberChatGraphic,
  EggsExpertiseGraphic,
  GetToKnowGraphic,
  GolfOutingGraphic,
  MemberMeetingGraphic,
  NetworkingWowGraphic,
  RibbonCuttingGraphic,
  SafetyCouncilGraphic,
  SocialConnectGraphic,
} from "./EventGraphics";

/**
 * Minimal event shape the router needs. Pages pass their full event
 * record; only the listed fields are read.
 */
export interface EventLike {
  slug: string;
  title?: string;
  // Optional event-instance fields. When provided, graphics that support
  // an event-info plinth (currently NetworkingWow, SafetyCouncil,
  // ChamberChat, BusinessBrew, EggsExpertise) render the bottom
  // date/time/registration band.
  dayOfWeek?: string;
  month?: string;
  day?: number;
  year?: number;
  startTime?: string;
  pricing?: string;
  venue?: string;
  address?: string;
}

/** Build the EventInfo bag that bound graphic components can render.
 *  The "note" field on the plinth has three buckets derived from the
 *  event's pricing copy:
 *
 *    1. "Registration Required"   — events where the chamber explicitly
 *       blocks walk-ins (Networking WOW, Safety Council, paid programs).
 *    2. "Free · Walk-Ins Welcome" — free, casual events where copy says
 *       registration is preferred but not required (Chamber Chat,
 *       Business Brew, Get to Know).
 *    3. undefined                 — fallback; plinth right side empty.
 */
function eventInfoFor(event: EventLike): EventInfo {
  let note: string | undefined;
  const p = event.pricing ?? "";
  if (/registration required|walk-ins are not permitted|advanced registration required/i.test(p)) {
    note = "Registration Required";
  } else if (/no cost|free/i.test(p) && /preferred but not required|registration preferred/i.test(p)) {
    note = "Free · Walk-Ins Welcome";
  } else if (/^\s*\$\d/.test(p)) {
    // Paid events without an explicit walk-in clause (Member Meeting,
    // Eggs & Expertise, Golf). The dollar amount up top means people
    // need to register to pay, so the badge applies.
    note = "Registration Required";
  }
  return {
    dayOfWeek: event.dayOfWeek,
    month: event.month,
    day: event.day,
    year: event.year,
    time: event.startTime,
    note,
    venue: event.venue,
    address: event.address,
  };
}

export function getEventGraphicRenderer(
  event: EventLike,
): ComponentType<{ mode?: GraphicMode }> | null {
  const s = event.slug.toLowerCase();
  const t = (event.title ?? "").toLowerCase();

  if (s.includes("golf") || t.includes("golf")) {
    const info = eventInfoFor(event);
    const Bound: FC<{ mode?: GraphicMode }> = (props) => (
      <GolfOutingGraphic {...props} eventInfo={info} />
    );
    Bound.displayName = "GolfOutingGraphic(bound)";
    return Bound;
  }
  if (s.includes("athena") || t.includes("athena")) return AthenaAwardsGraphic;
  if (s.includes("ribbon") || t.includes("ribbon cutting")) return RibbonCuttingGraphic;
  if (s.includes("social-connect") || t.includes("social connect")) return SocialConnectGraphic;

  if (s.startsWith("networking-wow") || t.includes("networking wow")) {
    const info = eventInfoFor(event);
    const Bound: FC<{ mode?: GraphicMode }> = (props) => (
      <NetworkingWowGraphic {...props} eventInfo={info} />
    );
    Bound.displayName = "NetworkingWowGraphic(bound)";
    return Bound;
  }
  if (s.startsWith("safety-council")) {
    const info = eventInfoFor(event);
    const Bound: FC<{ mode?: GraphicMode }> = (props) => (
      <SafetyCouncilGraphic {...props} eventInfo={info} />
    );
    Bound.displayName = "SafetyCouncilGraphic(bound)";
    return Bound;
  }
  if (s.startsWith("chamber-chat")) {
    const info = eventInfoFor(event);
    const Bound: FC<{ mode?: GraphicMode }> = (props) => (
      <ChamberChatGraphic {...props} eventInfo={info} />
    );
    Bound.displayName = "ChamberChatGraphic(bound)";
    return Bound;
  }
  if (s.startsWith("business-brew")) {
    const info = eventInfoFor(event);
    const Bound: FC<{ mode?: GraphicMode }> = (props) => (
      <BusinessBrewGraphic {...props} eventInfo={info} />
    );
    Bound.displayName = "BusinessBrewGraphic(bound)";
    return Bound;
  }
  if (
    s.startsWith("chamber-member-meeting") ||
    s.startsWith("member-meeting") ||
    t.includes("member meeting")
  ) {
    return MemberMeetingGraphic;
  }
  if (s.startsWith("get-to-know")) {
    const info = eventInfoFor(event);
    const withNote = { ...info, note: info.note ?? "Free · RSVP Required" };
    const Bound: FC<{ mode?: GraphicMode }> = (props) => (
      <GetToKnowGraphic {...props} eventInfo={withNote} />
    );
    Bound.displayName = "GetToKnowGraphic(bound)";
    return Bound;
  }
  if (s.startsWith("eggs-expertise")) {
    const info = eventInfoFor(event);
    const suffix = s.replace(/^eggs-expertise-?/, "");
    const topic = suffix
      ? suffix
          .split("-")
          .map((w) => (/^\d+$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
          .join(" ")
      : "Canva 101";
    const BoundEggs: FC<{ mode?: GraphicMode }> = (props) => (
      <EggsExpertiseGraphic {...props} topic={topic} eventInfo={info} />
    );
    BoundEggs.displayName = `EggsExpertiseGraphic(${topic})`;
    return BoundEggs;
  }
  return null;
}
