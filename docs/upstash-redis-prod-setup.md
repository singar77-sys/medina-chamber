# Upstash Redis — rate limiting

**Status: ✅ Configured in all Vercel environments (verified 2026-06-19).**

`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are present in
**Production, Preview, and Development** (separate per-environment entries, each
set ~61 days ago; confirmed with `vercel env ls`). So rate limiting uses the
distributed Upstash sliding-window limiter in every deployed environment — not
the per-isolate in-memory fallback. Every limiter in `src/lib/rate-limit.ts`,
including the `joinLimiter` added in the join-flow hardening, is global across
isolates.

> Supersedes two earlier mistakes: (1) a since-fixed `rate-limit.ts` comment
> claiming prod shipped without Upstash, and (2) a reading that the vars were
> Production-only. `vercel env ls production` shows only the production-scoped
> entry — `vercel env ls` (unfiltered) shows all three environments.

## How the code uses these vars

`src/lib/rate-limit.ts` builds every limiter with a two-tier strategy
(`makeLimiter`):

1. **Preferred — Upstash Redis sliding window.** Active when **both**
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
   (`getRedis()` in `src/lib/upstash.ts`). All isolates share one set of
   counters, so the limit is global and can't be out-run by spreading load
   across cold isolates.
2. **Fallback — in-memory per-isolate counter.** Now only reached by a **local**
   process started without the Upstash vars loaded (e.g. a bare `next dev` or
   `vitest` with no `.env.local` entry and no `vercel env pull`). Run
   `vercel env pull` to give local dev the same distributed limiter.

The vars use the **REST** credentials, not a `redis://` connection string — the
`@upstash/redis` client speaks REST.

## Verify

- **Env keys** — `vercel env ls` lists `UPSTASH_REDIS_REST_URL` +
  `UPSTASH_REDIS_REST_TOKEN` for Production, Preview, and Development.
- **Functional** — send a limited endpoint (e.g. the join form) faster than its
  limit from one client and confirm the `429` threshold is stable across bursts.
  With the in-memory fallback the threshold drifts as you hit different isolates;
  with Upstash it's consistent.
- **Upstash console** — the database's metrics / data browser show keys with the
  limiter prefixes (`rl:join`, `rl:form`, `rl:chat`, …) as traffic arrives.

No code change is needed; `makeLimiter` switches to Upstash automatically
whenever the two vars are present.
