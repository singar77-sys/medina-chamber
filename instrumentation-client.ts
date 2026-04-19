// Sentry browser/client runtime config.
//
// Loaded by Next.js automatically on the client. Captures unhandled
// exceptions, recorded sessions on errors, and sampled traces.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: true,
  // Trace 100% in dev so we see everything; 10% in prod to stay under
  // free-tier quota at chamber-traffic scale.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  // Replay every 10th session; replay 100% of sessions that errored.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
  integrations: [Sentry.replayIntegration()],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
