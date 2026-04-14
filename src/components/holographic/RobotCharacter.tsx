"use client";

import { useEffect, useRef } from "react";

type SceneState = "idle" | "listening" | "thinking" | "responding";

interface RobotCharacterProps {
  state?: SceneState;
  className?: string;
}

/**
 * Cartoon robot character built from pure SVG primitives.
 *
 * Behaviors:
 * - Floats up/down (idle breathing)
 * - Eyes follow mouse cursor (with a small max offset)
 * - Blinks every ~6s, winks occasionally
 * - Antenna ball pulses; wobbles sideways during "thinking"
 * - Chest core + LED indicators pulse
 * - Left arm waves every ~12s during idle
 * - Mouth opens/closes while "responding"
 * - Thinking dots appear above head during "thinking"
 * - Holds an "AI" chip in right hand (glowing outline)
 * - Floating hover disc with pulsing lights
 */
export function RobotCharacter({
  state = "idle",
  className = "",
}: RobotCharacterProps) {
  const pulseSpeed = {
    idle: "3s",
    listening: "2.5s",
    thinking: "1s",
    responding: "1.5s",
  }[state];

  const svgRef = useRef<SVGSVGElement>(null);
  const leftPupilRef = useRef<SVGGElement>(null);
  const rightPupilRef = useRef<SVGGElement>(null);

  /** Mouse-follow eyes — direct SVG attribute mutation for zero re-renders. */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const leftEl = leftPupilRef.current;
    const rightEl = rightPupilRef.current;
    if (!leftEl || !rightEl) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const MAX_OFFSET = 4; // pixels in SVG coords

    const onMove = (e: MouseEvent) => {
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 3; // bias toward head area
      const dx = (e.clientX - cx) / (rect.width / 1.5);
      const dy = (e.clientY - cy) / (rect.height / 1.5);
      targetX = Math.max(-1, Math.min(1, dx)) * MAX_OFFSET;
      targetY = Math.max(-1, Math.min(1, dy)) * MAX_OFFSET;
    };

    const animate = () => {
      // Smooth easing toward target
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;
      const t = `translate(${currentX.toFixed(2)} ${currentY.toFixed(2)})`;
      leftEl.setAttribute("transform", t);
      rightEl.setAttribute("transform", t);
      raf = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMove);
    animate();

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const isThinking = state === "thinking";
  const isResponding = state === "responding";

  return (
    <div
      className={`relative ${className}`}
      style={{ ["--robot-pulse" as string]: pulseSpeed }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 400 560"
        className="w-full h-full robot-float"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ChamberBot — friendly AI assistant robot"
      >
        <defs>
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f4f8fc" />
            <stop offset="100%" stopColor="#dfe7f0" />
          </linearGradient>

          <linearGradient id="headGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e8eef5" />
          </linearGradient>

          <linearGradient id="visorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0C1B33" />
            <stop offset="50%" stopColor="#1a3458" />
            <stop offset="100%" stopColor="#0C1B33" />
          </linearGradient>

          <radialGradient id="glowGrad">
            <stop offset="0%" stopColor="#b8e5d6" />
            <stop offset="50%" stopColor="#83BCA9" />
            <stop offset="100%" stopColor="#005450" />
          </radialGradient>

          <radialGradient id="eyeGrad">
            <stop offset="0%" stopColor="#e0f4ff" />
            <stop offset="30%" stopColor="#6eccff" />
            <stop offset="100%" stopColor="#1e6bb8" />
          </radialGradient>
        </defs>

        {/* Floating shadow */}
        <ellipse
          cx="200"
          cy="530"
          rx="100"
          ry="10"
          fill="#83BCA9"
          opacity="0.3"
          className="robot-shadow"
        />

        {/* ─── Thinking dots (above head) ─── */}
        {isThinking && (
          <g className="robot-think-dots">
            <circle cx="250" cy="20" r="5" fill="#83BCA9" className="robot-think-dot-1" />
            <circle cx="270" cy="20" r="5" fill="#83BCA9" className="robot-think-dot-2" />
            <circle cx="290" cy="20" r="5" fill="#83BCA9" className="robot-think-dot-3" />
          </g>
        )}

        {/* ─── Antenna ─── */}
        <g
          className={`robot-antenna-group ${isThinking ? "robot-antenna-wobble" : ""}`}
          style={{ transformOrigin: "200px 80px", transformBox: "fill-box" }}
        >
          <line
            x1="200"
            y1="80"
            x2="200"
            y2="45"
            stroke="#0C1B33"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="200" cy="40" r="14" fill="url(#glowGrad)" className="robot-antenna-pulse" />
          <circle cx="200" cy="40" r="8" fill="#ffffff" opacity="0.8" />
          <circle cx="197" cy="37" r="3" fill="#ffffff" />
        </g>

        {/* Neck connector */}
        <rect x="185" y="78" width="30" height="12" rx="3" fill="#c5d0dc" stroke="#0C1B33" strokeWidth="3" />
        <rect x="188" y="82" width="24" height="4" rx="1" fill="#0C1B33" opacity="0.5" />

        {/* ─── Head ─── */}
        <g className="robot-head">
          <rect
            x="100"
            y="90"
            width="200"
            height="170"
            rx="45"
            fill="url(#headGrad)"
            stroke="#0C1B33"
            strokeWidth="5"
          />
          <path
            d="M 145 105 Q 200 98 255 105"
            stroke="#ffffff"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            opacity="0.9"
          />

          {/* Ear ports */}
          <rect x="92" y="155" width="14" height="40" rx="4" fill="#0C1B33" />
          <rect x="95" y="162" width="8" height="3" fill="#83BCA9" className="robot-led-left" />
          <rect x="95" y="170" width="8" height="3" fill="#83BCA9" opacity="0.6" />
          <rect x="95" y="178" width="8" height="3" fill="#83BCA9" opacity="0.4" />

          <rect x="294" y="155" width="14" height="40" rx="4" fill="#0C1B33" />
          <rect x="297" y="162" width="8" height="3" fill="#83BCA9" className="robot-led-right" />
          <rect x="297" y="170" width="8" height="3" fill="#83BCA9" opacity="0.6" />
          <rect x="297" y="178" width="8" height="3" fill="#83BCA9" opacity="0.4" />

          {/* Visor */}
          <rect
            x="125"
            y="135"
            width="150"
            height="75"
            rx="35"
            fill="url(#visorGrad)"
            stroke="#0C1B33"
            strokeWidth="5"
          />
          <rect x="133" y="143" width="134" height="3" rx="1.5" fill="#ffffff" opacity="0.3" />

          {/* Left eye — outer socket + pupil group (trackable) */}
          <g className="robot-eye robot-eye-left">
            <circle cx="165" cy="172" r="18" fill="url(#eyeGrad)" />
            <g ref={leftPupilRef}>
              <circle cx="165" cy="172" r="10" fill="#0C1B33" />
              <circle cx="168" cy="168" r="4" fill="#ffffff" />
              <circle cx="161" cy="175" r="2" fill="#ffffff" opacity="0.7" />
            </g>
          </g>

          {/* Right eye */}
          <g className="robot-eye robot-eye-right">
            <circle cx="235" cy="172" r="18" fill="url(#eyeGrad)" />
            <g ref={rightPupilRef}>
              <circle cx="235" cy="172" r="10" fill="#0C1B33" />
              <circle cx="238" cy="168" r="4" fill="#ffffff" />
              <circle cx="231" cy="175" r="2" fill="#ffffff" opacity="0.7" />
            </g>
          </g>

          {/* Cheek blush */}
          <ellipse cx="140" cy="225" rx="12" ry="4" fill="#ffc0c9" opacity="0.5" />
          <ellipse cx="260" cy="225" rx="12" ry="4" fill="#ffc0c9" opacity="0.5" />

          {/* Mouth — two states: smile (default) or talking (responding) */}
          {isResponding ? (
            <ellipse
              cx="200"
              cy="237"
              rx="14"
              ry="7"
              fill="#0C1B33"
              className="robot-mouth-talk"
            />
          ) : (
            <path
              d="M 178 232 Q 200 244 222 232"
              stroke="#0C1B33"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </g>

        {/* ─── Body ─── */}
        <g className="robot-body">
          <rect
            x="120"
            y="270"
            width="160"
            height="160"
            rx="32"
            fill="url(#bodyGrad)"
            stroke="#0C1B33"
            strokeWidth="5"
          />
          <rect
            x="140"
            y="290"
            width="120"
            height="100"
            rx="18"
            fill="#f0f4f9"
            stroke="#0C1B33"
            strokeWidth="3"
          />

          <circle cx="200" cy="340" r="28" fill="url(#glowGrad)" className="robot-chest-pulse" />
          <circle cx="200" cy="340" r="18" fill="#ffffff" opacity="0.5" />
          <circle cx="200" cy="340" r="8" fill="#ffffff" />

          <circle cx="175" cy="405" r="4" fill="#83BCA9" className="robot-indicator-1" />
          <circle cx="200" cy="405" r="4" fill="#83BCA9" className="robot-indicator-2" />
          <circle cx="225" cy="405" r="4" fill="#83BCA9" className="robot-indicator-3" />
        </g>

        {/* ─── Left arm (waving) ─── */}
        <g
          className="robot-arm-wave"
          style={{ transformOrigin: "95px 290px", transformBox: "fill-box" }}
        >
          <rect
            x="75"
            y="290"
            width="40"
            height="100"
            rx="18"
            fill="url(#bodyGrad)"
            stroke="#0C1B33"
            strokeWidth="5"
          />
          <circle cx="95" cy="400" r="22" fill="url(#bodyGrad)" stroke="#0C1B33" strokeWidth="5" />
          <circle cx="95" cy="290" r="8" fill="#c5d0dc" stroke="#0C1B33" strokeWidth="3" />
        </g>

        {/* ─── Right arm (holding AI chip) ─── */}
        <g>
          <rect
            x="285"
            y="280"
            width="40"
            height="90"
            rx="18"
            fill="url(#bodyGrad)"
            stroke="#0C1B33"
            strokeWidth="5"
          />
          <circle cx="305" cy="380" r="22" fill="url(#bodyGrad)" stroke="#0C1B33" strokeWidth="5" />
          <circle cx="305" cy="280" r="8" fill="#c5d0dc" stroke="#0C1B33" strokeWidth="3" />

          <g className="robot-chip">
            <rect
              x="285"
              y="355"
              width="52"
              height="50"
              rx="6"
              fill="#0C1B33"
              stroke="#83BCA9"
              strokeWidth="2"
            />
            <rect x="290" y="352" width="4" height="4" fill="#0C1B33" />
            <rect x="298" y="352" width="4" height="4" fill="#0C1B33" />
            <rect x="306" y="352" width="4" height="4" fill="#0C1B33" />
            <rect x="314" y="352" width="4" height="4" fill="#0C1B33" />
            <rect x="322" y="352" width="4" height="4" fill="#0C1B33" />
            <rect x="330" y="352" width="4" height="4" fill="#0C1B33" />
            <rect x="290" y="404" width="4" height="4" fill="#0C1B33" />
            <rect x="298" y="404" width="4" height="4" fill="#0C1B33" />
            <rect x="306" y="404" width="4" height="4" fill="#0C1B33" />
            <rect x="314" y="404" width="4" height="4" fill="#0C1B33" />
            <rect x="322" y="404" width="4" height="4" fill="#0C1B33" />
            <rect x="330" y="404" width="4" height="4" fill="#0C1B33" />
            <text
              x="311"
              y="388"
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontWeight="900"
              fontSize="18"
              fill="#83BCA9"
            >
              AI
            </text>
            <rect
              x="285"
              y="355"
              width="52"
              height="50"
              rx="6"
              fill="none"
              stroke="#83BCA9"
              strokeWidth="3"
              opacity="0.5"
              className="robot-chip-glow"
            />
          </g>
        </g>

        {/* ─── Hover base ─── */}
        <g>
          <ellipse cx="200" cy="450" rx="60" ry="15" fill="#c5d0dc" stroke="#0C1B33" strokeWidth="4" />
          <ellipse cx="200" cy="447" rx="50" ry="10" fill="url(#bodyGrad)" opacity="0.8" />
          <circle cx="165" cy="452" r="4" fill="#83BCA9" className="robot-hover-1" />
          <circle cx="200" cy="454" r="4" fill="#83BCA9" className="robot-hover-2" />
          <circle cx="235" cy="452" r="4" fill="#83BCA9" className="robot-hover-3" />
        </g>
      </svg>
    </div>
  );
}
