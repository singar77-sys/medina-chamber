"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

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
 * Takes a CSP nonce as a prop because it's an inline <script> — the
 * middleware-issued nonce makes it execute under our strict CSP.
 */
export function ThemeScript({ nonce }: { nonce?: string }) {
  const script = `
    (function() {
      try {
        var stored = localStorage.getItem('mc-theme');
        var preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        var theme = stored || preferred;
        document.documentElement.setAttribute('data-theme', theme);
      } catch(e) {}
    })();
  `;
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: script }} />;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("mc-theme") as Theme | null;
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const initial = stored || preferred;
    setThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
    setMounted(true);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    // Suppress transitions during theme swap to prevent color flash
    document.documentElement.setAttribute("data-theme-transitioning", "");
    setThemeState(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("mc-theme", newTheme);
    // Re-enable transitions on next frame
    requestAnimationFrame(() => {
      document.documentElement.removeAttribute("data-theme-transitioning");
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  // Prevent hydration mismatch — render children immediately
  // but don't expose theme until mounted
  return (
    <ThemeContext.Provider
      value={{
        theme: mounted ? theme : "light",
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
