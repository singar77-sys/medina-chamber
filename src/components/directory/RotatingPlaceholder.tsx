"use client";

import { useEffect, useState } from "react";

/**
 * Rotates through example placeholder strings on a timer.
 *
 * Use it as the `placeholder` attribute for an <input>. Pauses rotation when
 * the input is focused (handled by the parent — pass `paused`).
 *
 * Designed for the directory search hero: teaches users that the field
 * accepts natural-language queries by showing real example searches.
 */
interface RotatingPlaceholderProps {
  /** Example prompts to cycle through. Cycles in order, loops on overflow. */
  prompts: readonly string[];
  /** Milliseconds between rotations. Default 4000. */
  intervalMs?: number;
  /** Pause rotation (e.g., while input is focused). */
  paused?: boolean;
  /** Render hook — receives the current prompt. */
  children: (current: string) => React.ReactNode;
}

export function RotatingPlaceholder({
  prompts,
  intervalMs = 4000,
  paused = false,
  children,
}: RotatingPlaceholderProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (paused || prompts.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % prompts.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [paused, prompts.length, intervalMs]);

  const current = prompts[index] ?? "";
  return <>{children(current)}</>;
}
