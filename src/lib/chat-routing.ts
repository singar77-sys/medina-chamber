/**
 * Topic → email routing for the "Talk to a human" handoff.
 *
 * When a ChamberBot user escalates to a human, we route the email to
 * the right team member based on what the conversation was about.
 * Falls back to the shared chamber inbox for ambiguous topics.
 *
 * Env vars override the defaults so the chamber can shuffle who
 * handles what without a code deploy:
 *   CHAMBER_MEMBERSHIP_EMAIL   — Stephanie (membership, events, ribbon cuttings)
 *   CHAMBER_EXECUTIVE_EMAIL    — Jaclyn (sponsorship, press, partnerships)
 *   CHAMBER_NOTIFY_EMAIL       — office@ (general/other)
 */

export type HandoffTopic =
  | "membership"
  | "events"
  | "sponsorship"
  | "executive"
  | "other";

export const HANDOFF_TOPICS: Array<{ value: HandoffTopic; label: string }> = [
  { value: "membership", label: "Membership (joining, tiers, benefits)" },
  { value: "events", label: "Events (registration, sponsorship, hosting)" },
  { value: "sponsorship", label: "Sponsorship or program partnerships" },
  { value: "executive", label: "Press, leadership, or executive office" },
  { value: "other", label: "Something else" },
];

export function isValidHandoffTopic(v: unknown): v is HandoffTopic {
  return (
    typeof v === "string" &&
    ["membership", "events", "sponsorship", "executive", "other"].includes(v)
  );
}

/** Returns the destination inbox for a given handoff topic. */
export function routeTopicToEmail(topic: HandoffTopic): {
  to: string;
  routedTo: string;
} {
  const stephanie =
    process.env.CHAMBER_MEMBERSHIP_EMAIL || "stephanie@medinaohchamber.com";
  const jaclyn =
    process.env.CHAMBER_EXECUTIVE_EMAIL || "jaclyn@medinaohchamber.com";
  const fallback =
    process.env.CHAMBER_NOTIFY_EMAIL || "office@medinaohchamber.com";

  switch (topic) {
    case "membership":
      return { to: stephanie, routedTo: "Stephanie Mueller (Membership & Events)" };
    case "events":
      return { to: stephanie, routedTo: "Stephanie Mueller (Membership & Events)" };
    case "sponsorship":
      return { to: jaclyn, routedTo: "Jaclyn Ringstmeier (Executive Director)" };
    case "executive":
      return { to: jaclyn, routedTo: "Jaclyn Ringstmeier (Executive Director)" };
    case "other":
      return { to: fallback, routedTo: "Chamber office" };
  }
}
