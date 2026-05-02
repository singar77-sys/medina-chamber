"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

// Module-level singleton — one fetch per page lifetime, shared across all
// instances and remounts. The Promise itself is the cache: concurrent mounts
// share the in-flight request; resolved mounts get the cached value as a
// microtask. Reset to null on failure so the next mount retries cleanly.
let svgCache: Promise<string> | null = null;

function getChamberBotSvg(): Promise<string> {
  if (!svgCache) {
    svgCache = fetch("/images/chamberbot.svg")
      .then((r) => r.text())
      .then((raw) => raw.replace(/<g id="BG">[\s\S]*?<\/g>/, ""))
      .catch((err) => {
        svgCache = null;
        throw err;
      });
  }
  return svgCache;
}

type SceneState = "idle" | "listening" | "thinking" | "responding";
type Mood = "alert" | "sleeping";
export type MascotIntent = "member" | "event" | "count" | "error" | "general";

interface ChamberBotMascotProps {
  state?: SceneState;
  className?: string;
  /** True when the user is typing while the bot is mid-response. */
  userIsTyping?: boolean;
  /** Answer-type for one-shot intent reactions (fires on each new query). */
  intent?: MascotIntent;
}

const IDLE_SLEEP_MS = 30_000;

/**
 * Animated ChamberBot mascot.
 *
 * Loads /images/chamberbot.svg client-side and manipulates named
 * Illustrator groups (eyes, mouth, antenna, arms, body, face) via
 * DOM refs + CSS hook classes. Wrapper owns animation overlays
 * (shadow, sleep Z's) as siblings of the SVG container so innerHTML
 * injection doesn't wipe them.
 *
 * Behaviors:
 *   - Eye pupils track the cursor window-wide
 *   - Head tilts gently toward the cursor (idle) or to a fixed
 *     position during thinking / sleeping
 *   - Antenna pulses + wiggles continuously
 *   - Mouth lip-syncs when state="responding"
 *   - Blinks on randomized cadence with triple / double / single
 *   - Waves once on first scroll-into-view, flourishes when a reply
 *     finishes
 *   - Click / Enter / Space → surprised jump
 *   - Idle >30s → sleeping (eyes closed, head droops, Z particles
 *     drift up). Mouse move / keydown / touchstart wakes it up.
 *   - Floor shadow scales with the jump
 */
export function ChamberBotMascot({
  state = "idle",
  className = "",
  userIsTyping = false,
  intent,
}: ChamberBotMascotProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [mood, setMood] = useState<Mood>("alert");

  // Ref mirrors for values the rAF loop reads without restarting
  const userIsTypingRef = useRef(false);
  const microGazeRef = useRef<{ x: number; y: number } | null>(null);
  // Tracks last intent that triggered a reaction — reset on new thinking phase
  const prevIntentRef = useRef<MascotIntent | undefined>(undefined);

  // ── Load SVG once ──────────────────────────────────────────────
  useEffect(() => {
    const el = svgContainerRef.current;
    if (!el) return;

    let cancelled = false;
    getChamberBotSvg()
      .then((cleaned) => {
        if (cancelled) return;
        el.innerHTML = cleaned;

        const svgEl = el.querySelector("svg");
        if (svgEl) {
          svgEl.setAttribute("width", "100%");
          svgEl.setAttribute("height", "100%");
          svgEl.style.display = "block";
        }

        const tag = (selector: string, cls: string) => {
          const node = svgEl?.querySelector<SVGGElement>(selector);
          if (node) node.classList.add(cls);
        };

        tag('[id*="Antenna"]', "cbm-antenna");
        tag('[id*="Body"]', "cbm-body");
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
        tag('[id*="Eyebrows"]', "cbm-eyebrows");
        tag('[id*="Forearms_Right"]', "cbm-arm-right");
        tag('[id*="Hand_Right"]', "cbm-arm-right");
        tag('[id*="Forearm_Left"]', "cbm-arm-left");
        tag('[id*="Hand_Left"]', "cbm-arm-left");

        setLoaded(true);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // Sync prop → ref so the rAF loop reads it without restarting
  useEffect(() => {
    userIsTypingRef.current = userIsTyping;
  }, [userIsTyping]);

  // Reset intent guard whenever a new thinking phase begins so the
  // reaction fires fresh on every query, even repeated intents.
  useEffect(() => {
    if (state === "thinking") prevIntentRef.current = undefined;
  }, [state]);

  // ── Blink (stops during sleep — eyes stay closed) ──────────────
  useEffect(() => {
    if (!loaded) return;
    const svg = svgContainerRef.current?.querySelector("svg");
    if (!svg) return;

    const eyesOpen = svg.querySelector<SVGGElement>('[id*="Eyes_Open"]');
    const eyesClosed = svg.querySelector<SVGGElement>('[id*="Eyes_Closed"]');
    if (!eyesOpen || !eyesClosed) return;

    // Sleeping: eyes closed, no scheduling
    if (mood === "sleeping") {
      eyesOpen.style.display = "none";
      eyesClosed.style.display = "";
      return;
    }

    // Awake: eyes open, schedule blinks
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
      const roll = Math.random();
      const count = roll < 0.05 ? 3 : roll < 0.27 ? 2 : 1;
      let acc = 0;
      for (let i = 0; i < count; i++) {
        after(acc, close);
        acc += 120 + Math.random() * 70;
        after(acc, open);
        if (i < count - 1) acc += 80 + Math.random() * 40;
      }
      after(acc, done);
    };

    const schedule = () => {
      const gap = 2800 + Math.random() * 3400;
      after(gap, () => doBlinkSequence(schedule));
    };

    schedule();

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [loaded, mood]);

  // ── Wave once when scrolled into view ──────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const el = wrapperRef.current;
    if (!el) return;

    let waved = false;
    let removeTimer: ReturnType<typeof setTimeout> | null = null;
    let startTimer: ReturnType<typeof setTimeout> | null = null;

    const wave = () => {
      if (waved) return;
      waved = true;
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

  // ── Flourish left hand when a response ends ────────────────────
  const prevStateRef = useRef<SceneState>(state);
  useEffect(() => {
    if (!loaded) return;
    const el = wrapperRef.current;
    if (!el) return;
    if (prevStateRef.current === "responding" && state !== "responding") {
      el.classList.add("cbm-flourish");
      setTimeout(() => el.classList.remove("cbm-flourish"), 1000);
    }
    prevStateRef.current = state;
  }, [state, loaded]);

  // ── Intent-aware one-shot reactions ───────────────────────────
  // Fires a short CSS class on the wrapper when the query intent
  // changes. CSS handles the specific animation per intent type.
  useEffect(() => {
    if (!loaded || !intent || intent === "general") return;
    if (intent === prevIntentRef.current) return;
    prevIntentRef.current = intent;
    const el = wrapperRef.current;
    if (!el) return;

    const cls = `cbm-intent-${intent}`;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 950);
  }, [loaded, intent]);

  // ── Micro-idle: periodic subtle variations between interactions ─
  // Every 9-20s while alert and genuinely idle, pick a random small
  // action — a sideways glance (rAF gaze), stretch (CSS), or upward
  // look. Keeps the mascot from feeling frozen between conversations.
  useEffect(() => {
    if (!loaded || mood !== "alert") return;
    const el = wrapperRef.current;
    if (!el) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    let timeout: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timeout = setTimeout(() => {
        // Only fire during true idle — skip and reschedule otherwise
        if (state !== "idle") { schedule(); return; }

        type MicroAction = {
          cls?: string;
          gaze?: { x: number; y: number };
          ms: number;
        };
        const actions: MicroAction[] = [
          { cls: "cbm-micro-glance-left",  gaze: { x: -3.2, y: 0.3 }, ms: 1100 },
          { cls: "cbm-micro-glance-right", gaze: { x:  3.2, y: 0.3 }, ms: 1100 },
          { cls: "cbm-micro-stretch",      ms: 1300 },
          { gaze: { x: 0.5, y: -1.4 }, ms: 900 }, // quiet upward look
        ];
        const pick = actions[Math.floor(Math.random() * actions.length)];
        if (pick.cls) el.classList.add(pick.cls);
        if (pick.gaze) microGazeRef.current = pick.gaze;

        setTimeout(() => {
          if (pick.cls) el.classList.remove(pick.cls);
          microGazeRef.current = null;
          schedule();
        }, pick.ms);
      }, 9000 + Math.random() * 11000);
    };

    schedule();
    return () => {
      clearTimeout(timeout);
      microGazeRef.current = null;
    };
  }, [loaded, mood, state]);

  // ── Continuous cursor-tracking loop: eyes + head tilt ─────────
  // Single rAF loop runs for the lifetime of the mascot. Each frame
  // picks a target (cursor / thinking / sleeping) and lerps toward
  // it — so state transitions are smooth without needing CSS
  // transitions that would compound on frame-updated properties.
  useEffect(() => {
    if (!loaded) return;
    const el = wrapperRef.current;
    const svg = svgContainerRef.current?.querySelector("svg");
    if (!el || !svg) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const leftInner = svg.querySelector<SVGGElement>("g.st21 > g");
    const rightInner = svg.querySelector<SVGGElement>("g.st36 > g");

    const MAX_EYE = 3.5;
    const MAX_HEAD = 5;

    // Cursor-derived targets (updated by the mousemove handler).
    let cursorEyeX = 0;
    let cursorEyeY = 0;
    let cursorHead = 0;

    // Smoothed current values (what actually gets painted).
    let curEyeX = 0;
    let curEyeY = 0;
    let curHead = 0;

    const onMove = (e: MouseEvent) => {
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.35;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      const clampedX = Math.max(-1, Math.min(1, dx));
      cursorEyeX = clampedX * MAX_EYE;
      cursorEyeY = Math.max(-1, Math.min(1, dy)) * MAX_EYE * 0.7;
      cursorHead = clampedX * MAX_HEAD;
    };

    let raf = 0;
    const animate = () => {
      // Pick per-frame targets based on current mood/state.
      let tEyeX = cursorEyeX;
      let tEyeY = cursorEyeY;
      let tHead = cursorHead;

      if (reduceMotion) {
        tEyeX = 0;
        tEyeY = 0;
        tHead = 0;
      } else if (mood === "sleeping") {
        tEyeX = 0;
        tEyeY = 0;
        tHead = -15;
      } else if (state === "responding" && userIsTypingRef.current) {
        // User interrupted mid-response — snap attention toward input (lower-left)
        tEyeX = -2.0;
        tEyeY = 1.8;
        tHead = -4;
      } else if (state === "responding") {
        // Drift gaze toward the transcript panel (right side of portal)
        tEyeX = 2.0;
        tEyeY = -0.4;
        tHead = cursorHead * 0.25;
      } else if (state === "thinking") {
        tEyeX = 0;
        tEyeY = 0;
        tHead = 3;
      } else if (state === "listening") {
        // Attentive — follow cursor but biased slightly downward toward input
        tEyeX = cursorEyeX * 0.75;
        tEyeY = cursorEyeY * 0.75 + 0.8;
        tHead = cursorHead * 0.6;
      } else if (microGazeRef.current) {
        // Micro-idle gaze override (periodic random glance)
        tEyeX = microGazeRef.current.x;
        tEyeY = microGazeRef.current.y;
      }

      // Faster lerp during interrupts so the pivot feels snappy.
      const isInterrupt = state === "responding" && userIsTypingRef.current;
      const lerpEye = isInterrupt ? 0.28 : 0.15;
      const lerpHead = mood === "sleeping" ? 0.06 : isInterrupt ? 0.22 : 0.12;

      curEyeX += (tEyeX - curEyeX) * lerpEye;
      curEyeY += (tEyeY - curEyeY) * lerpEye;
      curHead += (tHead - curHead) * lerpHead;

      const t = `translate(${curEyeX.toFixed(2)}px, ${curEyeY.toFixed(2)}px)`;
      if (leftInner) leftInner.style.transform = t;
      if (rightInner) rightInner.style.transform = t;
      el.style.setProperty("--cbm-head-tilt", curHead.toFixed(2) + "deg");

      raf = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMove);
    animate();

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [loaded, mood, state]);

  // ── Mouth state ────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const svg = svgContainerRef.current?.querySelector("svg");
    if (!svg) return;

    const mouthClosed = svg.querySelector<SVGGElement>('[id*="Mouth_Closed"]');
    const mouths = [
      svg.querySelector<SVGGElement>('[id*="Mouth_Speaking_1"]'),
      svg.querySelector<SVGGElement>('[id*="Mouth_Speaking_2"]'),
      svg.querySelector<SVGGElement>('[id*="Mouth_Speaking_3"]'),
    ];

    if (state === "responding" && !userIsTyping) {
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
        if (pick) pick.style.display = "inline";

        nextTimer = setTimeout(step, 110 + Math.random() * 130);
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
      if (mouthClosed) mouthClosed.style.display = "";
      mouths.forEach((m) => {
        if (m) m.style.display = "none";
      });
    }
  }, [loaded, state, userIsTyping]);

  // ── Idle sleep tracker ─────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const wake = () => {
      setMood("alert");
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setMood("sleeping"), IDLE_SLEEP_MS);
    };

    wake(); // start timer

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "touchstart",
      "scroll",
    ];
    events.forEach((ev) => window.addEventListener(ev, wake, { passive: true }));

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, wake));
      if (timer) clearTimeout(timer);
    };
  }, [loaded]);

  // ── Click / keyboard → surprised jump ────────────────────────
  const triggerSurprise = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    el.classList.add("cbm-surprised");
    setTimeout(() => {
      wrapperRef.current?.classList.remove("cbm-surprised");
    }, 800);
  }, []);

  const onClick = useCallback(() => {
    triggerSurprise();
  }, [triggerSurprise]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        triggerSurprise();
      }
    },
    [triggerSurprise],
  );

  return (
    <div
      ref={wrapperRef}
      data-state={state}
      data-mood={mood}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="button"
      aria-label={
        mood === "sleeping"
          ? "ChamberBot is asleep, click to wake and see a jump"
          : "ChamberBot, click to make it jump"
      }
      className={`cbm-mascot robot-float robot-fly-in ${className}`}
    >
      {/* Floor shadow — scales during jumps */}
      <div className="cbm-shadow" aria-hidden="true" />

      {/* SVG mount point — innerHTML-injected. Must have no React children. */}
      <div ref={svgContainerRef} className="cbm-svg" />

      {/* Sleep Z particles */}
      {mood === "sleeping" && (
        <div className="cbm-fx cbm-fx--zzz" aria-hidden="true">
          <span className="cbm-zzz cbm-zzz--1">Z</span>
          <span className="cbm-zzz cbm-zzz--2">Z</span>
          <span className="cbm-zzz cbm-zzz--3">Z</span>
        </div>
      )}
    </div>
  );
}
