"use client";

// Root route-segment error boundary. Catches a render/data throw on any page
// below the root layout, so the header/footer shell survives and the visitor
// gets a branded recovery screen instead of global-error's bare fallback.
// Mirrors not-found.tsx: oxford background, cambridge eyebrow, accent headline.

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <section className="bg-oxford border-b border-white/10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pt-f144 pb-f89">
        <div className="max-w-3xl">
          <p className="text-overline text-cambridge mb-f8">Something broke</p>
          <h1 className="text-display text-white">
            <span className="block">That didn&apos;t</span>
            <span className="block text-accent">load.</span>
          </h1>
          <p className="text-body-lg text-white/70 mt-f13 max-w-2xl leading-relaxed">
            A temporary hiccup on our end — it&apos;s been reported. Try the
            page again, or head somewhere that&apos;s working:
          </p>

          <div className="mt-f34 flex flex-wrap items-center gap-f13">
            <button
              onClick={reset}
              className="
                inline-flex items-center px-8 py-4
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body
                rounded-[var(--radius-md)]
                transition cursor-pointer
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cambridge focus-visible:ring-offset-2 focus-visible:ring-offset-oxford
              "
            >
              Try Again
            </button>
            <Link
              href="/"
              className="text-body text-white/70 hover:text-cambridge transition-colors"
            >
              ← Back to the homepage
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
