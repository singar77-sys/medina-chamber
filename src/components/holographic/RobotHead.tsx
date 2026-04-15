/**
 * RobotHead — static, avatar-sized version of the RobotCharacter head.
 *
 * Used for small-footprint places that need the ChamberBot mascot:
 *   - ChatWidget header avatar
 *   - ChatWidget floating toggle button
 *   - Anywhere an icon-sized brand mark is needed
 *
 * Intentionally static — no mouse tracking, no animations, no state. The
 * full animated version lives in RobotCharacter.tsx and should be used on
 * the homepage where it has room to breathe.
 */

interface RobotHeadProps {
  className?: string;
  /** Defaults to "ChamberBot". Pass empty string for purely decorative. */
  ariaLabel?: string;
}

export function RobotHead({
  className = "",
  ariaLabel = "ChamberBot",
}: RobotHeadProps) {
  return (
    <svg
      viewBox="70 15 260 260"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role={ariaLabel ? "img" : "presentation"}
      aria-label={ariaLabel || undefined}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <defs>
        <linearGradient id="rh-headGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8eef5" />
        </linearGradient>

        <linearGradient id="rh-visorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0C1B33" />
          <stop offset="50%" stopColor="#1a3458" />
          <stop offset="100%" stopColor="#0C1B33" />
        </linearGradient>

        <radialGradient id="rh-glowGrad">
          <stop offset="0%" stopColor="#b8e5d6" />
          <stop offset="50%" stopColor="#83BCA9" />
          <stop offset="100%" stopColor="#005450" />
        </radialGradient>

        <radialGradient id="rh-eyeGrad">
          <stop offset="0%" stopColor="#e0f4ff" />
          <stop offset="30%" stopColor="#6eccff" />
          <stop offset="100%" stopColor="#1e6bb8" />
        </radialGradient>
      </defs>

      {/* ─── Antenna ─── */}
      <g>
        <line
          x1="200"
          y1="80"
          x2="200"
          y2="45"
          stroke="#0C1B33"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="200" cy="40" r="14" fill="url(#rh-glowGrad)" />
        <circle cx="200" cy="40" r="8" fill="#ffffff" opacity="0.8" />
        <circle cx="197" cy="37" r="3" fill="#ffffff" />
      </g>

      {/* Neck connector */}
      <rect x="185" y="78" width="30" height="12" rx="3" fill="#c5d0dc" stroke="#0C1B33" strokeWidth="3" />
      <rect x="188" y="82" width="24" height="4" rx="1" fill="#0C1B33" opacity="0.5" />

      {/* ─── Head ─── */}
      <g>
        <rect
          x="100"
          y="90"
          width="200"
          height="170"
          rx="45"
          fill="url(#rh-headGrad)"
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
        <rect x="95" y="162" width="8" height="3" fill="#83BCA9" />
        <rect x="95" y="170" width="8" height="3" fill="#83BCA9" opacity="0.6" />
        <rect x="95" y="178" width="8" height="3" fill="#83BCA9" opacity="0.4" />

        <rect x="294" y="155" width="14" height="40" rx="4" fill="#0C1B33" />
        <rect x="297" y="162" width="8" height="3" fill="#83BCA9" />
        <rect x="297" y="170" width="8" height="3" fill="#83BCA9" opacity="0.6" />
        <rect x="297" y="178" width="8" height="3" fill="#83BCA9" opacity="0.4" />

        {/* Visor */}
        <rect
          x="125"
          y="135"
          width="150"
          height="75"
          rx="35"
          fill="url(#rh-visorGrad)"
          stroke="#0C1B33"
          strokeWidth="5"
        />
        <rect x="133" y="143" width="134" height="3" rx="1.5" fill="#ffffff" opacity="0.3" />

        {/* Left eye */}
        <g>
          <circle cx="165" cy="172" r="18" fill="url(#rh-eyeGrad)" />
          <circle cx="165" cy="172" r="10" fill="#0C1B33" />
          <circle cx="168" cy="168" r="4" fill="#ffffff" />
          <circle cx="161" cy="175" r="2" fill="#ffffff" opacity="0.7" />
        </g>

        {/* Right eye */}
        <g>
          <circle cx="235" cy="172" r="18" fill="url(#rh-eyeGrad)" />
          <circle cx="235" cy="172" r="10" fill="#0C1B33" />
          <circle cx="238" cy="168" r="4" fill="#ffffff" />
          <circle cx="231" cy="175" r="2" fill="#ffffff" opacity="0.7" />
        </g>

        {/* Cheek blush */}
        <ellipse cx="140" cy="225" rx="12" ry="4" fill="#ffc0c9" opacity="0.5" />
        <ellipse cx="260" cy="225" rx="12" ry="4" fill="#ffc0c9" opacity="0.5" />

        {/* Mouth — static smile */}
        <path
          d="M 178 232 Q 200 244 222 232"
          stroke="#0C1B33"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
