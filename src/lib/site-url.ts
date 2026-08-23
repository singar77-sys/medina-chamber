/**
 * Canonical site origin for building payment redirect and magic-link URLs.
 *
 * A request's Host / origin is attacker-controllable (Host-header injection): if
 * we blindly used `new URL(req.url).origin` to build a Stripe success_url or a
 * portal magic link, a spoofed Host could redirect a real member — or their
 * one-time login link — to an attacker's domain. So:
 *
 *   • Production — REQUIRE NEXT_PUBLIC_SITE_URL (fail closed if unset). A
 *     request-derived origin is used ONLY if its hostname exactly matches the
 *     allowlist (the canonical hostnames + THIS deployment's own Vercel URLs);
 *     otherwise the canonical URL wins. A spoofed Host can never influence the
 *     result.
 *
 *   • Development — fall back to the request origin freely (localhost:3000,
 *     LAN IPs, etc.) so local runs need zero config.
 *
 * Mirrors the NEXT_PUBLIC_SITE_URL fallback that join/checkout/portal already
 * used, but hardens the request-origin branch instead of trusting it outright.
 */

const CANONICAL_FALLBACK = "https://medinaohchamber.com";

/**
 * Exact hostnames we trust for request-derived origins. No suffix/wildcard
 * matching: business.medinachamber.com is externally hosted (GrowthZone) and
 * must never pass this trust boundary, and a ".vercel.app" suffix rule would
 * trust every Vercel customer's deployment, not just ours. This deployment's
 * own preview/production hostnames are matched exactly via the Vercel-provided
 * env vars below instead.
 */
const ALLOWED_HOSTS = new Set([
  "medinaohchamber.com",
  "www.medinaohchamber.com",
  "medinachamber.com",
  "www.medinachamber.com",
]);

/** This deployment's own hostnames, injected by Vercel (no protocol prefix). */
function deploymentHosts(): string[] {
  return [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
    .filter((h): h is string => !!h)
    .map((h) => h.toLowerCase());
}

export function isAllowedOrigin(origin: string): boolean {
  let host: string;
  let protocol: string;
  try {
    const u = new URL(origin);
    host = u.hostname.toLowerCase();
    protocol = u.protocol;
  } catch {
    return false;
  }
  if (protocol !== "https:") return false;
  return ALLOWED_HOSTS.has(host) || deploymentHosts().includes(host);
}

/**
 * Resolve the base origin (scheme + host, no trailing slash) for building
 * outbound URLs. Pass the incoming request so dev can fall back to its origin.
 *
 * Production: throws if NEXT_PUBLIC_SITE_URL is unset (fail closed) — a
 * misconfigured deploy must not silently build links off a spoofable Host.
 */
export function getSiteOrigin(req?: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;

  if (process.env.NODE_ENV === "production") {
    if (!configured) {
      throw new Error("NEXT_PUBLIC_SITE_URL is required in production");
    }
    const canonical = stripTrailingSlash(configured);
    // Only honor a request-derived origin when it's explicitly allowlisted;
    // otherwise a spoofed Host is ignored and the canonical URL is used.
    if (req) {
      try {
        const reqOrigin = new URL(req.url).origin;
        if (reqOrigin !== canonical && isAllowedOrigin(reqOrigin)) return reqOrigin;
      } catch {
        // Unparseable request URL → fall through to canonical.
      }
    }
    return canonical;
  }

  // Development / test: configured value if present, else the request origin,
  // else the canonical fallback.
  if (configured) return stripTrailingSlash(configured);
  if (req) {
    try {
      return new URL(req.url).origin;
    } catch {
      // fall through
    }
  }
  return CANONICAL_FALLBACK;
}

function stripTrailingSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}
