# Upstash Redis — production rate limiting

**Status: ACTION REQUIRED (ops).** As of this writing the site ships to production
**without** Upstash Redis configured, so every rate limiter falls back to a
**per-isolate in-memory counter**. Each Vercel function isolate keeps its own
counts, so an attacker who fans requests across cold isolates gets a fresh budget
on each one and can beat the limit. The code already prefers the distributed
Upstash limiter the moment the two env vars below are present — this is purely an
env/provisioning task, no code change.

## Why it matters

`src/lib/rate-limit.ts` builds every limiter with a two-tier strategy
(`makeLimiter`):

1. **Preferred — Upstash Redis sliding window.** Activated when **both**
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set. All isolates
   share one set of counters, so the limit is global and can't be out-run by
   spreading load across isolates.
2. **Fallback — in-memory per-isolate counter.** What runs today. Better than the
   old fall-open ("no limiting") behavior, but per-isolate.

The most exposed endpoint is `POST /api/join` (`joinLimiter`, 3 req/min/IP): an
unauthenticated write that inserts 4 rows and opens a Stripe Checkout session
before any payment. Until Upstash is wired up, that limit is only enforced
per-isolate. (`chatLimiter`, `formLimiter`, `searchLimiter`, the portal
`limit*` guards, and `eventRegister` get the same upgrade for free.)

> The abandoned-join expiry sweep (`/api/cron/join-sweep`) clears the rows a
> flood would leave behind, but it runs daily — distributed rate limiting is the
> front-line control. The two are complementary.

## Provisioning

Upstash Vector is already used for semantic search, so an Upstash account likely
exists — Redis is a **separate** database you still need to create.

1. **Create the database** — either route works:
   - **Vercel Marketplace** (recommended): Vercel dashboard → project →
     *Storage* → *Marketplace Database Providers* → **Upstash** → *Redis*. The
     integration injects `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
     into the linked environments automatically.
   - **Upstash console** (manual): console.upstash.com → *Create Database*
     (Global, low-latency region) → copy the **REST** URL + token from the
     "REST API" panel.
2. **Set the env vars** (only if you created it manually). Vercel dashboard →
   project → *Settings* → *Environment Variables*, scope = **Production**
   (add Preview too if you want preview deploys limited):
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

   Use the **REST** credentials, not the `redis://` connection string — the
   `@upstash/redis` client (`src/lib/upstash.ts`) speaks REST.
3. **Redeploy** so the new env vars are baked into the runtime. `getRedis()`
   reads them at first use; existing isolates won't pick them up without a new
   deployment.

## Verify

After the redeploy, confirm the distributed limiter is live:

- **Functional check** — from one machine, send the join form (or any limited
  endpoint) faster than its limit and confirm a `429` appears at the expected
  count and **stays** consistent across repeated bursts. With the in-memory
  fallback the threshold drifts as you hit different isolates; with Upstash it's
  stable.
- **Upstash console** — the database's *Data Browser* / metrics should show keys
  with the limiter prefixes (`rl:join`, `rl:form`, `rl:chat`, …) appearing as
  traffic arrives.
- **Env check** — `vercel env ls` (or the dashboard) lists both
  `UPSTASH_REDIS_REST_*` vars under Production.

No code change is needed once the vars are present; `makeLimiter` switches to
Upstash automatically.
