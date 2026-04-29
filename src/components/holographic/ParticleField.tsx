"use client";

import { useEffect, useRef } from "react";

type SceneState = "idle" | "listening" | "thinking" | "responding";

export interface ParticleFieldProps {
  state?: SceneState;
  className?: string;
  /** When true, stops the rAF loop and clears the canvas — same effect as
   *  prefers-reduced-motion, but user-controlled. */
  chill?: boolean;
}

// Brand color triplets for canvas blending
const CAMBRIDGE: [number, number, number] = [131, 188, 169]; // #83BCA9
const COQUELICOT: [number, number, number] = [255, 64, 0];   // #FF4000
const EMERALD: [number, number, number] = [0, 84, 80];        // #005450

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function mixRGB(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function rgba([r, g, b]: [number, number, number], a: number): string {
  return `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  phase: number;
  hueMix: number;
}

/**
 * Volumetric 3D particle field.
 *
 * Replaces the flat 2D connection-line approach with depth-sorted
 * perspective projection. Far particles = muted emerald-teal. Near
 * particles = bright cambridge-white. A coquelicot tint bleeds in for
 * ~25% of particles when the bot is responding. Mouse parallaxes the
 * camera. Motion-blur trail via globalCompositeOperation blending.
 *
 * Purely decorative — pointer-events: none, skipped entirely when the
 * user has prefers-reduced-motion set.
 */
export function ParticleField({ state = "idle", className = "", chill = false }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Decorative — skip entirely when chill mode is on or OS prefers-reduced-motion
    if (
      chill ||
      (typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
    ) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let W = 0, H = 0, DPR = 1;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(DPR, DPR);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // 90 particles — enough for depth, sparse enough to avoid overlap bloom
    const P: Particle[] = Array.from({ length: 90 }, () => ({
      x: (Math.random() - 0.5) * 2.4,
      y: (Math.random() - 0.5) * 2.4,
      z: Math.random(),
      vx: (Math.random() - 0.5) * 0.0008,
      vy: (Math.random() - 0.5) * 0.0008,
      vz: (Math.random() - 0.5) * 0.0005,
      phase: Math.random() * Math.PI * 2,
      hueMix: Math.random(),
    }));

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / r.width - 0.5;
      mouse.ty = (e.clientY - r.top) / r.height - 0.5;
    };
    window.addEventListener("pointermove", onMove);

    // iOS fires orientationchange before the viewport has redrawn — a short
    // delay ensures we read post-rotation dimensions for correct canvas sizing.
    const onOrient = () => setTimeout(resize, 100);
    window.addEventListener("orientationchange", onOrient);

    let t0 = performance.now();

    const render = () => {
      const now = performance.now();
      const dt = Math.min(50, now - t0);
      t0 = now;

      const st = stateRef.current;
      const energy =
        st === "thinking"   ? 1.35 :
        st === "responding" ? 1.15 :
        st === "listening"  ? 1.08 : 0.85;

      // Ease mouse for parallax camera drift
      mouse.x = lerp(mouse.x, mouse.tx, 0.05);
      mouse.y = lerp(mouse.y, mouse.ty, 0.05);

      // Hard clear every frame — no trail, no frame-to-frame accumulation.
      // The suck force was clustering all particles to center; clearRect
      // removes that and any remaining glow buildup.
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      const FOV = 480;
      const camZ = -2.2;

      // Update positions + perspective-project
      const proj: Array<{ p: Particle; sx: number; sy: number; depth: number }> = [];

      for (const p of P) {
        p.phase += 0.01 * energy;

        // Pure drift — no inward suck force that clusters particles at center
        p.x += p.vx * dt * energy;
        p.y += p.vy * dt * energy;
        p.z += p.vz * dt;

        // Torus wrap
        if (p.x >  1.4) p.x = -1.4;
        if (p.x < -1.4) p.x =  1.4;
        if (p.y >  1.4) p.y = -1.4;
        if (p.y < -1.4) p.y =  1.4;
        if (p.z > 1.1) p.z = 0;
        if (p.z < -0.05) p.z = 1;

        const mx = mouse.x * 0.1;
        const my = mouse.y * 0.1;
        const worldZ = p.z - camZ;
        const scale = FOV / (worldZ * FOV * 0.5 + 400);
        const sx = cx + (p.x + mx) * FOV * scale;
        const sy = cy + (p.y + my) * FOV * scale;
        proj.push({ p, sx, sy, depth: 1 - p.z });
      }

      // Connection lines — reduced distance + opacity so they read as
      // constellation lines, not a tangled web
      const connDist = 80;
      for (let i = 0; i < proj.length; i++) {
        const a = proj[i];
        let made = 0;
        for (let j = i + 1; j < proj.length && made < 2; j++) {
          const b = proj[j];
          if (Math.abs(a.p.z - b.p.z) > 0.15) continue;
          const dx = a.sx - b.sx;
          const dy = a.sy - b.sy;
          const d2 = dx * dx + dy * dy;
          if (d2 < connDist * connDist) {
            const d = Math.sqrt(d2);
            const tAlpha = (1 - d / connDist) * 0.16 * a.depth * energy;
            const col = mixRGB(CAMBRIDGE, [200, 235, 225] as [number, number, number], a.p.hueMix * 0.5);
            ctx.strokeStyle = rgba(col, tAlpha);
            ctx.lineWidth = 0.4 * a.depth;
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(b.sx, b.sy);
            ctx.stroke();
            made++;
          }
        }
      }

      // Draw particles back-to-front: far = tiny/dim, near = larger/brighter
      proj.sort((a, b) => a.depth - b.depth);

      for (const { p, sx, sy, depth } of proj) {
        const pulse = 0.5 + 0.5 * Math.sin(p.phase);
        // Much smaller radius than before — max ~3px core, not ~5px
        const baseR = 0.5 + depth * 2.0 + pulse * 0.3 * depth;

        let col: [number, number, number];
        if (st === "responding" && p.hueMix > 0.78) {
          col = mixRGB(COQUELICOT, [255, 200, 180] as [number, number, number], pulse * 0.5);
        } else {
          col = mixRGB(
            mixRGB(EMERALD, CAMBRIDGE, 0.4 + depth * 0.4),
            [220, 245, 235] as [number, number, number],
            depth * 0.5 + pulse * 0.15,
          );
        }

        const alpha = (0.1 + depth * 0.48) * energy;

        // Soft glow — 3× core radius max ~8px, won't overlap neighbours
        const glowR = baseR * 3;
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
        grad.addColorStop(0, rgba(col, alpha * 0.65));
        grad.addColorStop(0.5, rgba(col, alpha * 0.12));
        grad.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Crisp core dot
        ctx.fillStyle = rgba(col, Math.min(0.9, alpha * 1.5));
        ctx.beginPath();
        ctx.arc(sx, sy, baseR, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("orientationchange", onOrient);
    };
  }, [chill]); // chill can toggle at runtime; stateRef handles live scene state

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
