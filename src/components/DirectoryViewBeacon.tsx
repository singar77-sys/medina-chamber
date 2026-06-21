"use client";

import { useEffect, useRef } from "react";

/**
 * Fires a single directory_view beacon on mount. Client-only, so bots and Next
 * link-prefetches (no JS execution) don't count. Uses sendBeacon (survives the
 * page being navigated away) with a keepalive fetch fallback. Renders nothing.
 */
export function DirectoryViewBeacon({ slug }: { slug: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current || !slug) return;
    sent.current = true;
    const body = JSON.stringify({ slug });
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/track/directory-view", new Blob([body], { type: "application/json" }));
      } else {
        void fetch("/api/track/directory-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      }
    } catch {
      // best-effort analytics — never throws
    }
  }, [slug]);
  return null;
}
