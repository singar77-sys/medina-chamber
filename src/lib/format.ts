/**
 * Small string-formatting helpers used across the site.
 * Keep this file pure — no React, no Next imports.
 */

/**
 * Strip the protocol and trailing slash from a URL for display.
 * "https://www.example.com/" -> "www.example.com"
 */
export function domainOnly(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * Build a `mailto:` href with the address percent-encoded so unusual
 * characters (`+`, unicode, etc.) don't break the link.
 */
export function mailto(address: string, subject?: string): string {
  const base = `mailto:${encodeURIComponent(address).replace(/%40/g, "@")}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
}
