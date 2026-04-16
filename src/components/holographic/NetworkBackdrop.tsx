"use client";

import { useEffect, useRef } from "react";

interface NetworkBackdropProps {
  className?: string;
  /** Particle count. Default 36 — subtle background density. */
  count?: number;
  /** Line connection max distance in px. Default 140. */
  connectDistance?: number;
  /** Base color as hex. Default cambridge teal (#83BCA9). */
  color?: string;
  /** Max opacity of lines + particles. Default 0.45. */
  maxOpacity?: number;
}

/**
 * Ambient "neural network" / connected pathways Canvas backdrop.
 *
 * Purpose-built for decorative section backgrounds — renders a sparse
 * particle field with connection lines between nearby nodes, all
 * drifting gently. No mouse interaction (pointer-events: none so
 * clicks pass through to form inputs / buttons layered above).
 *
 * Theme-adaptable via the color prop — cambridge teal reads softly on
 * both bg-bg-secondary light (#F7F8FA) and dark (#101D35).
 *
 * Respects prefers-reduced-motion (renders a static snapshot).
 */
export function NetworkBackdrop({
  className = "",
  count = 36,
  connectDistance = 140,
  color = "#83BCA9",
  maxOpacity = 0.45,
}: NetworkBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctxOrNull = canvasEl.getContext("2d");
    if (!ctxOrNull) return;

    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxOrNull;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Parse color to RGB once
    const rgb = hexToRgb(color);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseAlpha: number;
      phase: number;
    }

    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    const seed = () => {
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        radius: Math.random() * 1.4 + 0.5,
        baseAlpha: Math.random() * 0.5 + 0.3,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    resize();
    seed();

    const ro = new ResizeObserver(() => {
      resize();
      seed();
    });
    ro.observe(canvas);

    const connectDistSq = connectDistance * connectDistance;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Advance particles
      if (!prefersReducedMotion) {
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.phase += 0.01;

          // Wrap around edges so the field is continuous
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
        }
      }

      // Connection lines
      ctx.lineWidth = 0.6;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < connectDistSq) {
            const dist = Math.sqrt(distSq);
            const t = 1 - dist / connectDistance;
            const alpha = t * t * maxOpacity * 0.55;
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Particles
      for (const p of particles) {
        const pulse = (Math.sin(p.phase) + 1) / 2;
        const alpha = p.baseAlpha * (0.5 + pulse * 0.5) * maxOpacity;
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        raf = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [count, connectDistance, color, maxOpacity]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex
    .replace("#", "")
    .match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return { r: 131, g: 188, b: 169 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}
