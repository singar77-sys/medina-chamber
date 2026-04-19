// Sentry Edge runtime config.
//
// Loaded by instrumentation.ts when NEXT_RUNTIME === "edge".
// Used by /api/chat and /api/search (both edge runtime).
// `includeLocalVariables` isn't supported on edge — omit it.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  enableLogs: true,
});
