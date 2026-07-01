/**
 * Anti-FOUC theme script — shared source of truth.
 *
 * This lives in a plain (non-"use client") module so BOTH the client
 * ThemeProvider component (which renders it) AND the server/edge proxy
 * (which lists its hash in the CSP `script-src`) import the exact same
 * values. If this were exported from the "use client" ThemeProvider, the
 * proxy would import a client-reference stub instead of the real string,
 * silently corrupting the CSP header.
 *
 * The script is inline and static, so instead of a per-request nonce
 * (which forces the whole app tree into dynamic rendering) it is allowed
 * through the CSP by a build-stable `'sha256-...'` source. The browser
 * hashes the EXACT bytes it receives between <script> and </script>, so
 * THEME_SCRIPT, its serialized form, and THEME_SCRIPT_HASH must stay in
 * lockstep — enforced by src/lib/theme-script.test.ts.
 *
 * Keep THEME_SCRIPT single-line with no CR/LF so the served bytes are
 * identical regardless of git autocrlf / platform line endings.
 */

export const THEME_SCRIPT =
  "(function(){try{var t=localStorage.getItem('mc-theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();";

// sha256 of THEME_SCRIPT, base64. Recomputed + asserted by the test.
export const THEME_SCRIPT_HASH =
  "sha256-ug4h3+7+Ctsn7Sk17rfO3BIBNQ9hJocFNAOHwlvszNY=";
