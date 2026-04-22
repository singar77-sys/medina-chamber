/**
 * Default ChamberBot starter prompts — shown when there are no messages
 * yet, in any surface that displays a quick-start UI:
 *
 *   • ChamberBotPortal (immersive overlay) — first-open chip row
 *   • ChatWidget (floating panel) — empty-state chip row, when no
 *     page-specific context applies
 *
 * Single source of truth so the prompts don't drift across surfaces.
 *
 * Three prompts — one for each of the bot's three modes (find a member,
 * read the calendar, explain a chamber program). More than that crowds
 * mobile and dilutes the "obvious starting point" intent.
 */
export const DEFAULT_PROMPTS = [
  "Find a local plumber",
  "When is the next event?",
  "How much does membership cost?",
] as const;
