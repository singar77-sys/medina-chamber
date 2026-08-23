// Sentry browser/client runtime config.
//
// Loaded by Next.js automatically on the client. Captures unhandled
// exceptions and sampled traces.
//
// Session Replay is intentionally omitted: this is a marketing/SEO site,
// PostHog session recording is already disabled for privacy, and the rrweb
// recorder would otherwise ship ~556KB into every page's initial JS bundle.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Data minimization — see sentry.server.config.ts for the rationale.
  sendDefaultPii: false,
  // Trace 100% in dev so we see everything; 10% in prod to stay under
  // free-tier quota at chamber-traffic scale.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  enableLogs: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
