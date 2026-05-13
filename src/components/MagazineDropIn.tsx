"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const SESSION_KEY = "mag-drop-dismissed";

export function MagazineDropIn() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY)) {
      return;
    }
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setDismissed(true);
    sessionStorage.setItem(SESSION_KEY, "1");
  }

  if (dismissed) return null;

  return (
    <div
      role="complementary"
      aria-label="Magazine announcement"
      className={[
        "fixed bottom-6 right-6 z-50 w-72",
        "bg-oxford text-white",
        "rounded-[var(--radius-lg)]",
        "border border-white/10",
        "shadow-[0_24px_64px_rgba(0,0,0,0.45)]",
        "transition-all duration-500 ease-out",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-6 opacity-0 pointer-events-none",
      ].join(" ")}
    >
      {/* Dismiss */}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <div className="p-5 pr-8">
        {/* Eyebrow */}
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cambridge mb-3">
          Next Level Thinking
        </p>

        {/* Wordmark */}
        <p className="font-display font-bold uppercase leading-none tracking-tight text-white">
          <span className="block text-[1.15rem]">Medina</span>
          <span className="block text-[0.85rem] mt-0.5">Means</span>
          <span
            className="block font-script normal-case text-[1.3rem] leading-[0.9] -mt-[0.1em]"
            style={{ color: "var(--coquelicot)" }}
          >
            business
          </span>
        </p>

        <p className="text-[0.78rem] text-white/65 leading-relaxed mt-3 mb-4">
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
  );
}
