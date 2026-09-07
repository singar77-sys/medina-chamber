/**
 * Event-graphic routing + registry.
 *
 * Maps a chamber event (by slug + optional title) to the right graphic
 * component. Returns a plain `{ mode }`-accepting component so callers
 * don't need to think about per-graphic props — event-info and topic
 * bindings are wrapped internally.
 */

import type { EventInfo, GraphicMode } from "./shared";
import {
  AthenaAwardsGraphic,
  BusinessBrewGraphic,
  ChamberChatGraphic,
  CompassGraphic,
  StateOfTheCityGraphic,
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
 *    1. "Registration Required"   — Safety Council (no walk-ins) and paid
 *       programs like Networking WOW, where GrowthZone copy says advance
 *       registration and payment are preferred and no-shows are billed.
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

/**
 * Which graphic (if any) an event routes to. A plain string union rather than a
 * component so nothing has to construct a component to answer "does this event
 * have artwork?" — and so <EventGraphic> can render statically declared JSX.
 */
type GraphicKind =
  | "golf"
  | "athena"
  | "ribbon"
  | "social-connect"
  | "compass"
  | "networking-wow"
  | "safety-council"
  | "chamber-chat"
  | "business-brew"
  | "state-of-the-city"
  | "member-meeting"
  | "get-to-know"
  | "eggs-expertise";

function graphicKindFor(event: EventLike): GraphicKind | null {
  const s = event.slug.toLowerCase();
  const t = (event.title ?? "").toLowerCase();

  if (s.includes("golf") || t.includes("golf")) return "golf";
  if (s.includes("athena") || t.includes("athena")) return "athena";
  if (s.includes("ribbon") || t.includes("ribbon cutting")) return "ribbon";
  if (s.includes("social-connect") || t.includes("social connect")) return "social-connect";
  if (s.includes("compass") || t.includes("compass")) return "compass";
  if (s.startsWith("networking-wow") || t.includes("networking wow")) return "networking-wow";
  if (s.startsWith("safety-council")) return "safety-council";
  if (s.startsWith("chamber-chat")) return "chamber-chat";
  if (s.startsWith("business-brew")) return "business-brew";
  // Event-specific artwork must outrank the generic member-meeting branch.
  if (s.includes("state-of-the-city") || t.includes("state of the city")) {
    return "state-of-the-city";
  }
  if (
    s.startsWith("chamber-member-meeting") ||
    s.startsWith("member-meeting") ||
    t.includes("member meeting")
  ) {
    return "member-meeting";
  }
  if (s.startsWith("get-to-know")) return "get-to-know";
  if (s.startsWith("eggs-expertise")) return "eggs-expertise";
  return null;
}

/** "eggs-expertise-canva-101" -> "Canva 101" */
function eggsTopicFor(slug: string): string {
  const suffix = slug.toLowerCase().replace(/^eggs-expertise-?/, "");
  if (!suffix) return "Canva 101";
  return suffix
    .split("-")
    .map((w) => (/^\d+$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Does this event have built-in artwork? Cheap — no rendering involved. */
export function hasEventGraphic(event: EventLike): boolean {
  return graphicKindFor(event) !== null;
}

/**
 * The event's built-in artwork, or null. One stable component instead of the
 * per-event components this module used to build on the fly: a component
 * created during a parent's render is a brand-new type on every render, so
 * React unmounts and remounts the whole subtree each time.
 */
export function EventGraphic({
  event,
  mode,
}: {
  event: EventLike;
  mode?: GraphicMode;
}) {
  const kind = graphicKindFor(event);
  if (!kind) return null;
  const info = eventInfoFor(event);

  switch (kind) {
    case "golf":
      return <GolfOutingGraphic mode={mode} eventInfo={info} />;
    case "athena":
      return <AthenaAwardsGraphic mode={mode} />;
    case "ribbon":
      return <RibbonCuttingGraphic mode={mode} />;
    case "social-connect":
      return <SocialConnectGraphic mode={mode} />;
    case "compass":
      return <CompassGraphic mode={mode} />;
    case "networking-wow":
      return <NetworkingWowGraphic mode={mode} eventInfo={info} />;
    case "safety-council":
      return <SafetyCouncilGraphic mode={mode} eventInfo={info} />;
    case "chamber-chat":
      return <ChamberChatGraphic mode={mode} eventInfo={info} />;
    case "business-brew":
      return <BusinessBrewGraphic mode={mode} eventInfo={info} />;
    case "state-of-the-city":
      return <StateOfTheCityGraphic mode={mode} />;
    case "member-meeting":
      return <MemberMeetingGraphic mode={mode} />;
    case "get-to-know":
      return (
        <GetToKnowGraphic
          mode={mode}
          eventInfo={{ ...info, note: info.note ?? "Free · RSVP Required" }}
        />
      );
    case "eggs-expertise":
      return (
        <EggsExpertiseGraphic
          mode={mode}
          topic={eggsTopicFor(event.slug)}
          eventInfo={info}
        />
      );
  }
}
