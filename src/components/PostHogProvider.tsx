"use client";

/**
 * PostHog client-side analytics provider.
 *
 * Wraps the app in PHProvider so any component can call usePostHog().
 * Pageviews are NOT captured here — Vercel Analytics already handles them.
 * PostHog is additive: product events (portal opens, mode selections,
 * member card clicks) and session replay only.
 *
 * Required env var (prefix NEXT_PUBLIC_ so it's available client-side):
 *   NEXT_PUBLIC_POSTHOG_KEY   — phc_…
 *   NEXT_PUBLIC_POSTHOG_HOST  — optional; defaults to https://us.i.posthog.com
 */

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return; // graceful no-op when key is absent (local dev, staging)

    posthog.init(key, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      // Vercel Analytics owns pageview tracking — no duplication needed.
      capture_pageview: false,
      capture_pageleave: true,
      // Respect DNT and the user's privacy settings.
      respect_dnt: true,
      persistence: "localStorage",
      // Session recording disabled — not disclosed in privacy policy.
      disable_session_recording: true,
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
