"use client";

import { useRef, useEffect } from "react";

interface MouseGradientProps {
  children: React.ReactNode;
  className?: string;
  /** Gradient color — use a semi-transparent value. Default: cambridge at 12% */
  color?: string;
  /** Radius of the gradient spotlight in pixels. Default: 400 */
  radius?: number;
}

/**
 * Wraps children in a container with a subtle radial gradient that
 * follows the mouse cursor. The gradient is layered OVER the existing
 * background via a pseudo-element–style approach using a div overlay.
 *
 * Inspired by joinhandshake.com's hero gradient effect.
 * Uses direct style mutation (no React re-renders) for 60fps tracking.
 * Respects prefers-reduced-motion.
 */
export function MouseGradient({
  children,
  className = "",
  color = "rgba(131, 188, 169, 0.12)",
  radius = 450,
}: MouseGradientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const glow = glowRef.current;
    if (!container || !glow) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      glow.style.opacity = "0";
      return;
    }

    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    let raf = 0;
    let isInside = false;

    const animate = () => {
      // Smooth easing toward target
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      glow.style.background = `radial-gradient(${radius}px circle at ${currentX.toFixed(1)}px ${currentY.toFixed(1)}px, ${color}, transparent)`;
      // Settled — stop looping; onMove restarts when the target changes.
      if (Math.abs(targetX - currentX) < 0.1 && Math.abs(targetY - currentY) < 0.1) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(animate);
    };

    const ensureRunning = () => {
      if (raf === 0) raf = requestAnimationFrame(animate);
    };

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
      if (!isInside) {
        isInside = true;
        currentX = targetX;
        currentY = targetY;
        glow.style.opacity = "1";
      }
      ensureRunning();
    };

    const onLeave = () => {
      isInside = false;
      glow.style.opacity = "0";
    };

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(animate);

    return () => {
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [color, radius]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        ref={glowRef}
        className="absolute inset-0 pointer-events-none transition-opacity duration-500 ease-out"
        style={{ opacity: 0 }}
        aria-hidden="true"
      />
      {/* Content renders on top of the glow */}
      <div className="relative">{children}</div>
    </div>
  );
}
