"use client";

import Link from "next/link";

/**
 * A mysterious floating 3D ice cube that links to /icebreaker.
 * No label, no tooltip — just a glowing, slowly rotating cube
 * that rewards the curious.
 *
 * Uses pure CSS transforms + animations. No Three.js needed.
 */
export function IceCube() {
  return (
    <Link
      href="/icebreaker"
      className="group block w-16 h-16 perspective-[200px] cursor-pointer"
      aria-label="Icebreaker"
    >
      <div
        className="
          relative w-full h-full
          [transform-style:preserve-3d]
          animate-[cube-spin_12s_linear_infinite]
          group-hover:animate-[cube-spin_3s_linear_infinite]
          transition-all
        "
      >
        {/* Front */}
        <div className="absolute inset-0 bg-cambridge/20 border border-cambridge/40 backdrop-blur-sm rounded-sm [transform:translateZ(32px)]" />
        {/* Back */}
        <div className="absolute inset-0 bg-cambridge/15 border border-cambridge/30 backdrop-blur-sm rounded-sm [transform:rotateY(180deg)_translateZ(32px)]" />
        {/* Left */}
        <div className="absolute inset-0 bg-cambridge/15 border border-cambridge/30 backdrop-blur-sm rounded-sm [transform:rotateY(-90deg)_translateZ(32px)]" />
        {/* Right */}
        <div className="absolute inset-0 bg-cambridge/20 border border-cambridge/40 backdrop-blur-sm rounded-sm [transform:rotateY(90deg)_translateZ(32px)]" />
        {/* Top */}
        <div className="absolute inset-0 bg-cambridge/25 border border-cambridge/50 backdrop-blur-sm rounded-sm [transform:rotateX(90deg)_translateZ(32px)]" />
        {/* Bottom */}
        <div className="absolute inset-0 bg-cambridge/10 border border-cambridge/20 backdrop-blur-sm rounded-sm [transform:rotateX(-90deg)_translateZ(32px)]" />
      </div>

      {/* Glow underneath */}
      <div className="
        absolute -bottom-3 left-1/2 -translate-x-1/2
        w-12 h-3 rounded-full
        bg-cambridge/30 blur-md
        group-hover:bg-cambridge/50
        transition-all
      " />
    </Link>
  );
}
