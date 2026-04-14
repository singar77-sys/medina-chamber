"use client";

/**
 * Sci-fi HUD frame — four corner brackets that draw in on mount.
 * Plus live status text and geometric accents. Pure SVG, no JS loops.
 */
export function HudFrame({
  status = "IDLE",
  className = "",
}: {
  status?: string;
  className?: string;
}) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      {/* Corner brackets */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Top-left */}
        <path
          d="M 2 12 L 2 2 L 12 2"
          fill="none"
          stroke="var(--cambridge)"
          strokeWidth="0.3"
          vectorEffect="non-scaling-stroke"
          className="hud-draw"
          style={{ animationDelay: "0ms" }}
        />
        {/* Top-right */}
        <path
          d="M 88 2 L 98 2 L 98 12"
          fill="none"
          stroke="var(--cambridge)"
          strokeWidth="0.3"
          vectorEffect="non-scaling-stroke"
          className="hud-draw"
          style={{ animationDelay: "120ms" }}
        />
        {/* Bottom-left */}
        <path
          d="M 2 88 L 2 98 L 12 98"
          fill="none"
          stroke="var(--cambridge)"
          strokeWidth="0.3"
          vectorEffect="non-scaling-stroke"
          className="hud-draw"
          style={{ animationDelay: "240ms" }}
        />
        {/* Bottom-right */}
        <path
          d="M 88 98 L 98 98 L 98 88"
          fill="none"
          stroke="var(--cambridge)"
          strokeWidth="0.3"
          vectorEffect="non-scaling-stroke"
          className="hud-draw"
          style={{ animationDelay: "360ms" }}
        />
      </svg>

      {/* Top-left status readout */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 font-mono text-[9px] sm:text-[10px] tracking-widest text-cambridge/80 uppercase leading-tight">
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-cambridge animate-pulse" />
          <span>CHAMBER.AI</span>
        </div>
        <div className="mt-0.5 text-cambridge/50">v1.0.0</div>
      </div>

      {/* Top-right status */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 font-mono text-[9px] sm:text-[10px] tracking-widest text-cambridge/80 uppercase text-right leading-tight">
        <div>STATUS: {status}</div>
        <div className="mt-0.5 text-cambridge/50">SECURE LINK</div>
      </div>

      {/* Bottom-left readout */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 font-mono text-[9px] sm:text-[10px] tracking-widest text-cambridge/50 uppercase">
        511 NODES · 9 CHANNELS
      </div>

      {/* Bottom-right readout */}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 font-mono text-[9px] sm:text-[10px] tracking-widest text-cambridge/50 uppercase">
        GMC.NET // MEDINA
      </div>
    </div>
  );
}
