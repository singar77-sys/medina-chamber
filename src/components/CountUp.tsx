"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  end: number;
  /** Duration in ms (default 2000) */
  duration?: number;
  /** Suffix appended to the number (e.g., "+") */
  suffix?: string;
  /** Prefix before the number (e.g., "$") */
  prefix?: string;
  className?: string;
}

/**
 * Animated number counter that triggers once when scrolled into view.
 * Uses a ref (not state) for the fired flag so the IntersectionObserver
 * is created exactly once — no re-observation on state changes.
 *
 * The FINAL value is rendered server-side (count seeds to `end`), so
 * crawlers and view-source see the real number and there's no layout
 * shift. When the element scrolls into view the animation resets to 0
 * and counts up to `end` — a purely visual flourish that never changes
 * the accessible content for no-JS / crawler contexts.
 */
export function CountUp({
  end,
  duration = 2000,
  suffix = "",
  prefix = "",
  className = "",
}: CountUpProps) {
  // Seed to `end` so SSR markup shows the final number, not 0.
  const [count, setCount] = useState(end);
  const [hasStarted, setHasStarted] = useState(false);
  const hasAnimated = useRef(false); // ref flag — never causes effect re-run
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          // Respect reduced-motion: leave the number at its seeded final
          // value (`end`) instead of resetting to 0 and ramping up.
          const reduced = window.matchMedia?.(
            "(prefers-reduced-motion: reduce)",
          ).matches;
          if (!reduced) setHasStarted(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []); // empty — observer created once, fires once

  useEffect(() => {
    if (!hasStarted) return;

    let start: number | null = null;
    let raf: number;

    function step(timestamp: number) {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));

      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [hasStarted, end, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{hasStarted ? count : end}{suffix}
    </span>
  );
}
