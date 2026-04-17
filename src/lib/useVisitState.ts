"use client";

import { useEffect, useState } from "react";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export interface VisitState {
  /** Total times this device has loaded the site. 0 during SSR/first paint. */
  visitCount: number;
  /** True on visits 2+. Stable once the effect has run. */
  isReturning: boolean;
  /** Local clock hour (0–23). Null during SSR. */
  hour: number | null;
  /** Coarse bucket for messaging. Null during SSR. */
  timeOfDay: TimeOfDay | null;
  /** Local day-of-week, 0 (Sun) – 6 (Sat). Null during SSR. */
  day: number | null;
  /** Tracks whether the effect has completed — lets components avoid a
   *  hydration flash by rendering a neutral state until this is true. */
  ready: boolean;
}

const STORAGE_KEY = "mcc_visits";
const LAST_SEEN_KEY = "mcc_last_seen";

function bucket(hour: number): TimeOfDay {
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

/**
 * Tracks visit count + current time to support state-driven
 * personalization ("living homepage"). Persists via localStorage; SSR
 * returns a neutral state so there's no hydration mismatch.
 */
export function useVisitState(): VisitState {
  const [state, setState] = useState<VisitState>({
    visitCount: 0,
    isReturning: false,
    hour: null,
    timeOfDay: null,
    day: null,
    ready: false,
  });

  useEffect(() => {
    try {
      const prev = Number(window.localStorage.getItem(STORAGE_KEY) ?? "0") || 0;

      // Debounce double-counting during SPA navigation: only increment
      // once per 30-minute session on this device.
      const lastSeenRaw = window.localStorage.getItem(LAST_SEEN_KEY);
      const now = Date.now();
      const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : 0;
      const SESSION_WINDOW = 30 * 60 * 1000; // 30 min
      const shouldIncrement = !lastSeen || now - lastSeen > SESSION_WINDOW;

      const next = shouldIncrement ? prev + 1 : Math.max(prev, 1);

      if (shouldIncrement) {
        window.localStorage.setItem(STORAGE_KEY, String(next));
        window.localStorage.setItem(LAST_SEEN_KEY, String(now));
      }

      const d = new Date();
      const hour = d.getHours();

      setState({
        visitCount: next,
        isReturning: next > 1,
        hour,
        timeOfDay: bucket(hour),
        day: d.getDay(),
        ready: true,
      });
    } catch {
      // localStorage blocked (private mode, etc.) — still surface time
      const d = new Date();
      const hour = d.getHours();
      setState({
        visitCount: 1,
        isReturning: false,
        hour,
        timeOfDay: bucket(hour),
        day: d.getDay(),
        ready: true,
      });
    }
  }, []);

  return state;
}
