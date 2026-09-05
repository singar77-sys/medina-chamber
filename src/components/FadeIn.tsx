"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  className?: string;
  /** Delay in ms before the animation starts after intersection */
  delay?: number;
  /** Direction to fade from: up (default), down, left, right, none */
  from?: "up" | "down" | "left" | "right" | "none";
  /** Travel distance in px for the slide (default 28). Larger = a more
      pronounced slide-in; use for hero bands and feature CTAs. */
  distance?: number;
}

/**
 * Scroll-triggered fade-in with directional movement.
 * Uses IntersectionObserver — zero JS animation frames.
 *
 * rootMargin "+80px" on the bottom pre-fires the animation 80px before
 * the element enters the viewport, so it is fully opaque by the time
 * the user's eye reaches it. Never translucent at rest.
 *
 * delay is stored in a ref so the IntersectionObserver effect can have
 * empty deps (created once) without a stale closure on delay.
 *
 * NO-JS FALLBACK: the hidden state lives entirely in CSS, so with scripting
 * disabled none of this runs and every FadeIn on the page would sit at
 * opacity 0 forever — the whole site below the hero, invisible. globals.css
 * carries an `@media (scripting: none)` block that restores the visible,
 * untransformed state. It is the only signal available to CSS alone: a
 * `js-enabled` root class would need an inline script in layout.tsx, and
 * defaulting to visible and hiding after hydration would flash content on
 * every load.
 */
export function FadeIn({ children, className = "", delay = 0, from = "up", distance }: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const delayRef = useRef(delay);
  // Keep ref current on every render (sync, not in an effect)
  delayRef.current = delay;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const d = delayRef.current;
          if (d) {
            setTimeout(() => el.classList.add("is-visible"), d);
          } else {
            el.classList.add("is-visible");
          }
          observer.unobserve(el);
        }
      },
      // threshold 0 (any pixel), never a percentage: a 0.1 threshold can
      // NEVER be satisfied by an element taller than 10x the viewport, which
      // is how a ~20,000px blog grid stayed permanently invisible in prod.
      // Positive bottom margin pre-triggers 80px before the element enters
      // the viewport — animation completes before the eye lands.
      { threshold: 0, rootMargin: "0px 0px 80px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []); // empty — delay read from ref at fire time, observer created once

  const directionClass = {
    up: "fade-in-up",
    down: "fade-in-down",
    left: "fade-in-left",
    right: "fade-in-right",
    none: "fade-in",
  }[from];

  const style =
    distance != null
      ? ({ "--fade-distance": `${distance}px` } as CSSProperties)
      : undefined;

  return (
    <div ref={ref} className={`${directionClass} ${className}`} style={style}>
      {children}
    </div>
  );
}
