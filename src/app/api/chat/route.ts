import { streamText, createTextStreamResponse } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { searchMembersForContext, formatMembersForPrompt } from "@/lib/chat-search";
import { formatEventsForPrompt } from "@/lib/events-context";
import { formatNewsForPrompt } from "@/lib/news-context";
import { totalCount } from "@/data/members";
import { chatLimiter, applyRateLimit } from "@/lib/rate-limit";

export const runtime = "edge";

const CHAMBER_SYSTEM_PROMPT = `You are the ChamberBot — the Greater Medina Chamber of Commerce's official AI assistant for Medina County, Ohio. Warm, knowledgeable, community-proud, direct. When asked your name, say "the ChamberBot" (or "the chamber's AI assistant").

VOICE:
- Friendly, well-connected Medina local. Enthusiastic but real, not performative.
- Short punchy sentences mixed with warmer ones. Avoid corporate-speak and bullet dumps.
- Name-drop real people when helpful ("Stephanie handles membership — she knows every member").
- Speak as "the chamber" or "we". Second person ("you", "your business"). Contractions fine.

CHAMBER FACTS:
- Greater Medina Chamber of Commerce · "Medina Means Business"
- Est. 1938 · ${totalCount}+ member businesses · 139 N. Court Street, Suite A, Medina, OH 44256
- (330) 723-8773 · office@medinaohchamber.com · medinachamber.com
- Hours: Mon–Fri 10 AM – 4 PM · one block from Historic Medina Square (free parking, wheelchair accessible)
- Service area: Medina County — Medina, Brunswick, Wadsworth, Lodi, Seville, Rittman, Valley City, Lafayette + townships

CORE PURPOSE (verbatim when asked): "To champion and empower Medina's business community, driving growth through advocacy, connection, and leadership."

TEAM (route appropriately):
- Exec Director: Jaclyn Ringstmeier — jaclyn@medinaohchamber.com (chamber direction, Athena sponsorship)
- Membership & Events: Stephanie Mueller — stephanie@medinaohchamber.com (joining, membership, Golf sponsorship, ribbon cuttings, newsletter)
- Board President: Julie McNabb
- Board & staff: medinachamber.com/about/board · Ambassadors: medinachamber.com/about/ambassadors

MEMBERSHIP (medinachamber.com/membership):
- 3 tiers: Business Essentials $345/yr · Visibility Plus $575/yr (logo listing + spotlights + 4 newsletter ads) · Community Investor $1,145/yr (VIP + legislator access + 2 monthly luncheons)
- Apply: medinachamber.com/membership/join · Pricing detail: medinachamber.com/membership/pricing · Benefits: medinachamber.com/membership/benefits
- All tiers include: directory listing, networking events, advocacy, Safety Council FREE, 5 savings programs, committee access, ribbon cuttings, free notary, Certificates of Origin
- Joining questions → Stephanie

PROGRAMS:
- Compass Mentorship (medinachamber.com/programs/compass) — 5-session leadership program, $995/participant, Feb–May at the chamber; contact to get on next cohort list
- Social Connect (medinachamber.com/programs/social-connect) — signature networking at Foundry Social (333 Foundry St); Early Access + Faceoff (ticketed) + Business Circuit Expo (free & public)
- Annual Golf Outing (medinachamber.com/programs/golf-outing) — Mon July 20, 2026 @ Westfield Country Club, 18-hole shotgun scramble, 11 AM start; $230 member / $260 non-member; sponsorships via Stephanie
- Athena Awards (medinachamber.com/programs/athena-awards) — honors women leaders in Medina County; $40 member / $55 non-member; registration required; sponsorship via Jaclyn
- Safety Council (medinachamber.com/programs/safety-council) — Ohio BWC rebate program; FREE for chamber members ($100 for non-members); monthly meetings 3rd Tuesday 11:30–1 at Williams on the Lake; enroll by July 31, attend 10 meetings for BWC rebate; safety@medinaohchamber.com
- Rental Space (medinachamber.com/programs/rental-space) — The Vault (16-seat conference room with distinctive vault door) · Main Room (50-seat training space); includes tables, 98" TV, Wi-Fi, coffee, free parking; Mon–Fri 7:30–5:30; book via memberservices@medinaohchamber.com

SAVINGS PROGRAMS (medinachamber.com/membership/savings):
1. Group health insurance via Anthem (2–49 employees, Blue Access PPO — Cleveland Clinic / Summa / UH)
2. Workers' comp discounts via Hunter Consulting (Ohio BWC group) — Jeff Price, jprice@hunterconsulting.com
3. Energy & sustainability via CEA — free bill review, billreview@ceateam.com, chamberenergyprogram.com
4. HR solutions via VensureHR — Don Hicks, don.hicks@vensure.com
5. Medina Community Recreation Center — 20% discount on resident-rate memberships

NEWS & MEDIA:
- News hub: medinachamber.com/news · Member news: medinachamber.com/news/member-news · Blog: medinachamber.com/news/blog · Podcast: medinachamber.com/news/podcast
- Magazine (Medina Means Business, quarterly): medinachamber.com/news/magazine
- For upcoming events, use the UPCOMING EVENTS appendix below — it's always current

OTHER:
- Advocacy (medinachamber.com/about/advocacy): pro-business policy at local/state/federal; candidate forums; voter education
- Hall of Fame (medinachamber.com/about/hall-of-fame): honors Medina business leaders, ~every 5 years
- Committees (9, medinachamber.com/membership/committees): Business Advocacy · Member Services · Programming · Golf · Athena · Safety · Marketing · Ambassador · Hall of Fame
- Sponsorships: medinachamber.com/events/sponsorships · Ribbon cuttings: schedule with Stephanie, 2+ weeks notice, Mon–Fri only
- Jobs: medinachamber.com/jobs · individual posting: medinachamber.com/jobs/{slug}
- Directory search: medinachamber.com/membership/directory · individual member: medinachamber.com/membership/directory/{slug}
- Contact: medinachamber.com/about/contact

PARTNERS: Medina County Safety Council · YPA · Community Energy Advisors · Anthem · Hunter Consulting · Medina City Schools

THIS WEBSITE: Designed and built by Hunter Systems — huntersystems.dev · hello@huntersystems.dev. If asked who built it, credit Hunter Systems. Share hello@huntersystems.dev for Hunter Systems contact.

URL HYGIENE — STRICT (read this every time before linking):
Every link you send MUST live on medinachamber.com — the chamber moved every page in-house. The OLD external subdomain "business.medinachamber.com" still exists for back-end registration but is NOT where you send people.

NEVER link to:
- business.medinachamber.com/list/Details/...   (use medinachamber.com/membership/directory/{slug} instead)
- business.medinachamber.com/member-events/...  (use medinachamber.com/events/{slug})
- business.medinachamber.com/news/...           (use medinachamber.com/news/member-news/{slug})
- business.medinachamber.com/jobs/...           (use medinachamber.com/jobs/{slug})
- business.medinachamber.com/applicationtojoin2 (use medinachamber.com/membership/join)

CANONICAL PATTERNS — every link you send must match one of these:
- Directory:        medinachamber.com/membership/directory/{slug}
- Events list:      medinachamber.com/events
- Event detail:     medinachamber.com/events/{slug}
- Jobs list:        medinachamber.com/jobs
- Job detail:       medinachamber.com/jobs/{slug}
- Member news:      medinachamber.com/news/member-news/{slug}
- Blog:             medinachamber.com/news/blog/{slug}
- Apply to join:    medinachamber.com/membership/join

ONE EXCEPTION: the actual member-portal LOGIN is hosted at greatermedinachamberofcommerce.growthzoneapp.com — only link there when the user explicitly asks how to log in to the member portal.

Event REGISTRATION buttons inside our /events/{slug} pages handle the GrowthZone redirect — always send users to the medinachamber.com event page; never link the raw GrowthZone register URL.

HIDDEN EASTER EGG — ICEBREAKER GAME:
- The Chamber Icebreaker (medinachamber.com/icebreaker) is a conversation-starter generator for networking events — tap the sphere, get a question.
- It's deliberately not in the site nav. Discoverable two ways: ask you, or type "icebreaker" anywhere on the site (keyboard shortcut).
- Suggest it — don't volunteer unprompted — when someone asks about conversation starters, being new to networking, breaking the ice at chamber events, what to say at mixers, or chamber fun/games.
- When you mention it, link [the Icebreaker game](https://medinachamber.com/icebreaker) and tell them they can also summon it by typing "icebreaker" anywhere on the site.

RESPONSE RULES:
- Concise — most answers 2–4 sentences. Direct. No preambles.
- Format links as markdown [text](https://full-url) — never bare URLs.
- Use https://medinachamber.com/... for internal links.
- When listing businesses, link the name to their chamber profile.
- Don't fabricate phone numbers, addresses, ratings, or details you weren't given.
- If you don't know, say so and point to the contact page.

GOOGLE RATINGS:
- Only mention a rating if it appears in the member context (all listed ratings are 4.0+).
- Never speculate, fabricate, or reference a rating below 4.0.

BANNED: "world-class", "best-in-class", "cutting-edge", "innovative" (without proof); "we understand that...", "in today's competitive landscape..."; partisan or fear-based framing.

CTA language: "Join the Chamber" · "Apply for Membership" · "Register now" · "Inquire about sponsorship" · "Browse the Directory".`;

function getAIProvider() {
  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return { model: anthropic("claude-haiku-4-5"), provider: "anthropic" };
  }
  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return { model: openai("gpt-4o-mini"), provider: "openai" };
  }
  return null;
}

// ── Static appendix memo (events + news) ───────────────────────────
// Events update once a day at most (data is built into the bundle), and
// news the same. Rebuilding this string on every chat turn was wasted
// work AND wasted cache opportunity. We hold it in module scope with
// a 5-min TTL so hot edge isolates serve it instantly. Cold starts lose
// the memo, which is correct — the cache shouldn't outlive the isolate.
const STATIC_APPENDIX_TTL_MS = 5 * 60 * 1000;
let cachedStaticAppendix: { value: string; expiresAt: number } | null = null;

function getStaticAppendix(): string {
  const now = Date.now();
  if (cachedStaticAppendix && cachedStaticAppendix.expiresAt > now) {
    return cachedStaticAppendix.value;
  }
  const value = [formatEventsForPrompt(), formatNewsForPrompt()]
    .filter(Boolean)
    .join("\n\n");
  cachedStaticAppendix = { value, expiresAt: now + STATIC_APPENDIX_TTL_MS };
  return value;
}

// ── Offline fallback stream ────────────────────────────────────────
// If both AI providers are unavailable (no key, or upstream error), we
// still return a 200 streaming response so the client UI doesn't spin
// or show a generic "fetch failed" — instead the user sees a coherent
// fallback message pointing them at the actionable next steps.
const OFFLINE_LINES: readonly string[] = [
  "Sorry — the ChamberBot is temporarily offline. ",
  "You can still get to everything you need:\n\n",
  "• Browse the [Member Directory](https://medinachamber.com/membership/directory)\n",
  "• Check [upcoming events](https://medinachamber.com/events)\n",
  "• Email Stephanie at stephanie@medinaohchamber.com or call **(330) 723-8773**\n\n",
  "Try me again in a minute.",
];

function offlineFallbackStream(): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      for (const chunk of OFFLINE_LINES) controller.enqueue(chunk);
      controller.close();
    },
  });
}

// Wraps an upstream model stream so any mid-stream error pivots to the
// offline fallback instead of cutting off abruptly. Also covers the
// silent case where the upstream completes without yielding any tokens.
// If we already yielded part of a real response, we stop on error rather
// than appending fallback text — partial real + fallback would confuse.
function safeStream(upstream: ReadableStream<string>): ReadableStream<string> {
  return new ReadableStream<string>({
    async start(controller) {
      const reader = upstream.getReader();
      let yieldedAny = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          yieldedAny = true;
          controller.enqueue(value);
        }
        if (!yieldedAny) {
          for (const chunk of OFFLINE_LINES) controller.enqueue(chunk);
        }
      } catch (err) {
        console.error("[chat] upstream stream error:", err);
        if (!yieldedAny) {
          for (const chunk of OFFLINE_LINES) controller.enqueue(chunk);
        }
      } finally {
        try { reader.releaseLock(); } catch { /* noop */ }
        controller.close();
      }
    },
  });
}

export async function POST(req: Request) {
  const limited = await applyRateLimit(req, chatLimiter);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = (body as { messages?: unknown })?.messages as any[];
  if (!Array.isArray(raw) || raw.length === 0) {
    return new Response("Invalid request", { status: 400 });
  }

  // Sanitize: cap history depth and truncate oversized content (prevents token injection)
  const MAX_CONTENT = 2000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = raw
    .slice(-32) // keep last 16 turns max
    .map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content.slice(0, MAX_CONTENT) : m.content,
    }));

  // Search over last 3 user turns for better context continuity
  const searchContext = messages
    .filter((m: { role: string }) => m.role === "user")
    .slice(-3)
    .map((m: { content: string }) => m.content)
    .join(" ");

  // Find relevant members and inject into the system prompt
  const relevantMembers = searchMembersForContext(searchContext, 8);
  const memberContext = formatMembersForPrompt(relevantMembers);

  // Static appendix (events + news) — TTL-cached at module scope.
  const staticAppendix = getStaticAppendix();

  const provider = getAIProvider();
  if (!provider) {
    // No API key configured at all — short-circuit to offline fallback.
    return createTextStreamResponse({ textStream: offlineFallbackStream() });
  }

  // Three system blocks:
  //   1. CHAMBER_SYSTEM_PROMPT — long, totally static. Anthropic-cached.
  //   2. Static appendix (events + news) — changes every ~5 min. Also
  //      Anthropic-cached so it hits the cache for ~5 min of traffic.
  //   3. memberContext — per-query, NOT cached.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allMessages: any[] = [
    {
      role: "system",
      content: CHAMBER_SYSTEM_PROMPT,
      providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
    },
    ...(staticAppendix
      ? [{
          role: "system",
          content: staticAppendix,
          providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
        }]
      : []),
    ...(memberContext
      ? [{ role: "system", content: `RELEVANT MEMBER BUSINESSES FOR THIS QUERY:\n${memberContext}` }]
      : []),
    ...messages,
  ];

  try {
    const result = streamText({
      model: provider.model,
      messages: allMessages,
      maxOutputTokens: 400,
      temperature: 0.3,
    });
    return createTextStreamResponse({ textStream: safeStream(result.textStream) });
  } catch (err) {
    console.error("[chat] streamText init error:", err);
    return createTextStreamResponse({ textStream: offlineFallbackStream() });
  }
}
