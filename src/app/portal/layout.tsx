/**
 * Portal layout — overlays the public site chrome (Header, Footer, ChatWidget)
 * exactly like the admin shell. Each portal page is responsible for its own
 * auth check so the login page stays accessible without a session.
 */

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {children}
    </div>
  );
}
