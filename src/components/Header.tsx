"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ButtonLink, ButtonA } from "@/components/ui/Button";
import { navigation, ctaLink, memberLogin, type NavItem } from "@/lib/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { CommandPaletteTrigger } from "./CommandPaletteTrigger";

/* ─── Scroll Lock Hook ───────────────────────────────────── */

function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

/* ─── Dropdown (hover + keyboard, with descriptions) ─────── */

function Dropdown({
  item,
  isOpen,
  onIntent,
  onAbandon,
  onClose,
  pathname,
}: {
  item: NavItem;
  isOpen: boolean;
  onIntent: () => void;
  onAbandon: () => void;
  onClose: () => void;
  pathname: string;
}) {
  const isActive = pathname.startsWith(item.href);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation for the dropdown menu
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const items = menu.querySelectorAll<HTMLElement>('[role="menuitem"]');
    let focusIndex = -1;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          focusIndex = Math.min(focusIndex + 1, items.length - 1);
          items[focusIndex]?.focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          focusIndex = Math.max(focusIndex - 1, 0);
          items[focusIndex]?.focus();
          break;
        case "Home":
          e.preventDefault();
          focusIndex = 0;
          items[focusIndex]?.focus();
          break;
        case "End":
          e.preventDefault();
          focusIndex = items.length - 1;
          items[focusIndex]?.focus();
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          triggerRef.current?.focus();
          break;
        case "Tab":
          onClose();
          break;
      }
    }

    menu.addEventListener("keydown", handleKeyDown);
    return () => menu.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Single-destination items render as a direct link (no dropdown)
  if (!item.children || item.children.length === 0) {
    return (
      <Link
        href={item.href}
        className={`
          flex items-center px-f13 py-f8
          text-body-sm font-bold
          hover:text-text-primary transition-colors
          ${isActive ? "text-text-primary" : "text-text-secondary"}
        `}
        aria-current={pathname === item.href ? "page" : undefined}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div
      className="relative"
      onPointerEnter={onIntent}
      onPointerLeave={onAbandon}
    >
      <button
        ref={triggerRef}
        className={`
          flex items-center gap-f5 px-f13 py-f8
          text-body-sm font-bold
          hover:text-text-primary transition-colors
          cursor-pointer
          ${isActive || isOpen ? "text-text-primary" : "text-text-secondary"}
        `}
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => (isOpen ? onClose() : onIntent())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onIntent();
            // Focus first menu item after panel opens
            requestAnimationFrame(() => {
              menuRef.current
                ?.querySelector<HTMLElement>('[role="menuitem"]')
                ?.focus();
            });
          }
        }}
      >
        {item.label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Hover bridge */}
      <div
        className={`absolute left-0 right-0 top-full h-3 ${isOpen ? "block" : "hidden"}`}
        aria-hidden="true"
      />

      {/* Panel — aria-hidden when closed: opacity-0 alone still leaves all
          five submenus (~30 links) in the screen-reader virtual cursor. */}
      <div
        aria-hidden={!isOpen}
        className={`
          absolute top-full left-0 pt-3 z-50
          transition-all duration-200 ease-out
          ${isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-1 pointer-events-none"
          }
        `}
      >
        <div
          ref={menuRef}
          className="
            py-2 min-w-[280px]
            bg-bg-primary border border-border-primary
            rounded-[var(--radius-md)] shadow-[var(--shadow-lg)]
          "
          role="menu"
        >
          {item.children.map((child) => {
            const isExternal = child.external;
            const Component = isExternal ? "a" : Link;
            const extraProps = isExternal
              ? { target: "_blank" as const, rel: "noopener noreferrer" }
              : {};
            const isCurrent = pathname === child.href;

            return (
              <Component
                key={child.href}
                href={child.href}
                {...(extraProps as Record<string, string>)}
                role="menuitem"
                tabIndex={isOpen ? 0 : -1}
                aria-current={isCurrent ? "page" : undefined}
                className={`
                  flex flex-col px-f13 py-f8 outline-none
                  hover:bg-bg-secondary focus-visible:bg-bg-secondary transition-colors
                  ${isCurrent ? "bg-bg-secondary" : ""}
                `}
              >
                <span
                  className={`
                    text-body-sm font-bold
                    ${isCurrent ? "text-text-accent" : "text-text-primary"}
                  `}
                >
                  {child.label}
                </span>
                {child.description && (
                  <span className="text-caption mt-0.5 leading-snug">
                    {child.description}
                  </span>
                )}
              </Component>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Mobile Menu (slide-in animation) ────────────────────── */

function MobileMenu({
  isOpen,
  onClose,
  pathname,
}: {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
}) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [visible,       setVisible]       = useState(false);
  const [animating,     setAnimating]     = useState(false);
  // Guards against iOS ghost-click: a synthetic click fires ~300ms after
  // touchend on the element that opened the menu and can land on the
  // newly-mounted backdrop, instantly closing it.
  const [backdropReady, setBackdropReady] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  // Whatever had focus when the drawer opened (the hamburger), so focus can be
  // handed back on close instead of falling to <body>.
  const openerRef = useRef<HTMLElement | null>(null);

  // Animate in/out instead of instant mount/unmount
  useEffect(() => {
    if (isOpen) {
      openerRef.current = document.activeElement as HTMLElement | null;
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimating(true);
          closeBtnRef.current?.focus();
        });
      });
      // Activate backdrop after iOS ghost-click window has passed (~300ms).
      const readyTimer = setTimeout(() => setBackdropReady(true), 350);
      return () => clearTimeout(readyTimer);
    } else {
      setAnimating(false);
      setBackdropReady(false);
      // preventScroll: the scroll lock is unwinding on this same commit, so a
      // focus-driven scrollIntoView would fight window.scrollTo.
      openerRef.current?.focus({ preventScroll: true });
      openerRef.current = null;
      const timer = setTimeout(() => setVisible(false), 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Escape closes (matching the desktop dropdowns) and Tab cycles inside the
  // drawer: aria-modal="true" promises the rest of the page is inert to
  // assistive tech, so focus must not walk into the content behind the scrim.
  function onDialogKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const root = dialogRef.current;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !root.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last || !root.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!visible) return null;

  return (
    // A dialog wrapper is where Escape and the Tab cycle have to live: the
    // handler is for the whole drawer, not for one control inside it.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 xl:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-menu-title"
      onKeyDown={onDialogKeyDown}
    >
      {/* Backdrop — fade. Button for native keyboard support.
          pointerEvents blocked until backdropReady to prevent iOS ghost-click. */}
      <button
        type="button"
        aria-label="Close menu"
        className={`
          absolute inset-0 bg-oxford/60 backdrop-blur-sm cursor-default
          transition-opacity duration-250 ease-out
          ${animating ? "opacity-100" : "opacity-0"}
        `}
        onClick={backdropReady ? onClose : undefined}
        style={{ pointerEvents: backdropReady ? undefined : "none" }}
      />

      {/* Drawer — slide from right */}
      <nav
        aria-label="Mobile"
        className={`
          absolute top-0 right-0 w-full max-w-sm h-full
          bg-bg-primary shadow-[var(--shadow-lg)] overflow-y-auto
          transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${animating ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between p-f21 border-b border-border-primary">
          <span id="mobile-menu-title" className="text-h4 font-bold">Menu</span>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="w-f34 h-f34 flex items-center justify-center rounded-full hover:bg-bg-tertiary cursor-pointer"
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 5L15 15M15 5L5 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Member Login */}
        <div className="px-f21 pt-f21">
          <ButtonA
            href={memberLogin.href}
            variant="emerald"
            size="md"
            className="w-full justify-center"
            onClick={onClose}
          >
            {memberLogin.label}
          </ButtonA>
        </div>

        <div className="p-f21 space-y-f5">
          {navigation.map((item) => {
            // Direct link items
            if (!item.children || item.children.length === 0) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="
                    block py-3
                    text-body-lg font-bold text-text-primary
                  "
                  onClick={onClose}
                >
                  {item.label}
                </Link>
              );
            }

            const sectionId = `mobile-nav-${item.label
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}`;

            return (
              <div key={item.label}>
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === item.label ? null : item.label
                    )
                  }
                  aria-expanded={expandedSection === item.label}
                  // Only reference the panel while it is actually in the DOM.
                  aria-controls={expandedSection === item.label ? sectionId : undefined}
                  className="
                    w-full flex items-center justify-between py-3
                    text-body-lg font-bold text-text-primary
                    cursor-pointer
                  "
                >
                  {item.label}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className={`transition-transform duration-200 ${
                      expandedSection === item.label ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      d="M4 6L8 10L12 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {expandedSection === item.label && item.children && (
                  <div id={sectionId} className="pb-3 pl-4 space-y-1">
                    {item.children.map((child) => {
                      const Component = child.external ? "a" : Link;
                      const extraProps = child.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {};
                      return (
                        <Component
                          key={child.href}
                          href={child.href}
                          {...(extraProps as Record<string, string>)}
                          aria-current={pathname === child.href ? "page" : undefined}
                          className={`
                            flex flex-col py-2
                            hover:text-text-primary transition-colors
                            ${pathname === child.href ? "text-text-accent" : "text-text-secondary"}
                          `}
                          onClick={onClose}
                        >
                          <span className="text-body-sm font-bold">
                            {child.label}
                          </span>
                          {child.description && (
                            <span className="text-caption mt-0.5">
                              {child.description}
                            </span>
                          )}
                        </Component>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile CTA */}
        <div className="p-f21 pt-0">
          <ButtonLink
            href={ctaLink.href}
            size="md"
            className="w-full justify-center"
            onClick={onClose}
          >
            {ctaLink.label} →
          </ButtonLink>
        </div>
      </nav>
    </div>
  );
}

/* ─── Header ───────────────────────────────────────────── */

export function Header() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useScrollLock(mobileOpen);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 280);
  }, [cancelClose]);

  const handleIntent = useCallback(
    (label: string) => {
      cancelClose();
      setOpenDropdown(label);
    },
    [cancelClose]
  );

  const closeDropdown = useCallback(() => {
    setOpenDropdown(null);
  }, []);

  // Esc closes any open dropdown (Cmd/Ctrl+K is handled by CommandPalette)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && openDropdown) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [openDropdown]);

  useEffect(() => {
    return () => cancelClose();
  }, [cancelClose]);

  return (
    <>
      <header
        className="
          sticky top-0 z-40
          bg-nav-bg backdrop-blur-xl
          border-b border-nav-border
          pt-[env(safe-area-inset-top)]
        "
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          {/* Grid: left-wing [logo] · sacred-center [nav] · right-wing [controls]
              grid-cols-[1fr_auto_1fr] gives the logo and controls equal fractional
              width, so the nav is truly centred — hierophant bilateral symmetry. */}
          {/* h-f89 (89px) nav / logo h-f55 (55px) → ratio 55:89 = F10:F11 = φ⁻¹ = 0.618 */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center h-f89">

            {/* Left wing: Logo + bee mark */}
            <div className="flex items-center gap-2">
              {/* Logo pair: CSS-driven by data-theme to avoid hydration flash.
                  JS reads theme AFTER hydration → logo briefly shows the
                  wrong variant. These are toggled by the inline ThemeScript
                  which sets data-theme before first paint — no flash possible. */}
              <Link href="/" className="flex-shrink-0">
                <Image
                  src="/images/logos/logo-horizontal-blue.png"
                  alt="Medina Chamber"
                  width={180}
                  height={48}
                  className="nav-logo nav-logo--light h-f55 w-auto"
                  priority
                />
                <Image
                  src="/images/logos/logo-horizontal-white.png"
                  alt=""
                  aria-hidden="true"
                  width={180}
                  height={48}
                  className="nav-logo nav-logo--dark h-f55 w-auto"
                  priority
                />
              </Link>
              {/* Virtual Chamber — bee mark, desktop only */}
              <Link
                href="/chamberbot"
                aria-label="Open Virtual Chamber"
                title="Virtual Chamber"
                className="
                  hidden xl:flex w-f34 h-f34 items-center justify-center
                  rounded-full bg-bg-tertiary hover:bg-border-primary
                  transition-colors flex-shrink-0
                "
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <ellipse cx="6.5" cy="8.5" rx="4.8" ry="2.6" fill="#83BCA9" transform="rotate(-18 6.5 8.5)" />
                  <ellipse cx="13.5" cy="8.5" rx="4.8" ry="2.6" fill="#83BCA9" transform="rotate(18 13.5 8.5)" />
                  <ellipse cx="10" cy="13.5" rx="3.2" ry="4.8" fill="#FF4000" />
                  <ellipse cx="10" cy="12.8" rx="3.2" ry="1.1" fill="#0C1B33" opacity="0.3" />
                  <ellipse cx="10" cy="15.2" rx="3.2" ry="1.1" fill="#0C1B33" opacity="0.3" />
                  <circle cx="10" cy="8" r="2.1" fill="#FF4000" />
                  <path d="M8.9 6.4 L7.2 4" stroke="#0C1B33" strokeWidth="1.1" strokeLinecap="round" />
                  <path d="M11.1 6.4 L12.8 4" stroke="#0C1B33" strokeWidth="1.1" strokeLinecap="round" />
                  <circle cx="7.2" cy="4" r="0.9" fill="#0C1B33" />
                  <circle cx="12.8" cy="4" r="0.9" fill="#0C1B33" />
                </svg>
              </Link>
            </div>

            {/* Sacred center: Desktop nav */}
            <nav
              aria-label="Primary"
              className="hidden xl:flex items-center gap-f5"
              onPointerLeave={scheduleClose}
            >
              {navigation.map((item) => (
                <Dropdown
                  key={item.label}
                  item={item}
                  isOpen={openDropdown === item.label}
                  onIntent={() => handleIntent(item.label)}
                  onAbandon={scheduleClose}
                  onClose={closeDropdown}
                  pathname={pathname}
                />
              ))}
            </nav>

            {/* Right wing: Controls */}
            <div className="flex items-center justify-end gap-f8 col-start-3">
              <CommandPaletteTrigger />
              <ThemeToggle />

              {/* Desktop Member Login — emerald button (brand direction: no clear buttons) */}
              <ButtonA
                href={memberLogin.href}
                variant="emerald"
                size="sm"
                className="hidden xl:flex whitespace-nowrap"
              >
                {memberLogin.label}
              </ButtonA>

              {/* Desktop CTA */}
              <ButtonLink
                href={ctaLink.href}
                size="sm"
                className="hidden xl:flex"
              >
                {ctaLink.label} →
              </ButtonLink>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(true)}
                className="xl:hidden w-f34 h-f34 flex items-center justify-center rounded-full hover:bg-bg-tertiary cursor-pointer"
                aria-label="Open menu"
                aria-expanded={mobileOpen}
                aria-haspopup="dialog"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M3 5H17M3 10H17M3 15H17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        pathname={pathname}
      />
    </>
  );
}
