"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * KeywordHotkey — type a secret phrase anywhere on the site (outside
 * of inputs) and get navigated to a hidden page. Konami-code style.
 *
 * Rules:
 *   - Only fires when the user isn't focused in an input, textarea,
 *     or contentEditable element (so typing in the ChamberBot or a
 *     form can't accidentally trigger it).
 *   - Buffer resets after 1.5s of keyboard silence so stale partials
 *     don't stick around.
 *   - Modifier keys (⌘ / Ctrl / Alt) are ignored so browser shortcuts
 *     (⌘K, ⌘+R) pass through cleanly.
 */

const SECRETS: Array<{ phrase: string; href: string }> = [
  { phrase: "icebreaker", href: "/icebreaker" },
];

/**
 * Ambient easter-egg triggers. Typing any of these words (outside an
 * input) fires `mc-ambience-play`, which MedinaAmbience listens for to
 * kick off the matching weather effect — completely decoupled from
 * real Medina conditions. Lets us (or a curious visitor) summon snow
 * on a sunny day.
 */
const AMBIENT_TRIGGERS: Array<"snow" | "rain" | "thunder" | "fog"> = [
  "snow",
  "rain",
  "thunder",
  "fog",
];

export function KeywordHotkey() {
  const router = useRouter();

  useEffect(() => {
    let buffer = "";
    let lastKey = 0;
    const RESET_MS = 1500;
    const MAX_BUFFER = 24;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      // Only single printable keys, no modifiers
      if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;

      const now = Date.now();
      if (now - lastKey > RESET_MS) buffer = "";
      lastKey = now;

      buffer = (buffer + e.key.toLowerCase()).slice(-MAX_BUFFER);

      for (const secret of SECRETS) {
        if (buffer.endsWith(secret.phrase)) {
          buffer = "";
          router.push(secret.href);
          return;
        }
      }

      // Ambient weather triggers — fire an event, don't navigate.
      // Keep the buffer cleared so consecutive triggers ("snowsnow")
      // each fire cleanly instead of compounding.
      for (const condition of AMBIENT_TRIGGERS) {
        if (buffer.endsWith(condition)) {
          buffer = "";
          window.dispatchEvent(
            new CustomEvent("mc-ambience-play", {
              detail: { condition },
            }),
          );
          return;
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}
