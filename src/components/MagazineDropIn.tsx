"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const SESSION_KEY = "mag-drop-dismissed";

export function MagazineDropIn() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY)) {
      return;
    }
    const t = setTimeout(() => setVisible(true), 2200);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setDismissed(true);
    sessionStorage.setItem(SESSION_KEY, "1");
  }

  if (dismissed) return null;

  return (
    /*
     * Perspective wrapper — fixed just below the nav bar (top: 6rem matches
     * the global "clear the site header" offset). The inner card uses
     * rotateX with transformOrigin at its top edge, so it reads as a
     * hinged flap that swings open from the nav bar downward.
     */
    <div
      className="fixed right-6 z-40 w-64"
      style={{ top: "6rem", perspective: "900px", visibility: visible ? "visible" : "hidden" }}
      role="complementary"
      aria-label="Magazine announcement"
    >
      {/* Hinge strip — a thin bar at the very top that stays visible
          even during the swing, selling the "attached to the nav" illusion */}
      <div
        className="h-[3px] rounded-t-sm mx-3"
        style={{
          background: "linear-gradient(90deg, transparent, var(--cambridge), transparent)",
          opacity: visible ? 0.6 : 0,
          transition: "opacity 0.2s ease 0.15s",
        }}
      />

      {/* Card — swings open from rotateX(-90deg) → rotateX(0deg).
          cubic-bezier(0.34, 1.56, 0.64, 1) is a spring curve: it
          overshoots slightly past 0 then snaps back, like a real hinge
          with a bit of weight behind it. */}
      <div
        style={{
          transformOrigin: "top center",
          // Reduced-motion: no hinge swing — the card simply fades in.
          transform: reduced ? "none" : visible ? "rotateX(0deg)" : "rotateX(-90deg)",
          opacity: visible ? 1 : 0,
          transition: reduced
            ? "opacity 0.3s ease"
            : visible
              ? "transform 0.72s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.55s ease 0.15s"
              : "none",
          backfaceVisibility: "hidden",
        }}
        className="bg-oxford/70 backdrop-blur-md text-white rounded-b-[var(--radius-lg)] rounded-tr-[var(--radius-lg)] border border-white/15 shadow-[0_28px_72px_rgba(0,0,0,0.35)]"
      >
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-white/35 hover:text-white/75 transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
            <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="p-5 pr-8">
          {/* Wordmark */}
          <p className="font-display font-bold uppercase leading-none tracking-tight">
            <span className="block text-[1.1rem] text-white">Medina</span>
            <span className="block text-[0.82rem] text-white mt-0.5">Means</span>
            <span
              className="block font-script normal-case leading-[0.88] -mt-[0.06em]"
              style={{ fontSize: "1.28rem", color: "var(--coquelicot)" }}
            >
              business
            </span>
          </p>

          <p className="text-[0.775rem] text-white/60 leading-relaxed mt-3 mb-4">
            The latest issue is out. Read what&apos;s moving Medina County forward.
          </p>

          <Link
            href="/news/magazine"
            onClick={dismiss}
            className="
              flex items-center justify-center gap-1.5
              w-full py-2.5 px-4
              bg-accent hover:bg-accent-hover
              text-white font-bold text-[0.8rem]
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            Read the Magazine →
          </Link>
        </div>
      </div>
    </div>
  );
}
