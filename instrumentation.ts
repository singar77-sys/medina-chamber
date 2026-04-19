// Server-side Sentry registration. Next.js calls register() once per
// runtime startup; we lazy-load the right Sentry config (node vs edge)
// based on the NEXT_RUNTIME env var Next sets for us.

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
