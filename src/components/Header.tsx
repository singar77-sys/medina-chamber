"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { navigation, ctaLink, memberLogin, type NavItem } from "@/lib/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { CommandPaletteTrigger } from "./CommandPaletteTrigger";
import { useTheme } from "./ThemeProvider";

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
          flex items-center px-3 py-2
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
          flex items-center gap-1 px-3 py-2
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

      {/* Panel */}
      <div
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
                  flex flex-col px-4 py-3 outline-none
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
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Animate in/out instead of instant mount/unmount
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop — fade. Button for native keyboard support. */}
      <button
        type="button"
        aria-label="Close menu"
        className={`
          absolute inset-0 bg-oxford/60 backdrop-blur-sm cursor-default
          transition-opacity duration-250 ease-out
          ${animating ? "opacity-100" : "opacity-0"}
        `}
        onClick={onClose}
      />

      {/* Drawer — slide from right */}
      <nav
        className={`
          absolute top-0 right-0 w-full max-w-sm h-full
          bg-bg-primary shadow-[var(--shadow-lg)] overflow-y-auto
          transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${animating ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between p-6 border-b border-border-primary">
          <span className="text-h4 font-bold">Menu</span>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-bg-tertiary cursor-pointer"
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
        <div className="px-6 pt-6">
          <a
            href={memberLogin.href}
            target="_blank"
            rel="noopener noreferrer"
            className="
              flex items-center justify-center w-full py-3 px-6
              bg-emerald hover:bg-emerald/90
              text-white font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
            onClick={onClose}
          >
            {memberLogin.label}
          </a>
        </div>

        <div className="p-6 space-y-1">
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

            return (
              <div key={item.label}>
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === item.label ? null : item.label
                    )
                  }
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
                  <div className="pb-3 pl-4 space-y-1">
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
        <div className="p-6 pt-0">
          <Link
            href={ctaLink.href}
            className="
              flex items-center justify-center w-full py-3.5 px-6
              bg-accent hover:bg-accent-hover
              text-white font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
            onClick={onClose}
          >
            {ctaLink.label} →
          </Link>
        </div>
      </nav>
    </div>
  );
}

/* ─── Header ───────────────────────────────────────────── */

export function Header() {
  const { theme } = useTheme();
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

  const logoSrc =
    theme === "dark"
      ? "/images/logos/logo-horizontal-white.png"
      : "/images/logos/logo-horizontal-blue.png";

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
          <div className="grid grid-cols-[1fr_auto_1fr] items-center h-[4.5rem]">

            {/* ── Left wing: Logo + bee mark ── */}
            <div className="flex items-center gap-2">
              <Link href="/" className="flex-shrink-0">
                <Image
                  src={logoSrc}
                  alt="Medina Chamber"
                  width={180}
                  height={48}
                  className="h-10 w-auto"
                  priority
                />
              </Link>
              {/* Virtual Chamber — bee mark, desktop only */}
              <Link
                href="/chamberbot"
                aria-label="Open Virtual Chamber"
                title="Virtual Chamber"
                className="
                  hidden lg:flex w-9 h-9 items-center justify-center
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

            {/* ── Sacred center: Desktop nav ── */}
            <nav
              className="hidden lg:flex items-center gap-1"
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

            {/* ── Right wing: Controls ── */}
            <div className="flex items-center justify-end gap-2">
              <CommandPaletteTrigger />
              <ThemeToggle />

              {/* Desktop Member Login */}
              <a
                href={memberLogin.href}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  hidden lg:flex items-center px-3.5 py-2
                  whitespace-nowrap
                  bg-emerald hover:bg-emerald/90
                  text-white font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                {memberLogin.label}
              </a>

              {/* Desktop CTA */}
              <Link
                href={ctaLink.href}
                className="
                  hidden lg:flex items-center px-4 py-2
                  whitespace-nowrap
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                {ctaLink.label} →
              </Link>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-bg-tertiary cursor-pointer"
                aria-label="Open menu"
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
