/**
 * Small string-formatting helpers used across the site.
 * Keep this file pure: no React, no Next imports.
 */

/**
 * Strip the protocol and trailing slash from a URL for display.
 * "https://www.example.com/" -> "www.example.com"
 */
export function domainOnly(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * Build a `mailto:` href. Percent-encodes the local-part so unusual
 * characters don't break the URL, then restores the `@` for readability.
 * Subjects (when provided) are always encoded.
 */
export function mailto(address: string, subject?: string): string {
  const base = `mailto:${encodeURIComponent(address).replace(/%40/g, "@")}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
}
