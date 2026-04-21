"use client";

import {
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

/**
 * Modern 3D-tilt card wrapper. Applies two effects on hover:
 *
 *   1. perspective + rotateX/rotateY — cursor-driven tilt, up to ±8°
 *   2. cursor-following radial spotlight (cambridge) fades in on enter
 *
 * The spotlight overlay is pointer-events: none so whatever card-like
 * child sits inside (typically a Next.js Link) keeps its click target.
 *
 * Respects prefers-reduced-motion: tilt is disabled for those users;
 * the spotlight glow is kept because it's a non-motion affordance.
 */
export function TiltCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;   // 0..1
    const y = (e.clientY - rect.top) / rect.height;   // 0..1
    el.style.setProperty("--tilt-rx", `${(0.5 - y) * 6}deg`);
    el.style.setProperty("--tilt-ry", `${(x - 0.5) * 8}deg`);
    el.style.setProperty("--tilt-cx", `${x * 100}%`);
    el.style.setProperty("--tilt-cy", `${y * 100}%`);
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-rx", "0deg");
    el.style.setProperty("--tilt-ry", "0deg");
  };

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`.trim()}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={
        {
          "--tilt-rx": "0deg",
          "--tilt-ry": "0deg",
          "--tilt-cx": "50%",
          "--tilt-cy": "50%",
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
