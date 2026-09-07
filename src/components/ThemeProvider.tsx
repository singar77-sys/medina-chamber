"use client";

import {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { THEME_SCRIPT } from "@/lib/theme-script";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/**
 * Inline script to prevent flash of wrong theme.
 * Injected into <head> before any paint.
 *
 * The script body (THEME_SCRIPT) is static and lives in
 * src/lib/theme-script.ts so the server/edge proxy can import its hash for
 * the CSP without pulling in this "use client" module. Instead of a
 * per-request nonce (which would force the whole app tree dynamic), it is
 * allowed through the CSP by a build-stable `'sha256-...'` source.
 */
export function ThemeScript() {
  // suppressHydrationWarning: React normalises the nonce attribute during
  // hydration; suppressing avoids a harmless dev-mode overlay warning.
  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}

/**
 * The theme lives on <html data-theme>, not in React state.
 *
 * THEME_SCRIPT (blocking, in <head>) already resolved localStorage +
 * prefers-color-scheme and stamped the attribute before first paint, and every
 * themed style keys off that attribute. So the attribute is the store, and this
 * provider reads it rather than keeping a second copy in useState that a mount
 * effect has to catch up — that shape cost an extra render on every page and
 * called setState synchronously from an effect body.
 */
const THEME_CHANGE_EVENT = "mc-theme-change";

function getThemeSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function subscribeToTheme(onStoreChange: () => void): () => void {
  // Our own toggle fires THEME_CHANGE_EVENT; "storage" covers a change made
  // in another tab.
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Server snapshot is "light", which is what the SSR markup assumes, so
  // hydration matches; the real attribute value takes over right after.
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    (): Theme => "light",
  );

  const setTheme = useCallback((newTheme: Theme) => {
    // Suppress transitions during theme swap to prevent color flash
    document.documentElement.setAttribute("data-theme-transitioning", "");
    document.documentElement.setAttribute("data-theme", newTheme);
    try {
      localStorage.setItem("mc-theme", newTheme);
    } catch {
      // Private-mode / blocked storage: the swap still applies for this page.
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    // Re-enable transitions on next frame
    requestAnimationFrame(() => {
      document.documentElement.removeAttribute("data-theme-transitioning");
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(getThemeSnapshot() === "light" ? "dark" : "light");
  }, [setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
