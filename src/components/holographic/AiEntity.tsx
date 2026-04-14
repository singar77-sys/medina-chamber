"use client";

type SceneState = "idle" | "listening" | "thinking" | "responding";

interface AiEntityProps {
  state?: SceneState;
  className?: string;
}

/**
 * Abstract "AI entity" — a glowing core surrounded by three concentric
 * geometric rings that rotate at different speeds and axes. No character
 * anatomy, just pure futurism. Built to evoke a holographic intelligence.
 * All animation is CSS. Swap me for a real character image later if desired.
 */
export function AiEntity({ state = "idle", className = "" }: AiEntityProps) {
  // Speed multipliers based on state
  const pulseSpeed = {
    idle: "4s",
    listening: "3s",
    thinking: "1.5s",
    responding: "2s",
  }[state];

  const ringBoost = {
    idle: 1,
    listening: 1.1,
    thinking: 1.6,
    responding: 1.3,
  }[state];

  return (
    <div
      className={`relative ${className}`}
      style={{
        animationDuration: pulseSpeed,
        ["--ring-boost" as string]: ringBoost.toString(),
      }}
    >
      {/* Outer aura */}
      <div
        className="
          absolute inset-0 rounded-full
          bg-[radial-gradient(circle_at_center,rgba(131,188,169,0.35)_0%,rgba(131,188,169,0.1)_40%,transparent_70%)]
          animate-[aura-pulse_var(--pulse-speed,4s)_ease-in-out_infinite]
          blur-xl
        "
        style={{ ["--pulse-speed" as string]: pulseSpeed }}
      />

      {/* Ring 1 — large, slow, tilted */}
      <div
        className="
          absolute inset-0 rounded-full
          border border-cambridge/30
          animate-[ring-spin-slow_24s_linear_infinite]
        "
        style={{ transform: "rotateX(65deg)" }}
      />

      {/* Ring 2 — medium, faster, counter-rotation */}
      <div
        className="
          absolute inset-[8%] rounded-full
          border border-cambridge/40
          animate-[ring-spin-reverse_18s_linear_infinite]
        "
        style={{ transform: "rotateY(60deg) rotateZ(15deg)" }}
      />

      {/* Ring 3 — small, fastest, flat */}
      <div
        className="
          absolute inset-[18%] rounded-full
          border border-cambridge/50
          animate-[ring-spin-slow_12s_linear_infinite]
        "
        style={{ transform: "rotateX(25deg) rotateZ(-10deg)" }}
      />

      {/* Core glow */}
      <div
        className="
          absolute inset-[30%] rounded-full
          bg-[radial-gradient(circle_at_30%_30%,#b8e5d6_0%,#83BCA9_30%,#005450_100%)]
          shadow-[0_0_80px_rgba(131,188,169,0.6)]
          animate-[core-pulse_var(--pulse-speed,4s)_ease-in-out_infinite]
        "
        style={{ ["--pulse-speed" as string]: pulseSpeed }}
      />

      {/* Core inner highlight — the "iris" */}
      <div
        className="
          absolute inset-[36%] rounded-full
          bg-[radial-gradient(circle_at_35%_35%,#ffffff_0%,#e0f4eb_20%,transparent_60%)]
          mix-blend-screen
        "
      />

      {/* Center pinpoint */}
      <div
        className="
          absolute inset-[46%] rounded-full
          bg-white
          shadow-[0_0_20px_rgba(255,255,255,0.9),0_0_40px_rgba(131,188,169,0.8)]
          animate-[core-bright_var(--pulse-speed,4s)_ease-in-out_infinite]
        "
        style={{ ["--pulse-speed" as string]: pulseSpeed }}
      />

      {/* Orbit dots — three small particles orbiting at different radii */}
      <div className="absolute inset-0 animate-[orbit-fast_8s_linear_infinite]">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cambridge shadow-[0_0_8px_#83BCA9]" />
      </div>
      <div className="absolute inset-[6%] animate-[orbit-slow_14s_linear_infinite_reverse]">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
      </div>
      <div className="absolute inset-[12%] animate-[orbit-fast_10s_linear_infinite]">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cambridge/80 shadow-[0_0_8px_#83BCA9]" />
      </div>
    </div>
  );
}
