"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";

/**
 * ThreePillars — the "Why Members Join" section on the homepage.
 *
 * Heaviest visual moment on the page after the hero. Three cards with:
 *
 *   1. Per-card reactive SVG graphic (gauge / network / chart)
 *   2. 3D cursor tilt (perspective + rotateX/Y toward cursor)
 *   3. Cursor-tracked spotlight glow inside each card
 *   4. Section-wide shared cursor awareness (--tp-sx / --tp-sy
 *      CSS custom props published on the grid root, so all three
 *      graphics can breathe together even when not individually
 *      hovered)
 *
 * All animation is driven through CSS custom properties written by
 * rAF-throttled event handlers — no React re-renders, no layout
 * thrash. Respects prefers-reduced-motion: tilt + spotlight go
 * static, decorative graphics render a clean terminal state.
 */

type PillarVariant = "gauge" | "network" | "chart";

interface Pillar {
  label: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
  variant: PillarVariant;
}

const PILLARS: Pillar[] = [
  {
    label: "Your Voice in Policy",
    title: "Advocacy that moves the needle.",
    desc:
      "Legislator meetings, candidate forums, voter education, and direct engagement with decision-makers at city, county, and state levels.",
    href: "/about/advocacy",
    cta: "See Advocacy →",
    variant: "gauge",
  },
  {
    label: "Your Network",
    title: "Connections that open doors.",
    desc:
      "Networking events, leadership awards, the Safety Council, the Annual Golf Outing, plus a searchable directory of member businesses.",
    href: "/events",
    cta: "Browse Events →",
    variant: "network",
  },
  {
    label: "Your Growth",
    title: "Resources that drive results.",
    desc:
      "Compass leadership program, educational workshops, member-only event pricing, savings on health insurance and workers' comp, and visibility across Chamber channels.",
    href: "/membership/benefits",
    cta: "See Benefits →",
    variant: "chart",
  },
];

export function ThreePillars() {
  return (
    <section className="tp-section relative mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-28">
      <div className="tp-honeycomb" aria-hidden="true" />
      <FadeIn>
        <div className="grid lg:grid-cols-[1.25fr_1fr] gap-10 lg:gap-14 items-end mb-14 lg:mb-16">
          <div>
            <p className="text-overline text-cambridge mb-3">Why Members Join</p>
            <h2 className="text-h2">How the Chamber works for you.</h2>
            <p className="text-body-lg text-text-secondary mt-4 max-w-xl leading-relaxed">
              Since 1938, from our downtown Medina headquarters, the Chamber has
              served as the voice, the network, and the growth engine for
              Medina County business.
            </p>
          </div>
          <div className="relative rounded-[var(--radius-lg)] overflow-hidden aspect-[4/3] lg:aspect-auto lg:h-64 border border-border-secondary shadow-[0_14px_36px_rgba(12,27,51,0.14)]">
            <Image
              src="/images/photos/medina-chamber-headquarters-court-street.webp"
              alt="Greater Medina Chamber of Commerce headquarters, a two-story brick building at 139 N. Court Street in downtown Medina, Ohio"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 40vw"
              quality={70}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-oxford/50 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-3 left-3 bg-oxford/80 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
              139 N. Court Street
            </div>
          </div>
        </div>
      </FadeIn>

      <PillarGrid />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Grid — publishes section-level cursor as CSS custom props                  */
/* -------------------------------------------------------------------------- */

function PillarGrid() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia?.("(hover: none) and (pointer: coarse)").matches;
    if (reduceMotion || isTouch) {
      grid.classList.add("tp-grid--live");
      return;
    }

    let tx = 0.5;
    let ty = 0.5;
    let cx = 0.5;
    let cy = 0.5;
    let raf = 0;
    let live = false;

    const tick = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      grid.style.setProperty("--tp-sx", cx.toFixed(3));
      grid.style.setProperty("--tp-sy", cy.toFixed(3));
      // Settled — stop looping; ensureRunning restarts when targets change.
      if (Math.abs(tx - cx) < 0.001 && Math.abs(ty - cy) < 0.001) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const ensureRunning = () => {
      if (raf === 0) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const rect = grid.getBoundingClientRect();
      tx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      ty = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      if (!live) {
        live = true;
        grid.classList.add("tp-grid--live");
      }
      ensureRunning();
    };
    const onLeave = () => {
      live = false;
      tx = 0.5;
      ty = 0.5;
      grid.classList.remove("tp-grid--live");
      // Restart so the shared cursor props ease back to center.
      ensureRunning();
    };

    grid.addEventListener("pointermove", onMove);
    grid.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      grid.removeEventListener("pointermove", onMove);
      grid.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={gridRef}
      className="tp-grid grid md:grid-cols-3 gap-6"
      style={{ "--tp-sx": 0.5, "--tp-sy": 0.5 } as CSSProperties}
    >
      {PILLARS.map((pillar, i) => (
        <FadeIn key={pillar.label} delay={i * 100}>
          <PillarCard pillar={pillar} />
        </FadeIn>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Card — tracks its own cursor for 3D tilt + local spotlight                 */
/* -------------------------------------------------------------------------- */

function PillarCard({ pillar }: { pillar: Pillar }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia?.("(hover: none) and (pointer: coarse)").matches;
    if (reduceMotion || isTouch) return;

    let trx = 0;
    let try_ = 0;
    let crx = 0;
    let cry = 0;
    let tlx = 0.5;
    let tly = 0.5;
    let clx = 0.5;
    let cly = 0.5;
    let raf = 0;

    const tick = () => {
      crx += (trx - crx) * 0.1;
      cry += (try_ - cry) * 0.1;
      clx += (tlx - clx) * 0.12;
      cly += (tly - cly) * 0.12;
      card.style.setProperty("--tp-rx", crx.toFixed(2) + "deg");
      card.style.setProperty("--tp-ry", cry.toFixed(2) + "deg");
      card.style.setProperty("--tp-lx", clx.toFixed(3));
      card.style.setProperty("--tp-ly", cly.toFixed(3));
      // Settled — stop looping; ensureRunning restarts when targets change.
      if (
        Math.abs(trx - crx) < 0.01 &&
        Math.abs(try_ - cry) < 0.01 &&
        Math.abs(tlx - clx) < 0.001 &&
        Math.abs(tly - cly) < 0.001
      ) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const ensureRunning = () => {
      if (raf === 0) raf = requestAnimationFrame(tick);
    };

    const onEnter = () => {
      card.classList.add("tp-card--hover");
      ensureRunning();
    };
    const onMove = (e: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      // "Look at cursor" tilt: top forward when cursor at top, etc.
      trx = (ny - 0.5) * 8; // negative when cursor near top
      try_ = -(nx - 0.5) * 10; // negative when cursor near right
      tlx = nx;
      tly = ny;
      ensureRunning();
    };
    const onLeave = () => {
      card.classList.remove("tp-card--hover");
      trx = 0;
      try_ = 0;
      tlx = 0.5;
      tly = 0.5;
      // Restart so the tilt + spotlight ease back to rest.
      ensureRunning();
    };

    card.addEventListener("pointerenter", onEnter);
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      card.removeEventListener("pointerenter", onEnter);
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="tp-card-perspective h-full">
      <div
        ref={cardRef}
        className="tp-card"
        style={
          {
            "--tp-rx": "0deg",
            "--tp-ry": "0deg",
            "--tp-lx": 0.5,
            "--tp-ly": 0.5,
          } as CSSProperties
        }
      >
        {/* Cursor-tracked spotlight */}
        <div className="tp-card__spotlight" aria-hidden="true" />

        {/* Top-right graphic */}
        <div className="tp-card__graphic" aria-hidden="true">
          {pillar.variant === "gauge" && <GaugeGraphic />}
          {pillar.variant === "network" && <NetworkGraphic />}
          {pillar.variant === "chart" && <ChartGraphic />}
        </div>

        <div className="tp-card__body">
          <div className="tp-card__top">
            <p className="text-caption text-cambridge font-bold uppercase tracking-wider">
              {pillar.label}
            </p>
            <h3 className="text-h3 mt-2 mb-3">{pillar.title}</h3>
          </div>
          <p className="text-body-sm text-text-secondary leading-relaxed flex-1">
            {pillar.desc}
          </p>
          <Link
            href={pillar.href}
            className="tp-card__cta mt-5 text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors inline-flex items-center gap-1"
          >
            <span>{pillar.cta}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Graphics — pure SVG, currentColor = cambridge, react via CSS custom props  */
/* -------------------------------------------------------------------------- */

function GaugeGraphic() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="tp-graphic tp-graphic--gauge"
      aria-hidden="true"
    >
      {/* dial track */}
      <path
        d="M 20 78 A 40 40 0 0 1 100 78"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* active arc — draws in on mount */}
      <path
        d="M 20 78 A 40 40 0 0 1 100 78"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="tp-graphic__arc"
      />
      {/* tick marks */}
      {Array.from({ length: 9 }).map((_, i) => {
        const t = i / 8; // 0..1 across the dial
        const angle = Math.PI + t * Math.PI; // 180° → 360°
        const cx = 60;
        const cy = 78;
        const r1 = 44;
        const r2 = i % 2 === 0 ? 50 : 47;
        return (
          <line
            key={i}
            x1={cx + Math.cos(angle) * r1}
            y1={cy + Math.sin(angle) * r1}
            x2={cx + Math.cos(angle) * r2}
            y2={cy + Math.sin(angle) * r2}
            stroke="currentColor"
            strokeOpacity={i % 2 === 0 ? 0.55 : 0.3}
            strokeWidth="1.5"
          />
        );
      })}
      {/* needle — sways at rest, snaps to cursor X on hover */}
      <g className="tp-graphic__needle">
        <line
          x1="60"
          y1="78"
          x2="60"
          y2="40"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="60" cy="40" r="2.5" fill="currentColor" />
      </g>
      {/* hub */}
      <circle cx="60" cy="78" r="4" fill="currentColor" />
      <circle cx="60" cy="78" r="1.6" fill="#0C1B33" />
    </svg>
  );
}

function NetworkGraphic() {
  // 7 outer nodes; 1 "you" node at center that drifts with cursor.
  const nodes = [
    { x: 24, y: 34 },
    { x: 60, y: 20 },
    { x: 96, y: 34 },
    { x: 102, y: 70 },
    { x: 80, y: 98 },
    { x: 40, y: 98 },
    { x: 18, y: 70 },
  ];

  return (
    <svg
      viewBox="0 0 120 120"
      className="tp-graphic tp-graphic--network"
      aria-hidden="true"
    >
      {/* faint web between outer nodes */}
      {nodes.map((a, i) =>
        nodes.slice(i + 1).map((b, j) => (
          <line
            key={`${i}-${j}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="0.6"
          />
        ))
      )}

      {/* "you" → each outer node, with traveling pulse */}
      {nodes.map((n, i) => (
        <line
          key={`y-${i}`}
          x1="60"
          y1="60"
          x2={n.x}
          y2={n.y}
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="0.8"
          className="tp-graphic__connect"
          style={{ animationDelay: `${i * 140}ms` }}
        />
      ))}

      {/* outer nodes — staggered pulse */}
      {nodes.map((n, i) => (
        <g key={`n-${i}`} style={{ transformOrigin: `${n.x}px ${n.y}px` }}>
          <circle
            cx={n.x}
            cy={n.y}
            r="3"
            fill="currentColor"
            className="tp-graphic__node"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        </g>
      ))}

      {/* "you" node — follows local cursor */}
      <g className="tp-graphic__you">
        <circle cx="60" cy="60" r="6" fill="currentColor" fillOpacity="0.2" />
        <circle cx="60" cy="60" r="3.2" fill="currentColor" />
      </g>
    </svg>
  );
}

function ChartGraphic() {
  const bars = [32, 46, 40, 66, 86];
  return (
    <svg
      viewBox="0 0 120 120"
      className="tp-graphic tp-graphic--chart"
      aria-hidden="true"
    >
      {/* baseline */}
      <line
        x1="12"
        y1="100"
        x2="108"
        y2="100"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="1"
      />
      {/* grid lines */}
      {[80, 60, 40, 20].map((y) => (
        <line
          key={y}
          x1="12"
          y1={y}
          x2="108"
          y2={y}
          stroke="currentColor"
          strokeOpacity="0.07"
          strokeWidth="0.8"
          strokeDasharray="2 3"
        />
      ))}
      {/* bars */}
      {bars.map((h, i) => {
        const bw = 14;
        const gap = 5;
        const x = 18 + i * (bw + gap);
        return (
          <rect
            key={i}
            x={x}
            y={100 - h}
            width={bw}
            height={h}
            rx="2"
            fill="currentColor"
            fillOpacity={0.35 + i * 0.13}
            className="tp-graphic__bar"
            style={{ ["--tp-i" as string]: i } as CSSProperties}
          />
        );
      })}
      {/* upward trend polyline through bar tops */}
      <polyline
        points={bars
          .map((h, i) => {
            const bw = 14;
            const gap = 5;
            const x = 18 + i * (bw + gap) + bw / 2;
            const y = 100 - h;
            return `${x},${y}`;
          })
          .join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="tp-graphic__trend"
      />
      {/* peak dot — pulses */}
      <g className="tp-graphic__peak">
        <circle
          cx={18 + 4 * (14 + 5) + 7}
          cy={100 - 86}
          r="6"
          fill="currentColor"
          fillOpacity="0.2"
          className="tp-graphic__peak-ring"
        />
        <circle
          cx={18 + 4 * (14 + 5) + 7}
          cy={100 - 86}
          r="3"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}
