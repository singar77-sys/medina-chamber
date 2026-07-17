/**
 * Forces /admin/login to render dynamically (per request) instead of being
 * statically prerendered at build time. The page itself is a client
 * component and can't export route segment config, but proxy.ts always
 * issues a fresh per-request CSP nonce for every /admin/** route on the
 * assumption those pages are dynamically rendered — a static build has no
 * request to stamp a matching nonce onto its scripts, so every script tag
 * gets silently blocked by CSP and the page never hydrates.
 */
export const dynamic = "force-dynamic";

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
