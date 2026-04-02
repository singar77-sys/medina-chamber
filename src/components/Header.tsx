"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { navigation, ctaLink, type NavItem } from "@/lib/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "./ThemeProvider";

/* ─── Dropdown (hover-driven, with descriptions) ──────── */

function Dropdown({
  item,
  isOpen,
  onIntent,
  onAbandon,
  pathname,
}: {
  item: NavItem;
  isOpen: boolean;
  onIntent: () => void;
  onAbandon: () => void;
  pathname: string;
}) {
  const isActive = pathname.startsWith(item.href);

  // If item has no children or only one child that matches itself, render as a direct link
  const isSingleLink =
    !item.children || (item.children.length === 1 && item.children[0].href === item.href);

  if (isSingleLink) {
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
      {/* Trigger */}
      <button
        className={`
          flex items-center gap-1 px-3 py-2
          text-body-sm font-bold
          hover:text-text-primary transition-colors
          cursor-pointer
          ${isActive || isOpen ? "text-text-primary" : "text-text-secondary"}
        `}
        aria-expanded={isOpen}
        aria-haspopup="true"
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
          className="
            py-2 min-w-[280px]
            bg-bg-primary border border-border-primary
            rounded-[var(--radius-md)] shadow-[var(--shadow-lg)]
          "
          role="menu"
        >
          {item.children?.map((child) => {
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
                aria-current={isCurrent ? "page" : undefined}
                className={`
                  flex flex-col px-4 py-3
                  hover:bg-bg-secondary
                  transition-colors
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
                  {isExternal && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 12 12"
                      fill="none"
                      className="inline-block ml-1.5 opacity-40"
                    >
                      <path
                        d="M9 6.5V9.5C9 10.05 8.55 10.5 8 10.5H2.5C1.95 10.5 1.5 10.05 1.5 9.5V4C1.5 3.45 1.95 3 2.5 3H5.5M7.5 1.5H10.5V4.5M5 7L10.25 1.75"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
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

/* ─── Mobile Menu ──────────────────────────────────────── */

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-oxford/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <nav className="absolute top-0 right-0 w-full max-w-sm h-full bg-bg-primary shadow-[var(--shadow-lg)] overflow-y-auto">
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

        <div className="p-6 space-y-1">
          {navigation.map((item) => {
            const isSingleLink =
              !item.children ||
              (item.children.length === 1 && item.children[0].href === item.href);

            if (isSingleLink) {
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
                          aria-current={
                            pathname === child.href ? "page" : undefined
                          }
                          className={`
                            flex flex-col py-2
                            hover:text-text-primary
                            transition-colors
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

        {/* Mobile utility links */}
        <div className="px-6 pb-3">
          <Link
            href="/about/contact"
            className="
              block py-3
              text-body-lg font-bold text-text-primary
            "
            onClick={onClose}
          >
            Contact
          </Link>
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
        "
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center justify-between h-[4.5rem]">
            {/* Logo */}
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

            {/* Desktop nav */}
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
                  pathname={pathname}
                />
              ))}
            </nav>

            {/* Right side: Contact + Theme + CTA */}
            <div className="flex items-center gap-3">
              {/* Contact — elevated from About graveyard */}
              <Link
                href="/about/contact"
                className="
                  hidden lg:flex items-center px-3 py-2
                  text-body-sm font-bold text-text-secondary
                  hover:text-text-primary transition-colors
                "
              >
                Contact
              </Link>

              <ThemeToggle />

              {/* Desktop CTA */}
              <Link
                href={ctaLink.href}
                className="
                  hidden lg:flex items-center px-5 py-2.5
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
