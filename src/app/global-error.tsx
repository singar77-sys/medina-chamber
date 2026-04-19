// Top-level React error boundary. Catches anything that escaped
// route-level boundaries and reports it to Sentry before falling back
// to Next's default error UI. Required by the App Router so client-side
// crashes don't get swallowed silently.

"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
