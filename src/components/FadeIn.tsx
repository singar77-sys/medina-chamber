"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  className?: string;
  /** Delay in ms before the animation starts after intersection */
  delay?: number;
  /** Direction to fade from: up (default), down, left, right, none */
  from?: "up" | "down" | "left" | "right" | "none";
}

/**
 * Scroll-triggered fade-in with directional movement.
 * Uses IntersectionObserver — zero JS animation frames.
 *
 * rootMargin "+80px" on the bottom pre-fires the animation 80px before
 * the element enters the viewport, so it is fully opaque by the time
 * the user's eye reaches it. Never translucent at rest.
 */
export function FadeIn({ children, className = "", delay = 0, from = "up" }: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay) {
            setTimeout(() => el.classList.add("is-visible"), delay);
          } else {
            el.classList.add("is-visible");
          }
          observer.unobserve(el);
        }
      },
      // Positive bottom margin pre-triggers 80px before the element
      // enters the viewport — animation completes before the eye lands.
      { threshold: 0.1, rootMargin: "0px 0px 80px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []); // empty — observer created once, never recreated

  const directionClass = {
    up: "fade-in-up",
    down: "fade-in-down",
    left: "fade-in-left",
    right: "fade-in-right",
    none: "fade-in",
  }[from];

  return (
    <div ref={ref} className={`${directionClass} ${className}`}>
      {children}
    </div>
  );
}
