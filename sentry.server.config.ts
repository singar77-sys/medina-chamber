// Sentry Node.js runtime config.
//
// Loaded by instrumentation.ts when NEXT_RUNTIME === "nodejs".
// Used by /api/search (which is now edge), /api/contact, /api/apply,
// and any future Node API routes.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Data minimization: no default PII (IPs, cookies, user headers) and no
  // stack-frame locals — Node routes handle contact-form bodies, member
  // emails, and payment metadata, and `includeLocalVariables` would ship
  // whatever was in scope when an error threw. Route/error-class/request-id
  // context is enough to debug with.
  sendDefaultPii: false,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  includeLocalVariables: false,
  enableLogs: true,
  // Belt-and-braces: strip credential-bearing request fields even if a
  // future integration re-attaches them.
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.data;
      if (event.request.headers) {
        delete event.request.headers["cookie"];
        delete event.request.headers["authorization"];
      }
    }
    return event;
  },
});
