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

        // Tag the named Illustrator groups with our CSS hooks so the
        // state-driven animations in globals.css can target them.
        const tag = (selector: string, cls: string) => {
          const node = svgEl?.querySelector<SVGGElement>(selector);
          if (node) node.classList.add(cls);
        };
        // Antenna — pulses at rest, wobbles when thinking
        tag('[id*="Antenna"]', "cbm-antenna");
        // Body — slow idle breathe
        tag('[id*="Body"]', "cbm-body");
        // Face groups — tilt together when thinking so nothing floats
        const faceSelectors = [
          '[id*="Head"]',
          '[id*="Hair_Foreground"]',
          '[id*="Hair_Background"]',
          '[id*="Glasses"]',
          '[id*="Eyes_Open"]',
          '[id*="Eyes_Closed"]',
          '[id*="Mouth_Closed"]',
          '[id*="Mouth_Speaking_1"]',
          '[id*="Mouth_Speaking_2"]',
          '[id*="Mouth_Speaking_3"]',
        ];
        faceSelectors.forEach((sel) => tag(sel, "cbm-face"));
        // Eyebrows — face tilt PLUS raise-up on listening/thinking
        tag('[id*="Eyebrows"]', "cbm-eyebrows");
        // Right arm (viewer's right) — one-shot wave on load
        tag('[id*="Forearms_Right"]', "cbm-arm-right");
        tag('[id*="Hand_Right"]', "cbm-arm-right");
        // Left arm (viewer's left) — flourish when response ends
        tag('[id*="Forearm_Left"]', "cbm-arm-left");
        tag('[id*="Hand_Left"]', "cbm-arm-left");

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

  // ── Wave once on mount, after a beat so users see the idle pose ─
  useEffect(() => {
    if (!loaded) return;
    const el = containerRef.current;
    if (!el) return;

    const start = setTimeout(() => {
      el.classList.add("cbm-waving");
      // Remove class after animation so the arm rests back at 0°
      setTimeout(() => el.classList.remove("cbm-waving"), 2900);
    }, 1200);

    return () => clearTimeout(start);
  }, [loaded]);

  // ── Flourish left hand when bot finishes responding ────────────
  const prevStateRef = useRef<SceneState>(state);
  useEffect(() => {
    if (!loaded) return;
    const el = containerRef.current;
    if (!el) return;

    if (
      prevStateRef.current === "responding" &&
      state !== "responding"
    ) {
      el.classList.add("cbm-flourish");
      setTimeout(() => el.classList.remove("cbm-flourish"), 1000);
    }
    prevStateRef.current = state;
  }, [state, loaded]);

  // ── Eye tracking — pupils follow the cursor ────────────────────
  useEffect(() => {
    if (!loaded) return;
    const el = containerRef.current;
    if (!el) return;
    const svg = el.querySelector("svg");
    if (!svg) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    // The eye inner groups sit inside the clippath wrappers (st21 / st36).
    // Translating them moves the iris + pupil together within the eye socket.
    const leftInner = svg.querySelector<SVGGElement>("g.st21 > g");
    const rightInner = svg.querySelector<SVGGElement>("g.st36 > g");
    if (!leftInner || !rightInner) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    const MAX_OFFSET = 3.5; // viewBox units

    const onMove = (e: MouseEvent) => {
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      // Bias toward where the eyes actually sit (~35% from top)
      const cy = rect.top + rect.height * 0.35;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      targetX = Math.max(-1, Math.min(1, dx)) * MAX_OFFSET;
      targetY = Math.max(-1, Math.min(1, dy)) * MAX_OFFSET * 0.7;
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;
      const t = `translate(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px)`;
      leftInner.style.transform = t;
      rightInner.style.transform = t;
      raf = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMove);
    animate();

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
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
      data-state={state}
      className={`cbm-mascot robot-float robot-fly-in ${className}`}
      aria-label="ChamberBot — friendly AI assistant"
      role="img"
    />
  );
}
