// Sentry Node.js runtime config.
//
// Loaded by instrumentation.ts when NEXT_RUNTIME === "nodejs".
// Used by /api/search (which is now edge), /api/contact, /api/apply,
// and any future Node API routes.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  includeLocalVariables: true,
  enableLogs: true,
});
