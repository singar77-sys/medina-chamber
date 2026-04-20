"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* Questions flow in from the server via props — sourced from the
   Google Sheet Jaclyn maintains. See src/lib/icebreaker.ts. */

/* ─── Shard Particle (flies out on shatter) ────────────── */

function Shard({ index }: { index: number }) {
  const angle = (index / 16) * Math.PI * 2;
  const distance = 120 + Math.random() * 200;
  const tx = Math.cos(angle) * distance;
  const ty = Math.sin(angle) * distance - 80;
  const rotation = (Math.random() - 0.5) * 720;
  const size = 8 + Math.random() * 20;
  const delay = Math.random() * 0.15;

  return (
    <div
      className="absolute rounded-sm bg-cambridge/60"
      style={{
        width: size,
        height: size,
        left: "50%",
        top: "50%",
        marginLeft: -size / 2,
        marginTop: -size / 2,
        "--tx": `${tx}px`,
        "--ty": `${ty}px`,
        "--tr": `${rotation}deg`,
        animation: `shard-fly 0.8s ${delay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
      } as React.CSSProperties}
    />
  );
}

/* ─── Phases ───────────────────────────────────────────── */

type Phase = "frozen" | "shatter" | "character" | "game";

export function IcebreakerClient({ questions }: { questions: string[] }) {
  const [phase, setPhase] = useState<Phase>("frozen");
  const [currentQ, setCurrentQ] = useState(0);
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Shuffle to a random unused question
  const nextQuestion = useCallback(() => {
    setUsedIndices((prev) => {
      const next = new Set(prev);
      next.add(currentQ);
      // If all used, reset
      if (next.size >= questions.length) {
        next.clear();
      }
      // Pick a random unused index
      const available = questions
        .map((_, i) => i)
        .filter((i) => !next.has(i));
      const pick = available[Math.floor(Math.random() * available.length)];
      setCurrentQ(pick);
      return next;
    });
  }, [currentQ, questions]);

  // Start the shatter sequence
  const startShatter = useCallback(() => {
    if (phase !== "frozen") return;
    setPhase("shatter");

    // After shards fly, show character
    setTimeout(() => setPhase("character"), 900);

    // After character animation, start game
    setTimeout(() => {
      setPhase("game");
      // Pick first random question
      setCurrentQ(Math.floor(Math.random() * questions.length));
    }, 2200);
  }, [phase, questions]);

  // Auto-start on load with a brief pause
  useEffect(() => {
    const timer = setTimeout(startShatter, 800);
    return () => clearTimeout(timer);
  }, [startShatter]);

  return (
    <div
      ref={containerRef}
      className="
        min-h-screen flex flex-col items-center justify-center
        px-6 py-16
        bg-bg-primary
        overflow-hidden
        select-none
      "
    >
      {/* ─── Frozen Cube Phase ──────────────────────── */}
      {phase === "frozen" && (
        <button
          onClick={startShatter}
          className="
            relative w-32 h-32 md:w-48 md:h-48
            perspective-[400px] cursor-pointer
            animate-[cube-float_3s_ease-in-out_infinite]
          "
          aria-label="Break the ice"
        >
          <div className="
            relative w-full h-full
            [transform-style:preserve-3d]
            [transform:rotateX(-20deg)_rotateY(-30deg)]
          ">
            <div className="absolute inset-0 bg-cambridge/20 border-2 border-cambridge/50 backdrop-blur-sm rounded-md [transform:translateZ(64px)]" />
            <div className="absolute inset-0 bg-cambridge/15 border-2 border-cambridge/40 backdrop-blur-sm rounded-md [transform:rotateY(180deg)_translateZ(64px)]" />
            <div className="absolute inset-0 bg-cambridge/15 border-2 border-cambridge/40 backdrop-blur-sm rounded-md [transform:rotateY(-90deg)_translateZ(64px)]" />
            <div className="absolute inset-0 bg-cambridge/20 border-2 border-cambridge/50 backdrop-blur-sm rounded-md [transform:rotateY(90deg)_translateZ(64px)]" />
            <div className="absolute inset-0 bg-cambridge/25 border-2 border-cambridge/60 backdrop-blur-sm rounded-md [transform:rotateX(90deg)_translateZ(64px)]" />
            <div className="absolute inset-0 bg-cambridge/10 border-2 border-cambridge/30 backdrop-blur-sm rounded-md [transform:rotateX(-90deg)_translateZ(64px)]" />

            {/* Frost text on front face */}
            <div className="absolute inset-0 flex items-center justify-center [transform:translateZ(65px)]">
              <span className="text-cambridge/70 text-caption font-bold tracking-widest">
                ICE
              </span>
            </div>
          </div>

          {/* Glow */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-24 h-4 md:w-36 md:h-6 rounded-full bg-cambridge/30 blur-lg" />
        </button>
      )}

      {/* ─── Shatter Phase ──────────────────────────── */}
      {phase === "shatter" && (
        <div className="relative w-48 h-48 md:w-64 md:h-64">
          {Array.from({ length: 20 }).map((_, i) => (
            <Shard key={i} index={i} />
          ))}
        </div>
      )}

      {/* ─── Character Phase ────────────────────────── */}
      {phase === "character" && (
        <div className="flex flex-col items-center animate-[character-enter_0.6s_cubic-bezier(0.34,1.56,0.64,1)_forwards]">
          <div className="text-[5rem] md:text-[8rem] leading-none">🧊</div>
          <p className="mt-4 text-h3 font-bold text-cambridge text-center">
            Let&apos;s Break the Ice!
          </p>
        </div>
      )}

      {/* ─── Game Phase ─────────────────────────────── */}
      {phase === "game" && (
        <div className="flex flex-col items-center w-full max-w-2xl animate-[card-deal_0.5s_ease-out_forwards]">
          {/* Question Card */}
          <div className="
            w-full p-8 md:p-12 lg:p-16
            bg-bg-secondary border border-border-primary
            rounded-[var(--radius-lg)]
            shadow-[var(--shadow-lg)]
            text-center
          ">
            <p className="text-overline text-cambridge mb-6">Icebreaker</p>
            <p className="text-h2 md:text-display font-bold leading-tight">
              {questions[currentQ]}
            </p>
          </div>

          {/* Controls */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={nextQuestion}
              className="
                inline-flex items-center px-8 py-4
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body
                rounded-[var(--radius-md)]
                transition-colors cursor-pointer
                active:scale-95 transition-transform
              "
            >
              Next Question →
            </button>
          </div>

          {/* Back link */}
          <Link
            href="/"
            className="mt-8 text-caption text-text-tertiary hover:text-text-secondary transition-colors"
          >
            ← Back to medinachamber.com
          </Link>
        </div>
      )}
    </div>
  );
}
