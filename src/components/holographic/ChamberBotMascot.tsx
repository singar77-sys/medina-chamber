"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type SceneState = "idle" | "listening" | "thinking" | "responding";

interface ChamberBotMascotProps {
  state?: SceneState;
  className?: string;
}

/**
 * Animated ChamberBot mascot — professional illustrated character.
 *
 * Loads the full SVG from /images/chamberbot.svg client-side and
 * manipulates named Illustrator layer groups via DOM refs:
 *
 *   Eyes:  toggles Eyes_Open / Eyes_Closed for blinking
 *   Mouth: cycles Mouth_Speaking 1→2→3 when responding, shows
 *          Mouth_Closed at rest
 *
 * Idle float animation is handled by a CSS class on the wrapper
 * (reuses the existing robot-float keyframe from globals.css).
 */
export function ChamberBotMascot({
  state = "idle",
  className = "",
}: ChamberBotMascotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  // ── Load SVG once ──────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    fetch("/images/chamberbot.svg")
      .then((r) => r.text())
      .then((svg) => {
        if (cancelled) return;
        // Remove the dark background rect so character floats on
        // the page's own background.
        const cleaned = svg.replace(
          /<g id="BG">[\s\S]*?<\/g>/,
          "",
        );
        el.innerHTML = cleaned;

        // Make the SVG scale responsively
        const svgEl = el.querySelector("svg");
        if (svgEl) {
          svgEl.setAttribute("width", "100%");
          svgEl.setAttribute("height", "100%");
          svgEl.style.display = "block";
        }

        setLoaded(true);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Blink timer ────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const el = containerRef.current;
    if (!el) return;
    const svg = el.querySelector("svg");
    if (!svg) return;

    const eyesOpen = svg.querySelector<SVGGElement>(
      '[id*="Eyes_Open"]',
    );
    const eyesClosed = svg.querySelector<SVGGElement>(
      '[id*="Eyes_Closed"]',
    );
    if (!eyesOpen || !eyesClosed) return;

    // Start with eyes open
    eyesOpen.style.display = "";
    eyesClosed.style.display = "none";

    let raf: ReturnType<typeof setTimeout>;

    function blink() {
      if (!eyesOpen || !eyesClosed) return;
      eyesOpen.style.display = "none";
      eyesClosed.style.display = "";
      setTimeout(() => {
        eyesOpen!.style.display = "";
        eyesClosed!.style.display = "none";
      }, 150);
      // Random interval between 3-6 seconds
      raf = setTimeout(blink, 3000 + Math.random() * 3000);
    }

    raf = setTimeout(blink, 2000 + Math.random() * 2000);
    return () => clearTimeout(raf);
  }, [loaded]);

  // ── Mouth state (idle vs responding) ───────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const el = containerRef.current;
    if (!el) return;
    const svg = el.querySelector("svg");
    if (!svg) return;

    const mouthClosed = svg.querySelector<SVGGElement>(
      '[id*="Mouth_Closed"]',
    );
    const mouths = [
      svg.querySelector<SVGGElement>('[id*="Mouth_Speaking_1"]'),
      svg.querySelector<SVGGElement>('[id*="Mouth_Speaking_2"]'),
      svg.querySelector<SVGGElement>('[id*="Mouth_Speaking_3"]'),
    ];

    if (state === "responding") {
      // Hide resting mouth, start speaking cycle
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
        // Reset to resting on cleanup
        if (mouthClosed) mouthClosed.style.display = "";
        mouths.forEach((m) => {
          if (m) m.style.display = "none";
        });
      };
    } else {
      // Resting: closed mouth, hide speaking frames
      if (mouthClosed) mouthClosed.style.display = "";
      mouths.forEach((m) => {
        if (m) m.style.display = "none";
      });
    }
  }, [loaded, state]);

  return (
    <div
      ref={containerRef}
      className={`robot-float robot-fly-in ${className}`}
      aria-label="ChamberBot — friendly AI assistant"
      role="img"
    />
  );
}
