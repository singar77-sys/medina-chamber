/**
 * Admin dashboard shell.
 *
 * Uses fixed inset-0 z-50 to overlay the public site chrome (Header,
 * Footer, ChatWidget) that the root layout renders. This keeps the root
 * layout untouched — a future refactor can move the public chrome into a
 * (public) route group layout once the project grows.
 */

import { cookies } from "next/headers";
import { AdminNav } from "@/components/admin/AdminNav";
import { ADMIN_COOKIE, readSession } from "@/lib/admin-session";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Surface who's signed in (per-admin accounts). The proxy already gated this
  // route; here we just read the name off the verified session for display.
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const session = token ? await readSession(token) : null;
  const adminName = session?.sub ?? "Admin";
  return (
    <div
      data-theme="light"
      className="fixed inset-0 z-50 flex overflow-hidden"
      style={{ background: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      <AdminNav adminName={adminName} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-6 py-3 border-b shrink-0"
          style={{ background: "#fff", borderColor: "#e2e8f0" }}
        >
          <div />
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span>↗</span>
            View public site
          </a>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
