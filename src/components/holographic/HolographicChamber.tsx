"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ParticleField } from "./ParticleField";
import { HudFrame } from "./HudFrame";
import { RobotCharacter } from "./RobotCharacter";

type SceneState = "idle" | "listening" | "thinking" | "responding";

const SUGGESTIONS = [
  "Find a local plumber",
  "When is the next event?",
  "How much does membership cost?",
  "Who does commercial printing?",
];

/**
 * The Holographic Chamber — an immersive scene for the ChamberBot AI.
 * Replaces the old static mascot/prompt with a reactive environment:
 * particle field, HUD frame, abstract AI entity with rotating rings,
 * mouse-tracking parallax, and state-driven reactivity.
 */
export function HolographicChamber() {
  const [sceneState, setSceneState] = useState<SceneState>("idle");
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [inputValue, setInputValue] = useState("");
  const sceneRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /** Mouse parallax — update CSS custom properties on mousemove. */
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const prefersReducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    // Capture non-null reference for the closures
    const scene: HTMLDivElement = el;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onMove = (e: MouseEvent) => {
      const rect = scene.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      targetX = (e.clientX - cx) / rect.width;
      targetY = (e.clientY - cy) / rect.height;
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      scene.style.setProperty("--mx", currentX.toFixed(3));
      scene.style.setProperty("--my", currentY.toFixed(3));
      raf = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMove);
    animate();

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || sceneState === "thinking") return;

    setQuery(q);
    setAnswer("");
    setSceneState("thinking");
    setInputValue("");

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: q }],
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let first = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (first) {
          setSceneState("responding");
          first = false;
        }
        const chunk = decoder.decode(value, { stream: true });
        setAnswer((prev) => prev + chunk);
      }

      setSceneState("idle");
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      setAnswer(
        "Connection disrupted. Try the chat widget in the corner instead.",
      );
      setSceneState("idle");
    }
  }, [sceneState]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(inputValue);
  }

  const statusLabel = {
    idle: "IDLE",
    listening: "LISTENING",
    thinking: "PROCESSING",
    responding: "TRANSMITTING",
  }[sceneState];

  return (
    <section className="relative mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      <div className="max-w-2xl mx-auto text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cambridge/10 border border-cambridge/20 rounded-full mb-5">
          <span className="w-2 h-2 bg-cambridge rounded-full animate-pulse" />
          <span className="text-caption font-bold text-cambridge font-mono uppercase tracking-wider">
            AI · Powered
          </span>
        </div>
        <h2 className="text-h2">Ask the Chamber anything</h2>
        <p className="text-body-sm text-text-tertiary mt-3 max-w-lg mx-auto">
          ChamberBot knows every member, event, and program. Type a question
          below — or ask something from the list.
        </p>
      </div>

      {/* The Chamber */}
      <div
        ref={sceneRef}
        className="
          relative mx-auto max-w-5xl aspect-[16/10] sm:aspect-[16/9]
          rounded-[var(--radius-lg)] overflow-hidden
          bg-oxford
          border border-cambridge/20
          shadow-[0_20px_60px_rgba(12,27,51,0.25)]
        "
        style={{
          ["--mx" as string]: "0",
          ["--my" as string]: "0",
        }}
      >
        {/* Deep background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(131,188,169,0.08)_0%,rgba(12,27,51,1)_70%)]" />

        {/* Circuit grid backdrop */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(131,188,169,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(131,188,169,0.15) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          }}
        />

        {/* Particle field */}
        <div
          className="absolute inset-0"
          style={{
            transform: "translate3d(calc(var(--mx) * -15px), calc(var(--my) * -15px), 0)",
          }}
        >
          <ParticleField
            count={70}
            intensity={sceneState}
            color="#83BCA9"
            className="w-full h-full"
          />
        </div>

        {/* Scanning line overlay */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="scan-line absolute left-0 right-0 h-[2px] bg-gradient-to-b from-transparent via-cambridge/50 to-transparent" />
        </div>

        {/* Robot Character — the star */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform:
              "translate3d(calc(var(--mx) * -30px), calc(var(--my) * -30px), 0)",
          }}
        >
          <RobotCharacter
            state={sceneState}
            className="w-56 sm:w-72 lg:w-80"
          />
        </div>

        {/* Side data readouts (responsive — hidden on small) */}
        <div className="hidden md:block absolute left-6 top-1/2 -translate-y-1/2 font-mono text-[10px] text-cambridge/60 uppercase leading-relaxed tracking-wider">
          <div className="mb-1 text-cambridge/80">&gt; NETWORK</div>
          <div>511 MEMBERS</div>
          <div>9 COMMITTEES</div>
          <div>30+ EVENTS</div>
          <div>EST. 1938</div>
        </div>

        <div className="hidden md:block absolute right-6 top-1/2 -translate-y-1/2 font-mono text-[10px] text-cambridge/60 uppercase leading-relaxed tracking-wider text-right">
          <div className="mb-1 text-cambridge/80">&gt; REGION</div>
          <div>MEDINA COUNTY</div>
          <div>NORTHEAST OHIO</div>
          <div>44256</div>
          <div>41.1382°N</div>
        </div>

        {/* HUD frame + status */}
        <HudFrame status={statusLabel} />

        {/* Active query display — shows current question above the entity */}
        {query && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 font-mono text-[11px] sm:text-xs text-cambridge max-w-[80%] text-center">
            <span className="text-cambridge/60">&gt; </span>
            <span className="text-cambridge">{query}</span>
          </div>
        )}

        {/* Streaming response display — shows over the entity */}
        {answer && (
          <div className="absolute bottom-14 left-6 right-6 sm:left-16 sm:right-16 max-h-[40%] overflow-y-auto">
            <div className="p-3 sm:p-4 bg-cambridge/5 border border-cambridge/20 rounded-[var(--radius-md)] backdrop-blur-sm">
              <p className="text-body-sm text-cambridge/90 leading-relaxed whitespace-pre-wrap font-mono">
                {answer}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Console input (below the chamber) */}
      <div className="max-w-3xl mx-auto mt-6">
        <form onSubmit={handleSubmit} className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-cambridge font-mono text-sm pointer-events-none select-none">
            &gt;
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask ChamberBot anything…"
            disabled={sceneState === "thinking"}
            className="
              w-full pl-10 pr-14 py-4
              bg-bg-primary border border-border-primary
              rounded-[var(--radius-lg)]
              text-text-primary placeholder:text-text-tertiary
              font-mono text-body
              focus:outline-none
              focus:ring-2 focus:ring-cambridge/40 focus:border-cambridge
              shadow-sm transition-all
              disabled:opacity-60
            "
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || sceneState === "thinking"}
            aria-label="Transmit"
            className="
              absolute right-3 top-1/2 -translate-y-1/2
              w-10 h-10 flex items-center justify-center
              bg-oxford hover:bg-oxford/80 disabled:opacity-40
              text-white rounded-[var(--radius-md)]
              transition-colors
            "
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </form>

        {/* Quick suggestion chips */}
        {!answer && sceneState !== "thinking" && (
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="
                  px-3 py-1.5 text-caption font-bold font-mono
                  bg-bg-primary border border-border-secondary
                  text-text-tertiary hover:text-cambridge hover:border-cambridge/40
                  rounded-full transition-colors
                "
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Reset link after response */}
        {answer && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setAnswer("");
                setQuery("");
                setSceneState("idle");
              }}
              className="text-caption text-cambridge hover:text-cambridge/80 font-bold font-mono transition-colors"
            >
              [ ask another question ]
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
