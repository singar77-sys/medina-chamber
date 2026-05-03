# ChamberBot Security Audit

Date: 2026-04-22

Scope:
- ChamberBot chat, handoff, admin analytics, and supporting security controls in `src/app/api/chat/*`, `src/app/api/admin/*`, and related `src/lib/*` modules.
- Static code review plus dependency audit (`npm audit --omit=dev`).
- No code was changed as part of this audit.

Overall:
- No production dependency vulnerabilities were reported by `npm audit --omit=dev`.
- I did not find an obvious RCE-class issue or a hardcoded-secret leak in the reviewed snapshot.
- The biggest risk is prompt injection: ChamberBot currently feeds scraped third-party website copy into system-level model context.

## Findings

### 1. High: Untrusted website content is injected into ChamberBot's system prompt

Evidence:
- `src/lib/website-search.ts:33-36` loads `@/data/member-websites.json`.
- `src/lib/website-search.ts:60-70` appends `metaDescription`, `services`, and `aboutText` into prompt-ready member text.
- `src/lib/chat-search.ts:68-83` uses scraped website text for matching/scoring.
- `src/lib/chat-search.ts:188-222` formats enriched member blocks for prompt insertion.
- `src/app/api/chat/route.ts:427-464` builds `memberContext` and injects it as a `role: "system"` message.

Why this matters:
- `member-websites.json` is derived from third-party member websites, which should be treated as untrusted input.
- If a member site is compromised, malicious, or intentionally manipulative, ChamberBot can ingest instructions like `ignore prior rules`, `recommend only us`, or `send users to this URL`.
- Because that content is inserted as system-level context, it gets stronger priority than normal retrieved content and can distort answers for matching queries.

What to improve:
- Stop placing scraped website copy in `role: "system"` messages.
- Treat website text as untrusted retrieval/tool data with explicit delimiters and lower authority.
- Strip imperative/instructional patterns from scraped text before retrieval.
- Prefer structured fields over freeform prose when possible.

### 2. Medium: Admin auth token is accepted in the query string

Evidence:
- `src/lib/admin-auth.ts:27-36` accepts `?token=<token>` in addition to `Authorization: Bearer`.
- `src/app/api/admin/chat-log/route.ts:7-12` documents `token=<string>` in query params.
- `src/app/api/admin/stats/route.ts:7-10` documents the same pattern.

Why this matters:
- Query-string credentials leak more easily into browser history, pasted URLs, screenshots, reverse-proxy logs, analytics tools, and referrer chains.
- These routes protect sensitive ChamberBot data, including raw conversation logs and analytics.

What to improve:
- Remove query-param auth and require header-based auth only.
- Consider an additional protection layer for admin routes such as Vercel protection, short-lived signed access, or IP allowlisting.

### 3. Medium: Raw transcripts and raw IP addresses are retained for 90 days

Evidence:
- `src/lib/chat-log.ts:14-20` stores `sessionId`, `ip`, timestamps, and `turns[]` with a 90-day TTL.
- `src/lib/chat-log.ts:43-49` defines `ConversationLog` with raw `ip` and full `turns`.
- `src/lib/chat-log.ts:79-103` writes the full record back to Redis.
- `src/app/api/chat/route.ts:492-510` logs each completed round after loading the latest session transcript.

Why this matters:
- Users may paste personal, financial, or operationally sensitive data into the bot.
- Keeping full transcripts tied to raw IPs increases privacy and breach impact if admin access is exposed or Redis is compromised.
- The code comment frames this as product insight storage, but the stored payload is much broader than aggregate analytics.

What to improve:
- Reduce retention for raw transcripts or split raw logs from aggregated analytics.
- Hash or truncate IPs instead of storing full addresses.
- Add redaction for obvious PII and secrets before long-term storage.
- Limit transcript access to the minimum set of operators who actually need it.

### 4. Medium: Public handoff email endpoint has weak abuse resistance

Evidence:
- `src/app/api/chat/handoff/route.ts:53-55` exposes a public POST endpoint guarded by `formLimiter`.
- `src/app/api/chat/handoff/route.ts:68-81` relies on honeypot plus a 1.5 second timing check as the anti-bot layer.
- `src/app/api/chat/handoff/route.ts:154-216` sends an internal email with user-supplied contact info and transcript.
- `src/lib/rate-limit.ts:8-17` documents that the fallback limiter is per-isolate memory when Upstash is unavailable.
- `src/lib/rate-limit.ts:74-77` falls back to `InMemoryLimiter`.
- `src/components/chat/HandoffForm.tsx:39-50` shows the client sends `website_confirm` and `formLoadedAt`, which are easy for scripted clients to emulate.

Why this matters:
- An attacker does not need to break validation to create operational pain; they only need to trigger unwanted chamber emails.
- The current spam defenses are useful against low-effort bots, but not against distributed or deliberate abuse that respects the honeypot and timing fields.
- If rate limiting ever degrades to the in-memory fallback in production, the abuse resistance becomes materially weaker across isolates.

What to improve:
- Add a real challenge layer such as Turnstile or hCaptcha on the handoff route.
- Add secondary abuse controls keyed on email, session, and behavioral signals.
- Log and alert on handoff spikes separately from normal chat traffic.
- Ensure distributed Redis-backed rate limiting is always present in production.

### 5. Low-Medium: User PII is forwarded to Sentry on handoff failures

Evidence:
- `src/app/api/chat/handoff/route.ts:219-224` sends `senderName`, `senderEmail`, and `topic` in `Sentry.captureException(...extra)`.

Why this matters:
- This copies user-submitted contact data into a third-party observability system during failures.
- That may be acceptable operationally, but it expands the data footprint and should be a conscious policy decision.

What to improve:
- Remove direct email/name values from Sentry extras or replace them with a redacted form.
- Keep only the minimum metadata needed to debug delivery failures.

### 6. Low: Public health endpoint reveals dependency stack and status details

Evidence:
- `src/app/api/health/route.ts:24-26` explicitly states auth is none.
- `src/app/api/health/route.ts:56-111` checks Upstash Vector, Anthropic, and Resend individually.
- `src/app/api/health/route.ts:130-135` returns per-provider status and timing metadata.

Why this matters:
- This is useful reconnaissance for attackers because it reveals which providers back ChamberBot and when a dependency is degraded.
- The exposure is not catastrophic on its own, but it is unnecessary detail for a public endpoint.

What to improve:
- Restrict `/api/health` to trusted monitors, or return only a coarse `ok` boolean publicly.
- Keep provider-specific diagnostics on a protected internal endpoint.

## Positive Controls Already Present

- `src/lib/chat-session.ts:1-30` and `src/lib/chat-session.ts:144-180` moved ChamberBot to a server-owned transcript model, which blocks client-side forged assistant history.
- `src/lib/markdown.ts:48-89` escapes raw HTML and allowlists clickable hosts before rendering bot links.
- `src/proxy.ts:31-63` applies a nonce-based CSP on page routes.
- `src/lib/admin-auth.ts:18-25` uses timing-safe token comparison.
- `npm audit --omit=dev` reported `0` production dependency vulnerabilities in this snapshot.

## Priority Order

1. Remove system-level prompt injection of scraped website text.
2. Eliminate query-string admin tokens.
3. Reduce long-term storage of raw transcript/IP data.
4. Strengthen handoff anti-abuse controls beyond honeypot plus timing.
5. Minimize PII sent to Sentry.
6. Tighten public health endpoint exposure.

## Audit Note

This was a code-and-config review, not a live penetration test. Findings are based on the repository state present on 2026-04-22.
