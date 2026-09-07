"use client";

import { useSyncExternalStore } from "react";

/** The hydration state never changes again once it flips; nothing to subscribe to. */
function subscribeNever(): () => void {
  return () => {};
}

/**
 * False during the server render and the hydration pass, true afterwards.
 *
 * The `useState(false)` + `useEffect(() => setMounted(true), [])` idiom does the
 * same job, but it calls setState synchronously from an effect body — a
 * cascading second render that React's compiler lint flags
 * (react-hooks/set-state-in-effect). useSyncExternalStore expresses the same
 * "server says one thing, client says another" split as a store read.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}
