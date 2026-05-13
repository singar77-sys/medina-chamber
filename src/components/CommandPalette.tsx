"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { totalCount } from "@/data/members";
import { chamberOffice, stephanie } from "@/data/staff";
import { mailto } from "@/lib/format";

/**
 * CommandPalette — global intent layer. ⌘K / Ctrl+K / "/" from anywhere
 * opens a single input that routes to any page, action, or the ChamberBot.
 *
 * Zero dependencies (no `cmdk` package). Server-safe (renders nothing
 * until hydrated; the keyboard shortcut hint is the only prepaint).
 * When no command matches, the fallback row hands the query off to the
 * ChamberBot via the `jackie:open` CustomEvent — which ChatWidget
 * listens for and auto-sends.
 *
 * NAMING NOTE — "Jackie" identifiers (jackie:open, askJackie,
 * cmdk-group--jackie, cmdk-row--jackie) are the wire-level names. The
 * user-facing label is always "ChamberBot." See ChatWidget.tsx for the
 * full naming convention.
 */

type CommandGroup =
  | "Navigate"
  | "Membership"
  | "Events & Programs"
  | "News & About"
  | "Contact & Tools";

interface Command {
  id: string;
  label: string;
  hint?: string;
  keywords?: string[];
  group: CommandGroup;
  /** Absolute URL (internal route or external). */
  href?: string;
  /** External link — opens in new tab. */
  external?: boolean;
  /** Arbitrary action (takes precedence over href). */
  action?: () => void;
}

const COMMANDS: Command[] = [
  // Navigate
  {
    id: "home",
    label: "Home",
    group: "Navigate",
    href: "/",
    keywords: ["landing", "front"],
  },
  {
    id: "about",
    label: "About the Chamber",
    group: "Navigate",
    href: "/about",
    keywords: ["history", "mission"],
  },
  {
    id: "advocacy",
    label: "Advocacy",
    group: "Navigate",
    href: "/about/advocacy",
    keywords: ["policy", "legislator", "government", "voice"],
  },
  {
    id: "board",
    label: "Board of Directors",
    group: "Navigate",
    href: "/about/board",
    keywords: ["leadership"],
  },
  {
    id: "ambassadors",
    label: "Ambassadors",
    group: "Navigate",
    href: "/about/ambassadors",
  },
  {
    id: "hall-of-fame",
    label: "Hall of Fame",
    group: "Navigate",
    href: "/about/hall-of-fame",
    keywords: ["awards", "honor", "history"],
  },

  // Membership
  {
    id: "directory",
    label: "Member Directory",
    group: "Membership",
    href: "/membership/directory",
    keywords: ["find", "search", "business", "company", "members"],
    hint: `Search ${totalCount}+ member businesses`,
  },
  {
    id: "join",
    label: "Join the Chamber",
    group: "Membership",
    href: "/membership/join",
    keywords: ["apply", "sign up", "enroll", "become a member"],
    hint: "Start your application",
  },
  {
    id: "pricing",
    label: "Pricing & Tiers",
    group: "Membership",
    href: "/membership/pricing",
    keywords: ["cost", "price", "tiers", "dues"],
  },
  {
    id: "benefits",
    label: "Member Benefits",
    group: "Membership",
    href: "/membership/benefits",
    keywords: ["perks", "included"],
  },
  {
    id: "savings",
    label: "Savings Programs",
    group: "Membership",
    href: "/membership/savings",
    keywords: ["discount", "insurance", "workers comp", "anthem", "energy"],
  },
  {
    id: "committees",
    label: "Committees",
    group: "Membership",
    href: "/membership/committees",
    keywords: ["get involved", "volunteer"],
  },
  {
    id: "first-30",
    label: "Your First 30 Days",
    group: "Membership",
    href: "/membership/first-30-days",
    keywords: ["onboarding", "new member"],
  },

  // Events & Programs
  {
    id: "events",
    label: "Upcoming Events",
    group: "Events & Programs",
    href: "/events",
    keywords: ["calendar", "networking", "schedule"],
    hint: "See what's coming up",
  },
  {
    id: "sponsorships",
    label: "Event Sponsorships",
    group: "Events & Programs",
    href: "/events/sponsorships",
    keywords: ["sponsor", "advertise"],
  },
  {
    id: "compass",
    label: "Compass Professional Development Program",
    group: "Events & Programs",
    href: "/programs/compass",
    keywords: ["professional", "development", "training", "compass"],
  },
  {
    id: "safety-council",
    label: "Safety Council",
    group: "Events & Programs",
    href: "/programs/safety-council",
    keywords: ["workplace", "bwc", "workers comp", "training"],
  },
  {
    id: "athena-awards",
    label: "Athena Awards",
    group: "Events & Programs",
    href: "/programs/athena-awards",
    keywords: ["women", "recognition", "leadership awards"],
  },
  {
    id: "golf-outing",
    label: "Annual Golf Outing",
    group: "Events & Programs",
    href: "/programs/golf-outing",
    keywords: ["golf", "tournament"],
  },
  {
    id: "rental-space",
    label: "Book a Meeting Room",
    group: "Events & Programs",
    href: "/programs/rental-space",
    keywords: ["vault", "main room", "rent", "book", "meeting", "conference"],
    hint: "The Vault (16) · Main Room (50)",
  },
  {
    id: "social-connect",
    label: "Social Connect",
    group: "Events & Programs",
    href: "/programs/social-connect",
    keywords: ["networking", "happy hour", "social"],
  },

  // News & About
  {
    id: "news",
    label: "Chamber News",
    group: "News & About",
    href: "/news",
  },
  {
    id: "blog",
    label: "Blog",
    group: "News & About",
    href: "/news/blog",
    keywords: ["articles", "posts"],
  },
  {
    id: "magazine",
    label: "Magazine",
    group: "News & About",
    href: "/news/magazine",
  },
  {
    id: "member-news",
    label: "Member Announcements",
    group: "News & About",
    href: "/news/member-news",
  },
  {
    id: "podcast",
    label: "Podcast",
    group: "News & About",
    href: "/news/podcast",
  },
  {
    id: "communities",
    label: "Communities",
    group: "News & About",
    href: "/community",
    keywords: ["brunswick", "wadsworth", "lodi", "medina"],
  },
  {
    id: "jobs",
    label: "Jobs Board",
    group: "News & About",
    href: "/jobs",
    keywords: ["hiring", "careers"],
  },

  // Contact & Tools
  {
    id: "contact",
    label: "Contact the Chamber",
    group: "Contact & Tools",
    href: "/about/contact",
    keywords: ["reach", "get in touch"],
  },
  {
    id: "call",
    label: "Call (330) 723-8773",
    group: "Contact & Tools",
    href: "tel:+13307238773",
    keywords: ["phone", "dial"],
    external: true,
  },
  {
    id: "email-stephanie",
    label: "Email Stephanie (Membership)",
    group: "Contact & Tools",
    href: mailto(stephanie.email),
    keywords: ["stephanie", "membership", "join questions"],
    external: true,
  },
  {
    id: "email-office",
    label: "Email the Chamber Office",
    group: "Contact & Tools",
    href: mailto(chamberOffice.email),
    keywords: ["general", "office"],
    external: true,
  },
  {
    id: "map",
    label: "Map to the Chamber",
    group: "Contact & Tools",
    href: "https://www.google.com/maps/search/?api=1&query=139+N+Court+St+Suite+A+Medina+OH+44256",
    keywords: ["directions", "location", "139 court"],
    external: true,
  },
  {
    id: "accessibility",
    label: "Accessibility Statement",
    group: "Contact & Tools",
    href: "/accessibility",
  },
  {
    id: "top",
    label: "Back to top",
    group: "Contact & Tools",
    keywords: ["scroll"],
    action: () => window.scrollTo({ top: 0, behavior: "smooth" }),
  },
];

/** Simple fuzzy-ish match: all query tokens must appear in label or
 *  keywords. Returns a score (lower = better) for sorting. */
function scoreCommand(cmd: Command, query: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const hay = [cmd.label, cmd.hint ?? "", ...(cmd.keywords ?? [])]
    .join(" ")
    .toLowerCase();
  const tokens = q.split(/\s+/);
  let score = 0;
  for (const t of tokens) {
    const idx = hay.indexOf(t);
    if (idx === -1) return null;
    score += idx; // earlier match = better
  }
  // Prefer matches in the actual label
  if (cmd.label.toLowerCase().startsWith(q)) score -= 100;
  else if (cmd.label.toLowerCase().includes(q)) score -= 40;
  return score;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const results = useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const scored = COMMANDS.map((c) => ({
      cmd: c,
      score: scoreCommand(c, query),
    })).filter((x): x is { cmd: Command; score: number } => x.score !== null);
    scored.sort((a, b) => a.score - b.score);
    return scored.map((x) => x.cmd);
  }, [query]);

  const hasResults = results.length > 0;
  // Fallback "Ask Jackie" item lives at the end when there's a query.
  const showJackieFallback = query.trim().length > 0;
  const totalRows = results.length + (showJackieFallback ? 1 : 0);

  // Reset highlight when results change.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Global keyboard triggers
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        return;
      }
      // "/" opens the palette — only if not focused in an input already
      if (e.key === "/" && !open) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        const editable = target?.isContentEditable;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && !editable) {
          e.preventDefault();
          setOpen(true);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // External trigger — any component can dispatch `cmdk:open` to
  // summon the palette (used by the header launcher button).
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("cmdk:open", handler);
    return () => window.removeEventListener("cmdk:open", handler);
  }, []);

  // Focus input on open, reset state on close
  useEffect(() => {
    if (open) {
      // Delay so focus lands after the modal paints
      setTimeout(() => inputRef.current?.focus(), 20);
      // iOS Safari ignores overflow:hidden on <body>. position:fixed is the
      // reliable cross-platform scroll lock; restore scroll position on close.
      const y = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${y}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflowY = "scroll";
    } else {
      const top = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflowY = "";
      if (top) window.scrollTo(0, -parseInt(top, 10));
      setQuery("");
      setActiveIndex(0);
    }
    return () => {
      const top = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflowY = "";
      if (top) window.scrollTo(0, -parseInt(top, 10));
    };
  }, [open]);

  // Scroll the active row into view
  useEffect(() => {
    if (!open) return;
    const container = listRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>(
      `[data-idx="${activeIndex}"]`,
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const executeCommand = useCallback(
    (cmd: Command) => {
      setOpen(false);
      if (cmd.action) {
        cmd.action();
        return;
      }
      if (cmd.href) {
        if (cmd.external || /^(https?:|mailto:|tel:)/.test(cmd.href)) {
          if (cmd.external && !/^(mailto:|tel:)/.test(cmd.href)) {
            window.open(cmd.href, "_blank", "noopener,noreferrer");
          } else {
            window.location.href = cmd.href;
          }
        } else {
          router.push(cmd.href);
        }
      }
    },
    [router],
  );

  const askJackie = useCallback((q: string) => {
    setOpen(false);
    window.dispatchEvent(
      new CustomEvent("jackie:open", { detail: { query: q } }),
    );
  }, []);

  function handleKeyDownInModal(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, totalRows - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex < results.length) {
        executeCommand(results[activeIndex]);
      } else if (showJackieFallback) {
        askJackie(query);
      }
    }
  }

  // Group results by category for display
  const grouped = useMemo(() => {
    const groups = new Map<CommandGroup, Command[]>();
    for (const c of results) {
      const list = groups.get(c.group) ?? [];
      list.push(c);
      groups.set(c.group, list);
    }
    return Array.from(groups.entries());
  }, [results]);

  return (
    <>
      {open && (
        <div
          className="cmdk-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="cmdk-panel" onKeyDown={handleKeyDownInModal}>
            <div className="cmdk-inputRow">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="cmdk-icon"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search · or ask a question…"
                className="cmdk-input"
                aria-label="Search commands"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="cmdk-kbd cmdk-kbd--esc">Esc</kbd>
            </div>

            <div ref={listRef} className="cmdk-list">
              {hasResults ? (
                grouped.map(([group, items]) => (
                  <div key={group} className="cmdk-group">
                    <p className="cmdk-group__label">{group}</p>
                    <ul>
                      {items.map((cmd) => {
                        const idx = results.indexOf(cmd);
                        const active = idx === activeIndex;
                        return (
                          <li key={cmd.id}>
                            <button
                              type="button"
                              data-idx={idx}
                              data-active={active}
                              onClick={() => executeCommand(cmd)}
                              onMouseEnter={() => setActiveIndex(idx)}
                              className="cmdk-row"
                            >
                              <span className="cmdk-row__label">
                                {cmd.label}
                              </span>
                              {cmd.hint && (
                                <span className="cmdk-row__hint">
                                  {cmd.hint}
                                </span>
                              )}
                              {active && (
                                <span
                                  className="cmdk-row__enter"
                                  aria-hidden="true"
                                >
                                  ↵
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="cmdk-empty">No commands match.</p>
              )}

              {showJackieFallback && (
                <div className="cmdk-group cmdk-group--jackie">
                  <p className="cmdk-group__label">Ask the ChamberBot</p>
                  <ul>
                    <li>
                      <button
                        type="button"
                        data-idx={results.length}
                        data-active={activeIndex === results.length}
                        onClick={() => askJackie(query)}
                        onMouseEnter={() => setActiveIndex(results.length)}
                        className="cmdk-row cmdk-row--jackie"
                      >
                        <span className="cmdk-row__label">
                          Ask the ChamberBot:{" "}
                          <span className="cmdk-row__q">
                            &ldquo;{query}&rdquo;
                          </span>
                        </span>
                        <span className="cmdk-row__hint">
                          Opens the ChamberBot
                        </span>
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="cmdk-footer">
              <span>
                <kbd className="cmdk-kbd">↑</kbd>
                <kbd className="cmdk-kbd">↓</kbd> to navigate
              </span>
              <span>
                <kbd className="cmdk-kbd">↵</kbd> to select
              </span>
              <span>
                <kbd className="cmdk-kbd">Esc</kbd> to close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
