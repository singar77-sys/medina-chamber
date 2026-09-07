"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Live `matchMedia` result.
 *
 * Read as an external store (subscribe + getSnapshot) rather than the older
 * "useState(false) plus a mount effect that setStates the real value" shape.
 * Same rendered result, but it costs one render instead of two and does not
 * call setState synchronously from an effect body, which cascades renders
 * (react-hooks/set-state-in-effect).
 *
 * `getServerSnapshot` returns false so the server render and the hydration
 * pass agree; the real value takes over immediately after hydration.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** `prefers-reduced-motion: reduce` — the WCAG 2.3.3 opt-out. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
