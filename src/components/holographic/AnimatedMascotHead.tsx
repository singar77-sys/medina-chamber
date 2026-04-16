"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedMascotHeadProps {
  /** When true, cycles through speaking mouth frames. */
  speaking?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * Animated head-only version of the ChamberBot mascot for avatars.
 *
 * Fetches chamberbot-head.svg (22 KB, body-stripped) and manipulates
 * the Illustrator-named groups for blink + mouth animation via DOM refs.
 * Designed for small surfaces (chat widget header, floating button).
 */
export function AnimatedMascotHead({
  speaking = false,
  className = "",
  ariaLabel = "ChamberBot",
}: AnimatedMascotHeadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  // ── Load SVG once ────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    fetch("/images/chamberbot-head.svg")
      .then((r) => r.text())
      .then((svg) => {
        if (cancelled) return;
        el.innerHTML = svg;
        const svgEl = el.querySelector("svg");
        if (svgEl) {
          svgEl.setAttribute("width", "100%");
          svgEl.setAttribute("height", "100%");
          svgEl.style.display = "block";
        }
        setLoaded(true);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  // ── Blink ────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;

    const eyesOpen = svg.querySelector<SVGGElement>('[id*="Eyes_Open"]');
    const eyesClosed = svg.querySelector<SVGGElement>('[id*="Eyes_Closed"]');
    if (!eyesOpen || !eyesClosed) return;

    eyesOpen.style.display = "";
    eyesClosed.style.display = "none";

    let timer: ReturnType<typeof setTimeout>;
    function blink() {
      if (!eyesOpen || !eyesClosed) return;
      eyesOpen.style.display = "none";
      eyesClosed.style.display = "";
      setTimeout(() => {
        eyesOpen!.style.display = "";
        eyesClosed!.style.display = "none";
      }, 150);
      timer = setTimeout(blink, 3000 + Math.random() * 3000);
    }
    timer = setTimeout(blink, 1500 + Math.random() * 2000);
    return () => clearTimeout(timer);
  }, [loaded]);

  // ── Mouth (speaking vs resting) ──────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;

    const mouthClosed = svg.querySelector<SVGGElement>('[id*="Mouth_Closed"]');
    const mouths = [
      svg.querySelector<SVGGElement>('[id*="Mouth_Speaking_1"]'),
      svg.querySelector<SVGGElement>('[id*="Mouth_Speaking_2"]'),
      svg.querySelector<SVGGElement>('[id*="Mouth_Speaking_3"]'),
    ];

    if (speaking) {
      if (mouthClosed) mouthClosed.style.display = "none";
      let i = 0;
      const cycle = setInterval(() => {
        mouths.forEach((m, idx) => {
          if (m) m.style.display = idx === i ? "" : "none";
        });
        i = (i + 1) % 3;
      }, 180);
      return () => {
        clearInterval(cycle);
        if (mouthClosed) mouthClosed.style.display = "";
        mouths.forEach((m) => { if (m) m.style.display = "none"; });
      };
    } else {
      if (mouthClosed) mouthClosed.style.display = "";
      mouths.forEach((m) => { if (m) m.style.display = "none"; });
    }
  }, [loaded, speaking]);

  return (
    <div
      ref={containerRef}
      className={className}
      role={ariaLabel ? "img" : "presentation"}
      aria-label={ariaLabel || undefined}
      aria-hidden={ariaLabel ? undefined : true}
    />
  );
}
