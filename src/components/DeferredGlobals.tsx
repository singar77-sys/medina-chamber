"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

/**
 * DeferredGlobals — mounts the site's non-critical, always-present client
 * widgets (chat, command palette, keyword hotkey, birthday confetti,
 * weather ambience) AFTER first paint so their JavaScript stays out of
 * the initial bundle path.
 *
 * Why a wrapper: the root layout is a Server Component, and `next/dynamic`
 * with `ssr: false` is only allowed inside a Client Component. Consolidating
 * all four deferred widgets here keeps layout.tsx surgical (one tag) and
 * their code-split chunks off the critical path.
 *
 * Deferral strategy: none of these are needed for first paint. We wait for
 * the browser to go idle (requestIdleCallback, falling back to a short
 * setTimeout) OR for the first real user interaction (pointer/keydown/
 * scroll/touch), whichever comes first. Once mounted, each widget behaves
 * exactly as before — the chat still opens/streams, the palette still
 * responds to ⌘K / "/", the hotkey still listens, confetti still checks
 * the date.
 */

// ssr: false — these are client-only and don't need to be prerendered.
// KeywordHotkey / BirthdayConfetti render null until active, ChatWidget /
// CommandPalette render null until opened, so skipping SSR costs no markup.
const ChatWidget = dynamic(
  () => import("@/components/ChatWidget").then((m) => m.ChatWidget),
  { ssr: false },
);
const CommandPalette = dynamic(
  () => import("@/components/CommandPalette").then((m) => m.CommandPalette),
  { ssr: false },
);
const KeywordHotkey = dynamic(
  () => import("@/components/KeywordHotkey").then((m) => m.KeywordHotkey),
  { ssr: false },
);
const BirthdayConfetti = dynamic(
  () => import("@/components/BirthdayConfetti").then((m) => m.BirthdayConfetti),
  { ssr: false },
);
const MedinaAmbience = dynamic(
  () => import("@/components/weather/MedinaAmbience").then((m) => m.MedinaAmbience),
  { ssr: false },
);

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function DeferredGlobals() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;

    const activate = () => setMounted(true);

    // First-interaction triggers — any of these means the user is engaged
    // and the widgets should be ready. `once` so they self-clean.
    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
    ];
    for (const ev of events) {
      window.addEventListener(ev, activate, { once: true, passive: true });
    }

    // Idle trigger — mount during the first idle slice even if the user
    // never interacts, so the chat button etc. still appear on a static read.
    const w = window as IdleWindow;
    let idleHandle: number | undefined;
    let timeoutHandle: number | undefined;
    if (typeof w.requestIdleCallback === "function") {
      idleHandle = w.requestIdleCallback(activate, { timeout: 3000 });
    } else {
      timeoutHandle = window.setTimeout(activate, 2000);
    }

    return () => {
      for (const ev of events) {
        window.removeEventListener(ev, activate);
      }
      if (idleHandle !== undefined && typeof w.cancelIdleCallback === "function") {
        w.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <>
      <ChatWidget />
      <CommandPalette />
      <KeywordHotkey />
      <BirthdayConfetti />
      <MedinaAmbience />
    </>
  );
}
