"use client";

/**
 * Launcher button for the CommandPalette. Dispatches a `cmdk:open`
 * CustomEvent — the palette (mounted globally in layout.tsx) listens
 * and opens itself. Lets the trigger live anywhere in the tree without
 * state coupling.
 *
 * FIRST-CLICK RACE: the palette is code-split (DeferredGlobals mounts it on
 * the first interaction, then next/dynamic fetches the chunk), so the very
 * first click dispatched `cmdk:open` with nothing listening yet and the click
 * was swallowed — the user had to click twice. Two guards:
 *   1. the intent is parked on `window.__cmdkPendingOpen`, which the palette
 *      consumes once when it mounts (see CommandPalette.tsx);
 *   2. pointerenter / focus warms the chunk, so it is usually already loaded
 *      by the time the click lands.
 * ⌘K / Ctrl+K never touches the flag — that shortcut is CommandPalette's own
 * listener and stays a plain toggle.
 *
 * Renders as:
 *   - Desktop (lg+): search icon + "Search" text + ⌘K kbd
 *   - Mobile:        icon-only circular button (same size as ThemeToggle)
 *
 * Place in the Header right rail.
 */

type CmdkWindow = Window & { __cmdkPendingOpen?: boolean };

/** Warm the deferred palette chunk before the click lands. */
function prefetchPalette() {
  // A failed prefetch is harmless: the click path still loads the chunk.
  import("@/components/CommandPalette").catch(() => {});
}

export function CommandPaletteTrigger() {
  const open = () => {
    (window as CmdkWindow).__cmdkPendingOpen = true;
    window.dispatchEvent(new CustomEvent("cmdk:open"));
  };

  return (
    <>
      {/* Desktop pill */}
      <button
        type="button"
        onClick={open}
        onPointerEnter={prefetchPalette}
        onFocus={prefetchPalette}
        aria-label="Open search and navigation"
        className="cmdk-navtrigger hidden lg:inline-flex"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className="cmdk-navtrigger__icon"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
            clipRule="evenodd"
          />
        </svg>
        <span className="cmdk-navtrigger__label">Search</span>
        <kbd className="cmdk-kbd">⌘K</kbd>
      </button>

      {/* Mobile icon-only */}
      <button
        type="button"
        onClick={open}
        onPointerEnter={prefetchPalette}
        onFocus={prefetchPalette}
        aria-label="Open search"
        className="cmdk-navtrigger--icon lg:hidden"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className="w-[18px] h-[18px]"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </>
  );
}
