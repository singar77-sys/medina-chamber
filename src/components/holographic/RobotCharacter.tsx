"use client";

type SceneState = "idle" | "listening" | "thinking" | "responding";

interface RobotCharacterProps {
  state?: SceneState;
  className?: string;
}

/**
 * Cartoon robot character built from pure SVG primitives.
 * Friendly, recognizable, boomer-approved. No raster images needed.
 *
 * Animations:
 * - Whole body floats up/down
 * - Antenna ball pulses (power indicator)
 * - Eyes blink every 5-7s
 * - Chest core pulses (breathing)
 * - Holds an "AI" chip that pulses
 * - State-reactive: thinking = faster pulses, responding = bright chest
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

  return (
    <div
      className={`relative ${className}`}
      style={{ ["--robot-pulse" as string]: pulseSpeed }}
    >
      <svg
        viewBox="0 0 400 520"
        className="w-full h-full robot-float"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ChamberBot — friendly AI assistant robot"
      >
        <defs>
          {/* Body gradient — soft white with subtle blue shading */}
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f4f8fc" />
            <stop offset="100%" stopColor="#dfe7f0" />
          </linearGradient>

          {/* Head gradient */}
          <linearGradient id="headGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e8eef5" />
          </linearGradient>

          {/* Glass visor — dark with blue inner */}
          <linearGradient id="visorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0C1B33" />
            <stop offset="50%" stopColor="#1a3458" />
            <stop offset="100%" stopColor="#0C1B33" />
          </linearGradient>

          {/* Cambridge teal glow for chest + antenna */}
          <radialGradient id="glowGrad">
            <stop offset="0%" stopColor="#b8e5d6" />
            <stop offset="50%" stopColor="#83BCA9" />
            <stop offset="100%" stopColor="#005450" />
          </radialGradient>

          {/* Eye glow — electric blue */}
          <radialGradient id="eyeGrad">
            <stop offset="0%" stopColor="#e0f4ff" />
            <stop offset="30%" stopColor="#6eccff" />
            <stop offset="100%" stopColor="#1e6bb8" />
          </radialGradient>

          {/* Drop shadow filter for body elements */}
          <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
            <feOffset dx="0" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Floating shadow/glow base */}
        <ellipse
          cx="200"
          cy="490"
          rx="100"
          ry="10"
          fill="#83BCA9"
          opacity="0.3"
          className="robot-shadow"
        />

        {/* ─── Antenna ─── */}
        <g className="robot-antenna">
          <line
            x1="200"
            y1="80"
            x2="200"
            y2="45"
            stroke="#0C1B33"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Antenna ball with pulsing glow */}
          <circle cx="200" cy="40" r="14" fill="url(#glowGrad)" className="robot-antenna-pulse" />
          <circle cx="200" cy="40" r="8" fill="#ffffff" opacity="0.8" />
          <circle cx="197" cy="37" r="3" fill="#ffffff" />
        </g>

        {/* ─── Neck connector ─── */}
        <rect x="185" y="78" width="30" height="12" rx="3" fill="#c5d0dc" stroke="#0C1B33" strokeWidth="3" />
        <rect x="188" y="82" width="24" height="4" rx="1" fill="#0C1B33" opacity="0.5" />

        {/* ─── Head ─── */}
        <g className="robot-head">
          {/* Head background shadow */}
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
          {/* Top highlight */}
          <path
            d="M 145 105 Q 200 98 255 105"
            stroke="#ffffff"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            opacity="0.9"
          />

          {/* Ear ports — left */}
          <rect x="92" y="155" width="14" height="40" rx="4" fill="#0C1B33" />
          <rect x="95" y="162" width="8" height="3" fill="#83BCA9" className="robot-led-left" />
          <rect x="95" y="170" width="8" height="3" fill="#83BCA9" opacity="0.6" />
          <rect x="95" y="178" width="8" height="3" fill="#83BCA9" opacity="0.4" />

          {/* Ear ports — right */}
          <rect x="294" y="155" width="14" height="40" rx="4" fill="#0C1B33" />
          <rect x="297" y="162" width="8" height="3" fill="#83BCA9" className="robot-led-right" />
          <rect x="297" y="170" width="8" height="3" fill="#83BCA9" opacity="0.6" />
          <rect x="297" y="178" width="8" height="3" fill="#83BCA9" opacity="0.4" />

          {/* Visor — the "glasses" — one big dark panel that holds both eyes */}
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
          {/* Visor inner highlight bar */}
          <rect x="133" y="143" width="134" height="3" rx="1.5" fill="#ffffff" opacity="0.3" />

          {/* Left eye */}
          <g className="robot-eye">
            <circle cx="165" cy="172" r="18" fill="url(#eyeGrad)" />
            <circle cx="165" cy="172" r="10" fill="#0C1B33" />
            <circle cx="168" cy="168" r="4" fill="#ffffff" />
            <circle cx="161" cy="175" r="2" fill="#ffffff" opacity="0.7" />
          </g>

          {/* Right eye */}
          <g className="robot-eye">
            <circle cx="235" cy="172" r="18" fill="url(#eyeGrad)" />
            <circle cx="235" cy="172" r="10" fill="#0C1B33" />
            <circle cx="238" cy="168" r="4" fill="#ffffff" />
            <circle cx="231" cy="175" r="2" fill="#ffffff" opacity="0.7" />
          </g>

          {/* Cheek blush (subtle friendly touch) */}
          <ellipse cx="140" cy="225" rx="12" ry="4" fill="#ffc0c9" opacity="0.5" />
          <ellipse cx="260" cy="225" rx="12" ry="4" fill="#ffc0c9" opacity="0.5" />

          {/* Mouth — small happy curve */}
          <path
            d="M 178 232 Q 200 244 222 232"
            stroke="#0C1B33"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* ─── Body ─── */}
        <g className="robot-body">
          {/* Torso */}
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
          {/* Chest panel inner */}
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

          {/* Chest core (the "heart" — pulsing glow) */}
          <circle cx="200" cy="340" r="28" fill="url(#glowGrad)" className="robot-chest-pulse" />
          <circle cx="200" cy="340" r="18" fill="#ffffff" opacity="0.5" />
          <circle cx="200" cy="340" r="8" fill="#ffffff" />

          {/* Small indicator lights below the chest core */}
          <circle cx="175" cy="405" r="4" fill="#83BCA9" className="robot-indicator-1" />
          <circle cx="200" cy="405" r="4" fill="#83BCA9" className="robot-indicator-2" />
          <circle cx="225" cy="405" r="4" fill="#83BCA9" className="robot-indicator-3" />
        </g>

        {/* ─── Left arm (plain) ─── */}
        <g>
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
          {/* Hand */}
          <circle cx="95" cy="400" r="22" fill="url(#bodyGrad)" stroke="#0C1B33" strokeWidth="5" />
          {/* Joint accent */}
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
          {/* Hand */}
          <circle cx="305" cy="380" r="22" fill="url(#bodyGrad)" stroke="#0C1B33" strokeWidth="5" />
          {/* Joint accent */}
          <circle cx="305" cy="280" r="8" fill="#c5d0dc" stroke="#0C1B33" strokeWidth="3" />

          {/* AI chip being held */}
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
            {/* Chip pins — top */}
            <rect x="290" y="352" width="4" height="4" fill="#0C1B33" />
            <rect x="298" y="352" width="4" height="4" fill="#0C1B33" />
            <rect x="306" y="352" width="4" height="4" fill="#0C1B33" />
            <rect x="314" y="352" width="4" height="4" fill="#0C1B33" />
            <rect x="322" y="352" width="4" height="4" fill="#0C1B33" />
            <rect x="330" y="352" width="4" height="4" fill="#0C1B33" />
            {/* Chip pins — bottom */}
            <rect x="290" y="404" width="4" height="4" fill="#0C1B33" />
            <rect x="298" y="404" width="4" height="4" fill="#0C1B33" />
            <rect x="306" y="404" width="4" height="4" fill="#0C1B33" />
            <rect x="314" y="404" width="4" height="4" fill="#0C1B33" />
            <rect x="322" y="404" width="4" height="4" fill="#0C1B33" />
            <rect x="330" y="404" width="4" height="4" fill="#0C1B33" />
            {/* AI text */}
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
            {/* Chip glow */}
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

        {/* ─── Base (floating / hovering disc instead of feet) ─── */}
        <g>
          <ellipse cx="200" cy="450" rx="60" ry="15" fill="#c5d0dc" stroke="#0C1B33" strokeWidth="4" />
          <ellipse cx="200" cy="447" rx="50" ry="10" fill="url(#bodyGrad)" opacity="0.8" />
          {/* Hover lights */}
          <circle cx="165" cy="452" r="4" fill="#83BCA9" className="robot-hover-1" />
          <circle cx="200" cy="454" r="4" fill="#83BCA9" className="robot-hover-2" />
          <circle cx="235" cy="452" r="4" fill="#83BCA9" className="robot-hover-3" />
        </g>
      </svg>
    </div>
  );
}
