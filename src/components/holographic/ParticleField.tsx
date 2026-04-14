"use client";

import { useEffect, useRef } from "react";

interface ParticleFieldProps {
  /** Number of particles. Default 60. */
  count?: number;
  /** Scene state — controls speed and intensity. */
  intensity?: "idle" | "listening" | "thinking" | "responding";
  /** Cambridge teal by default, Coquelicot when responding, etc. */
  color?: string;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  phase: number;
}

/**
 * Canvas-based particle field for the Holographic Chamber scene.
 * Particles drift gently, repel slightly from mouse, connect with
 * thin lines when within proximity, and adapt speed/glow based on
 * the chat state intensity.
 */
export function ParticleField({
  count = 60,
  intensity = "idle",
  color = "#83BCA9",
  className = "",
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number | null>(null);
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctxOrNull = canvasEl.getContext("2d");
    if (!ctxOrNull) return;

    // Capture non-null references for closures
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxOrNull;

    // Respect reduced motion — render a static field
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Parse color to RGB once
    const rgb = hexToRgb(color);

    let width = 0;
    let height = 0;
    let dpr = 1;

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
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.6 + 0.6,
        baseAlpha: Math.random() * 0.5 + 0.25,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    resize();
    seed();

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };
    const onMouseLeave = () => {
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    const resizeObserver = new ResizeObserver(() => {
      resize();
      seed();
    });
    resizeObserver.observe(canvas);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const speedMultiplier = {
        idle: 1,
        listening: 1.4,
        thinking: 2.2,
        responding: 1.8,
      }[intensityRef.current];

      const glowMultiplier = {
        idle: 1,
        listening: 1.3,
        thinking: 1.8,
        responding: 1.5,
      }[intensityRef.current];

      const particles = particlesRef.current;

      // Update
      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.x += p.vx * speedMultiplier;
          p.y += p.vy * speedMultiplier;
          p.phase += 0.02;

          // Mouse repulsion
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 14400) {
            // within 120px
            const dist = Math.sqrt(distSq) || 1;
            const force = ((120 - dist) / 120) * 0.4;
            p.vx += (dx / dist) * force * 0.05;
            p.vy += (dy / dist) * force * 0.05;
          }

          // Gentle drag
          p.vx *= 0.985;
          p.vy *= 0.985;

          // Wrap around edges
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
        }
      }

      // Draw connection lines (only between nearby particles)
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 10000) {
            // within 100px
            const alpha = (1 - Math.sqrt(distSq) / 100) * 0.15 * glowMultiplier;
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        const pulse = (Math.sin(p.phase) + 1) / 2;
        const alpha = p.baseAlpha * (0.6 + pulse * 0.4) * glowMultiplier;
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        rafRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      resizeObserver.disconnect();
    };
  }, [count, color]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-auto ${className}`}
      aria-hidden="true"
    />
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace("#", "").match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return { r: 131, g: 188, b: 169 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}
