/**
 * PortalTopBar — the sticky navy bar every signed-in portal page wears.
 *
 * Pure markup, so it stays a Server Component: the only interactive part is the
 * logout <form> POST, which needs no client JS. `links` is the page-specific
 * cross-nav (each page links to the ones it isn't); `memberName` is the
 * dashboard's signed-in-as label.
 *
 * The brand lockup links back to /portal/dashboard.
 */

export interface PortalTopBarLink {
  href: string;
  label: string;
}

export function PortalTopBar({
  links,
  memberName,
}: {
  links: PortalTopBarLink[];
  /** Hidden under `sm`, like the "Member Portal" wordmark. */
  memberName?: string;
}) {
  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 shrink-0"
      style={{ background: "#0C1B33", borderBottom: "1px solid rgba(255,255,255,.08)" }}
    >
      <a href="/portal/dashboard" className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/chamber-logos/icon-white.png"
          alt="Medina Chamber"
          className="w-7 h-7"
        />
        <span className="text-white text-sm font-bold hidden sm:block">
          Member Portal
        </span>
      </a>

      <div className="flex items-center gap-4">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-sm hover:underline"
            style={{ color: "#83BCA9" }}
          >
            {link.label}
          </a>
        ))}
        {memberName && (
          <span className="text-sm hidden sm:inline" style={{ color: "#83BCA9" }}>
            {memberName}
          </span>
        )}
        <form action="/api/portal/auth/logout" method="post">
          <button
            type="submit"
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{ background: "rgba(255,255,255,.08)", color: "#cbd5e1" }}
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
