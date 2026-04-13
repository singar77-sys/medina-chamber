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
 * The element starts invisible and translates in when it enters the viewport.
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
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

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
