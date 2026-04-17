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

  // ── Blink (with occasional double / rare triple) ──────────────
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
        // close
        after(acc, close);
        acc += 120 + Math.random() * 70; // 120-190ms closed
        // open
        after(acc, open);
        if (i < count - 1) {
          acc += 80 + Math.random() * 40; // 80-120ms open between blinks
        }
      }
      after(acc, done);
    };

    const schedule = () => {
      const gap = 2800 + Math.random() * 3400; // 2.8-6.2s between sequences
      after(gap, () => doBlinkSequence(schedule));
    };

    schedule();

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [loaded]);

  // ── Wave once when Jackie scrolls into view ───────────────────
  // Fires on first real viewport intersection — not on mount —
  // so users landing at the top of the page don't miss the gesture
  // while Jackie is still below the fold.
  useEffect(() => {
    if (!loaded) return;
    const el = containerRef.current;
    if (!el) return;

    let waved = false;
    let removeTimer: ReturnType<typeof setTimeout> | null = null;
    let startTimer: ReturnType<typeof setTimeout> | null = null;

    const wave = () => {
      if (waved) return;
      waved = true;
      // Small beat so users register the idle pose first
      startTimer = setTimeout(() => {
        el.classList.add("cbm-waving");
        removeTimer = setTimeout(
          () => el.classList.remove("cbm-waving"),
          2900,
        );
      }, 600);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          wave();
          observer.unobserve(el);
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (startTimer) clearTimeout(startTimer);
      if (removeTimer) clearTimeout(removeTimer);
    };
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
      // Speaking: randomized frame order with variable timing and
      // occasional closed-mouth beats (simulates gaps between syllables).
      if (mouthClosed) mouthClosed.style.display = "none";

      const hideAll = () => {
        if (mouthClosed) mouthClosed.style.display = "none";
        mouths.forEach((m) => {
          if (m) m.style.display = "none";
        });
      };

      let lastFrame = -1;
      let nextTimer: ReturnType<typeof setTimeout>;

      const step = () => {
        // 15% chance of a brief closed beat (syllable gap)
        if (Math.random() < 0.15) {
          hideAll();
          if (mouthClosed) mouthClosed.style.display = "";
          nextTimer = setTimeout(step, 90 + Math.random() * 70); // 90-160ms
          return;
        }

        // Pick a speaking frame different from the previous one so the
        // mouth never appears "stuck" on the same shape.
        let next: number;
        do {
          next = Math.floor(Math.random() * 3);
        } while (next === lastFrame);
        lastFrame = next;

        hideAll();
        const pick = mouths[next];
        // Must use "inline" (not "") — the Illustrator export gives the
        // speaking frames class="st33" with display:none, so empty string
        // removes the inline style but leaves the class rule winning.
        if (pick) pick.style.display = "inline";

        nextTimer = setTimeout(step, 110 + Math.random() * 130); // 110-240ms
      };

      step();

      return () => {
        clearTimeout(nextTimer);
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
