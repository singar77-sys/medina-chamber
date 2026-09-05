/**
 * Portal layout — overlays the public site chrome (Header, Footer, ChatWidget)
 * exactly like the admin shell. Each portal page is responsible for its own
 * auth check so the login page stays accessible without a session.
 *
 * Dormant-portal gate: GrowthZone is still the live system of record, so the
 * whole member portal is built but DORMANT until the ops cutover. Every page
 * beneath this layout 404s off the same INTERNAL_TRANSACTIONS_ENABLED kill
 * switch that guards /api/portal/** (src/app/api/portal/_dormant.ts). Gating
 * here rather than per page is deliberate: one gate can't be forgotten when a
 * page is added, and a login form for a system that can't sign anyone in is a
 * support burden, not a courtesy. force-dynamic keeps the switch a RUNTIME
 * decision — without it the 404 would be baked into the prerender of /portal.
 */

import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.INTERNAL_TRANSACTIONS_ENABLED !== "true") notFound();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg-secondary">
      {children}
    </div>
  );
}
