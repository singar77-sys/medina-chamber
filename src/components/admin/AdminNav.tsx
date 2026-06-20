"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: { href: string; label: string; icon: string; exact?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: "▦", exact: true },
  { href: "/admin/content", label: "Page Content", icon: "✎" },
  { href: "/admin/events", label: "Events", icon: "◈" },
  { href: "/admin/registrations", label: "Registrations", icon: "◰" },
  { href: "/admin/graphic-templates", label: "Graphic Templates", icon: "◑" },
  { href: "/admin/media", label: "Media Library", icon: "⬡" },
  { href: "/admin/blog", label: "Blog", icon: "◧" },
  { href: "/admin/chat", label: "Chat Log", icon: "◫" },
  { href: "/admin/members", label: "Members", icon: "◉" },
  { href: "/admin/committees", label: "Committees", icon: "❖" },
  { href: "/admin/deals", label: "Member Deals", icon: "✦" },
  { href: "/admin/sponsorships", label: "Sponsorships", icon: "◆" },
  { href: "/admin/resources", label: "Resource Library", icon: "▤" },
  { href: "/admin/campaigns", label: "Email Campaigns", icon: "✉" },
  { href: "/admin/notify", label: "Contact Support", icon: "◎" },
];

export function AdminNav() {
  const pathname = usePathname();

  function isActive(item: (typeof NAV_ITEMS)[number]) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  async function handleLogout() {
    // Logout clears the httpOnly admin_session cookie server-side; the cookie
    // is sent automatically on this same-origin POST.
    await fetch("/api/admin/auth/logout", { method: "POST", credentials: "same-origin" });
    window.location.href = "/admin/login";
  }

  return (
    <aside
      className="flex flex-col w-56 shrink-0 border-r"
      style={{ background: "var(--oxford-blue)", borderColor: "var(--border-primary)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b" style={{ borderColor: "var(--border-primary)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/chamber-logos/icon-white.png" alt="" className="w-7 h-7" />
        <div>
          <p className="text-white text-xs font-bold leading-tight">Chamber Admin</p>
          <p style={{ color: "var(--color-cambridge)" }} className="text-[10px] leading-tight">
            Hunter Systems
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors"
              style={{
                color: active ? "#ffffff" : "var(--color-text-tertiary)",
                background: active ? "rgba(131,188,169,0.15)" : "transparent",
              }}
            >
              <span style={{ color: active ? "var(--color-cambridge)" : "var(--color-text-secondary)" }} className="text-base leading-none">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t" style={{ borderColor: "var(--border-primary)" }}>
        <a
          href="/admin/notify"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs mb-1 transition-colors"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <span style={{ color: "var(--color-cambridge)" }}>⟳</span>
          View public site
        </a>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors text-left"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <span>⎋</span>
          Log out
        </button>
      </div>
    </aside>
  );
}
