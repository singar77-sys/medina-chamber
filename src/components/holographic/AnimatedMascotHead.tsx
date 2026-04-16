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

  // ── Blink (with occasional double / rare triple) ───────────
  useEffect(() => {
    if (!loaded) return;
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;

    const eyesOpen = svg.querySelector<SVGGElement>('[id*="Eyes_Open"]');
    const eyesClosed = svg.querySelector<SVGGElement>('[id*="Eyes_Closed"]');
    if (!eyesOpen || !eyesClosed) return;

    eyesOpen.style.display = "";
    eyesClosed.style.display = "none";

    const close = () => {
      eyesOpen.style.display = "none";
      eyesClosed.style.display = "";
    };
    const open = () => {
      eyesOpen.style.display = "";
      eyesClosed.style.display = "none";
    };

    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) => {
      const t = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timeouts.push(t);
    };

    const doBlinkSequence = (done: () => void) => {
      // 5% triple, 22% double, 73% single
      const roll = Math.random();
      const count = roll < 0.05 ? 3 : roll < 0.27 ? 2 : 1;

      let acc = 0;
      for (let i = 0; i < count; i++) {
        after(acc, close);
        acc += 120 + Math.random() * 70;
        after(acc, open);
        if (i < count - 1) {
          acc += 80 + Math.random() * 40;
        }
      }
      after(acc, done);
    };

    const schedule = () => {
      after(2800 + Math.random() * 3400, () => doBlinkSequence(schedule));
    };
    schedule();

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
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
      // Randomized frame order + variable timing + occasional closed
      // beat — same "organic speech" pattern as the full-body mascot.
      if (mouthClosed) mouthClosed.style.display = "none";

      const hideAll = () => {
        if (mouthClosed) mouthClosed.style.display = "none";
        mouths.forEach((m) => { if (m) m.style.display = "none"; });
      };

      let lastFrame = -1;
      let nextTimer: ReturnType<typeof setTimeout>;

      const step = () => {
        if (Math.random() < 0.15) {
          hideAll();
          if (mouthClosed) mouthClosed.style.display = "";
          nextTimer = setTimeout(step, 90 + Math.random() * 70);
          return;
        }

        let next: number;
        do {
          next = Math.floor(Math.random() * 3);
        } while (next === lastFrame);
        lastFrame = next;

        hideAll();
        const pick = mouths[next];
        // Speaking frames have class="st33" (display:none) baked into the
        // SVG export — must use "inline" to beat the class rule.
        if (pick) pick.style.display = "inline";

        nextTimer = setTimeout(step, 110 + Math.random() * 130);
      };

      step();

      return () => {
        clearTimeout(nextTimer);
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
