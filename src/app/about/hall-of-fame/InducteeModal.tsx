"use client";

import { useEffect, useRef } from "react";
import { InducteeAvatar } from "./InducteeAvatar";
import { type Inductee } from "./shared";

export function InducteeModal({
  inductee,
  onClose,
}: {
  inductee: Inductee;
  onClose: () => void;
}) {
  // Accessible focus management (EventGallery convention): focus the panel on
  // open so keyboard users land inside the dialog, close on Escape from
  // anywhere (document-level listener, like CommandPalette), and restore
  // focus to the triggering element on close.
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => panelRef.current?.focus());

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-oxford/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inductee-modal-title"
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-bg-primary border-l border-border-secondary shadow-2xl flex flex-col overflow-hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-start gap-f13 p-f21 border-b border-border-secondary">
          <InducteeAvatar
            inductee={inductee}
            className="w-14 h-14 shrink-0 rounded-full"
            textSize="text-h4"
            imgSizes="56px"
          />
          <div className="flex-1 min-w-0">
            <h2 id="inductee-modal-title" className="text-h4 leading-tight">{inductee.name}</h2>
            {inductee.category && (
              <p className="text-caption text-cambridge font-bold uppercase tracking-wider mt-f3">
                {inductee.category}{inductee.year ? ` · Class of ${inductee.year}` : ""}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-text-tertiary hover:text-text-primary transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-f21">
          {inductee.bio && (
            <p className="text-body-sm text-text-secondary leading-relaxed">
              {inductee.bio}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
