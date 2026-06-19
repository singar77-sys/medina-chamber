# Upstash Redis — production rate limiting

**Status: ✅ Configured in Production (verified 2026-06-19).**

`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are both present in the
Vercel **Production** environment (set ~61 days ago; confirmed with
`vercel env ls production`). So production rate limiting already uses the
distributed Upstash sliding-window limiter, **not** the per-isolate in-memory
fallback — every limiter in `src/lib/rate-limit.ts`, including the `joinLimiter`
added in the join-flow hardening, is global across isolates in prod.

> This corrects an earlier assumption (and a since-fixed comment in
> `rate-limit.ts`) that prod shipped without Upstash. It does not.

## How the code uses these vars

`src/lib/rate-limit.ts` builds every limiter with a two-tier strategy
(`makeLimiter`):

1. **Preferred — Upstash Redis sliding window.** Active when **both**
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
   (`getRedis()` in `src/lib/upstash.ts`). All isolates share one set of
   counters, so the limit is global and can't be out-run by spreading load
   across cold isolates.
2. **Fallback — in-memory per-isolate counter.** Used only when those vars are
   absent (local dev, and any environment without them — see below).

The vars use the **REST** credentials, not a `redis://` connection string — the
`@upstash/redis` client speaks REST.

## Remaining (optional) gap: Preview / Development

The two vars are scoped to **Production only**. Preview and Development
deployments therefore fall back to the per-isolate in-memory limiter. That is
low-risk — Preview/Dev aren't the public attack surface — but if you want
parity, add them to those environments:

```bash
# pull the existing Production value, then add it to Preview + Development
vercel env add UPSTASH_REDIS_REST_URL preview
vercel env add UPSTASH_REDIS_REST_URL development
vercel env add UPSTASH_REDIS_REST_TOKEN preview
vercel env add UPSTASH_REDIS_REST_TOKEN development
```

(Reuse the same database, or point Preview/Dev at a separate Upstash database
to keep their rate-limit counters isolated from prod.)

## Verify

- **Env keys** — `vercel env ls production` lists both `UPSTASH_REDIS_REST_*`
  under Production.
- **Functional** — send a limited endpoint (e.g. the join form) faster than its
  limit from one client and confirm the `429` threshold is stable across bursts.
  With the in-memory fallback the threshold drifts as you hit different isolates;
  with Upstash it's consistent.
- **Upstash console** — the database's metrics / data browser show keys with the
  limiter prefixes (`rl:join`, `rl:form`, `rl:chat`, …) as traffic arrives.

No code change is needed for any of this; `makeLimiter` switches to Upstash
automatically whenever the two vars are present.
