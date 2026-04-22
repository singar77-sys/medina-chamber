"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

/**
 * MedinaAmbience — a brief, weather-aware visual effect that plays once
 * when a visitor lands, to make the site feel physically tied to
 * Medina's actual current conditions.
 *
 *   clear / cloudy → no effect (ambient silence is the statement)
 *   snow            → ~26 drifting flakes for ~8s
 *   rain            → ~48 vertical streaks + 2 lightning flashes
 *   thunder         → same as rain but with more frequent flashes
 *   fog             → drifting horizontal mist banks
 *
 * Session-storage guard: the effect fires ONCE per session — no
 * repeat on route changes or returning-to-tab. Respects
 * prefers-reduced-motion (renders nothing for those users).
 */

type Condition = "clear" | "cloudy" | "fog" | "rain" | "snow" | "thunder";

interface MedinaWeather {
  condition: Condition;
  tempF: number | null;
  isDay: boolean;
  observedAt: string;
  fetchedAt: string;
}

type Phase = "dormant" | "entering" | "holding" | "leaving" | "done";

const ENTER_MS = 700;
const HOLD_MS = 6500;
const LEAVE_MS = 1500;
const TOTAL_MS = ENTER_MS + HOLD_MS + LEAVE_MS;

const SESSION_KEY = "mc-ambience-played";

export function MedinaAmbience() {
  const [weather, setWeather] = useState<MedinaWeather | null>(null);
  const [phase, setPhase] = useState<Phase>("dormant");
  // Ref-based one-shot guard — survives React 19 strict-mode double-invoke
  // in dev so we don't fire two concurrent /api/weather requests. Timers
  // are also held in a ref so the cleanup returned from either mount can
  // cancel them on real unmount without fighting the fetch promise chain.
  const ranRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // A single cleanup that's safe to run any number of times. Returned
    // from every effect invocation so strict-mode cleanup and real
    // unmount both clear whatever timers are currently pending.
    const cleanup = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };

    if (typeof window === "undefined") return cleanup;
    if (ranRef.current) return cleanup;

    // Respect prefers-reduced-motion — render nothing, skip the fetch.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ranRef.current = true;
      return cleanup;
    }

    // URL override first — lets us test by reloading with ?weather=snow,
    // bypassing the session guard.
    const params = new URLSearchParams(window.location.search);
    const override = params.get("weather") as Condition | null;
    const valid: Condition[] = ["clear", "cloudy", "fog", "rain", "snow", "thunder"];
    const hasOverride = !!(override && valid.includes(override));

    // Session guard — skipped when overriding for testing.
    if (!hasOverride && sessionStorage.getItem(SESSION_KEY) === "true") {
      ranRef.current = true;
      return cleanup;
    }
    if (hasOverride) sessionStorage.removeItem(SESSION_KEY);

    ranRef.current = true;

    fetch("/api/weather", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((raw: MedinaWeather | null) => {
        if (!raw) return;

        // Apply override if present
        const data: MedinaWeather = hasOverride
          ? { ...raw, condition: override as Condition }
          : raw;

        // AUTO-THEME: if the visitor hasn't explicitly picked a theme,
        // match Medina's current day/night state. The ThemeProvider
        // respects their stored choice — we only overwrite when none
        // exists. We don't write to localStorage (stays "unchosen").
        try {
          const stored = localStorage.getItem("mc-theme");
          if (!stored) {
            const target = data.isDay ? "light" : "dark";
            const current = document.documentElement.getAttribute("data-theme");
            if (current !== target) {
              document.documentElement.setAttribute("data-theme-transitioning", "");
              document.documentElement.setAttribute("data-theme", target);
              requestAnimationFrame(() =>
                document.documentElement.removeAttribute("data-theme-transitioning"),
              );
            }
          }
        } catch {
          /* localStorage can throw in embedded contexts — ignore */
        }

        // Mark session as handled regardless of whether there's an
        // effect to play.
        sessionStorage.setItem(SESSION_KEY, "true");

        const playable: Condition[] = ["snow", "rain", "thunder", "fog"];
        if (!playable.includes(data.condition)) return;

        // Commit weather + kick off the phase sequence. React batches
        // these two setters so the first render with a non-dormant
        // phase always has `weather` populated. setState on an unmounted
        // component is a no-op in React 19 — no cancelled flag needed.
        setWeather(data);
        setPhase("entering");
        timersRef.current.push(
          setTimeout(() => setPhase("holding"), ENTER_MS),
          setTimeout(() => setPhase("leaving"), ENTER_MS + HOLD_MS),
          setTimeout(() => setPhase("done"), TOTAL_MS),
        );
      })
      .catch(() => {
        /* network issues — fail silent */
      });

    return cleanup;
  }, []);

  // Easter-egg re-trigger. Any component on the page can fire a
  // `mc-ambience-play` CustomEvent with `detail.condition` to force an
  // effect to play regardless of session guards or actual Medina
  // weather. KeywordHotkey uses this so typing "snow" etc. anywhere on
  // the site starts the animation.
  useEffect(() => {
    const onPlay = (event: Event) => {
      const ce = event as CustomEvent<{ condition?: Condition }>;
      const condition = ce.detail?.condition;
      const playable: Condition[] = ["snow", "rain", "thunder", "fog"];
      if (!condition || !playable.includes(condition)) return;

      // Clear any in-flight phase transitions so we don't fight an
      // already-running sequence.
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];

      // Synthesize a minimal weather payload — the renderer only cares
      // about `condition`, but the rest keeps the type honest.
      const now = new Date().toISOString();
      setWeather({
        condition,
        tempF: null,
        isDay: true,
        observedAt: now,
        fetchedAt: now,
      });
      setPhase("entering");
      timersRef.current.push(
        setTimeout(() => setPhase("holding"), ENTER_MS),
        setTimeout(() => setPhase("leaving"), ENTER_MS + HOLD_MS),
        setTimeout(() => setPhase("done"), TOTAL_MS),
      );
    };

    window.addEventListener("mc-ambience-play", onPlay as EventListener);
    return () => {
      window.removeEventListener("mc-ambience-play", onPlay as EventListener);
    };
  }, []);

  if (phase === "dormant" || phase === "done" || !weather) return null;

  return (
    <div
      className={`mwx mwx--${weather.condition} mwx--${phase}`}
      aria-hidden="true"
    >
      {weather.condition === "snow" && <SnowLayer />}
      {(weather.condition === "rain" || weather.condition === "thunder") && (
        <RainLayer heavy={weather.condition === "thunder"} />
      )}
      {weather.condition === "fog" && <FogLayer />}
    </div>
  );
}

/* ─── Effect layers ────────────────────────────────────────────── */

function SnowLayer() {
  // Deterministic pseudo-random positions so SSR/CSR match. 26 flakes.
  const flakes = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const seed = Math.sin(i * 13.37) * 10000;
        const rand = seed - Math.floor(seed); // 0-1
        return {
          id: i,
          left: (i * 73) % 100,
          size: 5 + ((i * 3) % 5),
          delay: rand * 2.5,
          duration: 9 + (rand * 6),
          drift: (rand - 0.5) * 120,
          opacity: 0.55 + rand * 0.35,
        };
      }),
    [],
  );
  return (
    <>
      {flakes.map((f) => (
        <span
          key={f.id}
          className="mwx-flake"
          style={
            {
              left: `${f.left}%`,
              width: `${f.size}px`,
              height: `${f.size}px`,
              opacity: f.opacity,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.duration}s`,
              "--flake-drift": `${f.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </>
  );
}

function RainLayer({ heavy }: { heavy: boolean }) {
  const streaks = useMemo(
    () =>
      Array.from({ length: heavy ? 64 : 48 }, (_, i) => {
        const seed = Math.sin(i * 7.919) * 10000;
        const rand = seed - Math.floor(seed);
        return {
          id: i,
          left: (i * 41) % 100,
          delay: rand * 0.9,
          duration: 0.6 + rand * 0.4,
          length: 24 + (rand * 28),
        };
      }),
    [heavy],
  );

  // Lightning flashes — 2 for rain, 4 for thunder, random timing during hold.
  const flashes = useMemo(() => {
    const count = heavy ? 4 : 2;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      // Spread between 1.2s and 6.5s into the sequence
      delay: 1.2 + (i / Math.max(1, count - 1)) * 5.3 + Math.random() * 0.5,
    }));
  }, [heavy]);

  return (
    <>
      {streaks.map((s) => (
        <span
          key={s.id}
          className="mwx-streak"
          style={
            {
              left: `${s.left}%`,
              height: `${s.length}px`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            } as CSSProperties
          }
        />
      ))}
      {flashes.map((f) => (
        <span
          key={`flash-${f.id}`}
          className="mwx-flash"
          style={{ animationDelay: `${f.delay}s` }}
        />
      ))}
    </>
  );
}

function FogLayer() {
  // Three drifting horizontal bands at different heights + speeds.
  const bands = [
    { top: "14%", duration: 32, delay: 0,   opacity: 0.45 },
    { top: "42%", duration: 44, delay: 2,   opacity: 0.35 },
    { top: "72%", duration: 38, delay: 4.5, opacity: 0.28 },
  ];
  return (
    <>
      {bands.map((b, i) => (
        <span
          key={i}
          className="mwx-fog"
          style={{
            top: b.top,
            opacity: b.opacity,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </>
  );
}
