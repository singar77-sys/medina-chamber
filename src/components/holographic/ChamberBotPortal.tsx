"use client";

/**
 * ChamberBotPortal — holographic full-screen AI concierge.
 *
 * Layout matches the Holographic Chamber design handoff exactly:
 *   - Grid: 56px HUD | 1fr Scene | 36px Rail
 *   - Scene (theater): minmax(0,1fr) Stage | auto Panel
 *   - Mascot lives in mascot-slot with aura + floor rings
 *   - Stage caption "Ask me anything." is inside the stage
 *   - Mode buttons use Unicode glyphs (◈ ◉ ◊ ◎), no SVG icons
 *   - Input bar is flat, not pill/capsule
 *   - Rail is its own grid row, always visible
 *
 * Phase lifecycle: closed → entering → open → exiting → closed
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { usePostHog } from "posthog-js/react";
import { ChamberBotMascot, type MascotIntent } from "./ChamberBotMascot";
import { renderMarkdown } from "@/lib/markdown";
import { getUpcomingEvents } from "@/data/events";
import { chamberOffice, jaclyn, stephanie } from "@/data/staff";
import { mailto } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────

type CbSource = "directory" | "events" | "general";
type Phase = "closed" | "entering" | "open" | "exiting";
type SceneState = "idle" | "listening" | "thinking" | "responding";
type PortalMode = "find" | "events" | "join" | "contact";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: CbSource;
  memberSlugs?: string[];
  showCapture?: boolean;
}

export interface ChamberBotPortalProps {
  open: boolean;
  initialQuery?: string | null;
  onClose: () => void;
}

// ── Sub-components ────────────────────────────────────────────────


/**
 * Concentric holographic rings — pure SVG, zero JS.
 * Centered in the stage behind the mascot.
 * CSS drives rotation; state class adjusts animation speed.
 */
function HoloRings({ state }: { state: string }) {
  return (
    <div className={`holo-rings state-${state}`} aria-hidden="true">
      {/* Outer ring: dashed gradient arc */}
      <svg viewBox="-200 -200 400 400" className="hr hr-1">
        <defs>
          <linearGradient id="cb-hr-grad-1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#83BCA9" stopOpacity="0" />
            <stop offset="0.5" stopColor="#83BCA9" stopOpacity="0.9" />
            <stop offset="1" stopColor="#83BCA9" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle
          r="180"
          fill="none"
          stroke="url(#cb-hr-grad-1)"
          strokeWidth="0.6"
          strokeDasharray="2 6"
        />
        <circle
          r="180"
          fill="none"
          stroke="#83BCA9"
          strokeOpacity="0.10"
          strokeWidth="0.4"
        />
      </svg>
      {/* Mid ring: dashed + 12 tick marks */}
      <svg viewBox="-200 -200 400 400" className="hr hr-2">
        <circle
          r="140"
          fill="none"
          stroke="#83BCA9"
          strokeOpacity="0.16"
          strokeWidth="0.6"
          strokeDasharray="1 4"
        />
        <g>
          {Array.from({ length: 12 }, (_, i) => (
            <line
              key={i}
              x1="138"
              y1="0"
              x2="148"
              y2="0"
              stroke="#83BCA9"
              strokeOpacity="0.4"
              strokeWidth="0.8"
              transform={`rotate(${i * 30})`}
            />
          ))}
        </g>
      </svg>
      {/* Inner accent: coquelicot dashed */}
      <svg viewBox="-200 -200 400 400" className="hr hr-3">
        <circle
          r="95"
          fill="none"
          stroke="#FF4000"
          strokeOpacity="0.3"
          strokeWidth="0.5"
          strokeDasharray="0.5 3"
        />
      </svg>
      {/* Core ring: solid cambridge */}
      <svg viewBox="-200 -200 400 400" className="hr hr-4">
        <circle
          r="60"
          fill="none"
          stroke="#83BCA9"
          strokeOpacity="0.45"
          strokeWidth="0.6"
        />
      </svg>
    </div>
  );
}

/** Mode selection grid — shown when no messages and not in contact mode. */
function Welcome({
  onMode,
  calendarRange,
}: {
  onMode: (m: PortalMode) => void;
  calendarRange: string;
}) {
  return (
    <div className="welcome">
      <div className="mode-grid">
        <button
          type="button"
          className="mode-btn"
          onClick={() => onMode("find")}
        >
          <span className="mode-glyph" aria-hidden="true">
            ◈
          </span>
          <span className="mode-head">Find a business</span>
          <span className="mode-sub mono">SEARCH MEMBERS</span>
        </button>
        <button
          type="button"
          className="mode-btn"
          onClick={() => onMode("events")}
        >
          <span className="mode-glyph" aria-hidden="true">
            ◉
          </span>
          <span className="mode-head">Upcoming events</span>
          <span className="mode-sub mono">CALENDAR · {calendarRange}</span>
        </button>
        <button
          type="button"
          className="mode-btn"
          onClick={() => onMode("join")}
        >
          <span className="mode-glyph" aria-hidden="true">
            ◊
          </span>
          <span className="mode-head">Join the chamber</span>
          <span className="mode-sub mono">TIERS · BENEFITS · COST</span>
        </button>
        <button
          type="button"
          className="mode-btn"
          onClick={() => onMode("contact")}
        >
          <span className="mode-glyph" aria-hidden="true">
            ◎
          </span>
          <span className="mode-head">Talk to a human</span>
          <span className="mode-sub mono">STAFF CONTACT</span>
        </button>
      </div>
    </div>
  );
}

/** Staff contact info — replaces the panel-body when in contact mode. */
function ContactPanel({ onBack }: { onBack: () => void }) {
  return (
    <div className="contact-panel">
      <div className="welcome-eyebrow mono">CHAMBER STAFF · DIRECT LINE</div>
      <div className="contact-rows">
        <a
          className="contact-row"
          href={`tel:+1${chamberOffice.phone.replace(/\D/g, "")}`}
        >
          <div className="contact-k mono">PHONE</div>
          <div className="contact-v">{chamberOffice.phone}</div>
        </a>
        <a className="contact-row" href={mailto(chamberOffice.email)}>
          <div className="contact-k mono">EMAIL</div>
          <div className="contact-v">{chamberOffice.email}</div>
        </a>
        <div className="contact-row">
          <div className="contact-k mono">HOURS</div>
          <div className="contact-v">Mon – Fri · 10 AM – 4 PM</div>
        </div>
        <div className="contact-divider" />
        <a
          className="contact-row"
          href={mailto(stephanie.email)}
        >
          <div className="contact-k mono">MEMBERSHIP &amp; EVENTS</div>
          <div className="contact-v">Stephanie Mueller</div>
          <div className="contact-sub">{stephanie.email}</div>
        </a>
        <a className="contact-row" href={mailto(jaclyn.email)}>
          <div className="contact-k mono">EXECUTIVE DIRECTOR</div>
          <div className="contact-v">Jaclyn Ringstmeier</div>
          <div className="contact-sub">{jaclyn.email}</div>
        </a>
      </div>
      <button type="button" className="back-btn" onClick={onBack}>
        ← Ask ChamberBot instead
      </button>
    </div>
  );
}

// ── Portal lead-capture card ──────────────────────────────────────
function PortalCaptureCard({
  messageId,
  sessionId,
  onClose,
}: {
  messageId: string;
  sessionId: string | null;
  onClose: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const formLoadedAt = useRef(Date.now());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/chat/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          name: name.trim(),
          email: email.trim(),
          topic: "membership",
          note: "ChamberBot lead, expressed interest via chat",
          website_confirm: "",
          formLoadedAt: formLoadedAt.current,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="cb-capture cb-capture--sent">
        <span className="mono">✓ CONFIRMED, </span> Stephanie will be in touch.
      </div>
    );
  }

  return (
    <div className="cb-capture">
      <div className="cb-capture__head mono">STEPHANIE WILL REACH OUT</div>
      <p className="cb-capture__body">
        Drop your name and email, she&apos;ll follow up directly.
      </p>
      {status === "error" && (
        <p className="cb-capture__error mono">Send failed, try again.</p>
      )}
      <form className="cb-capture__form" onSubmit={handleSubmit}>
        <input
          className="cb-capture__input"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
          aria-label="Your name"
        />
        <input
          className="cb-capture__input"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          aria-label="Email address"
        />
        <div className="cb-capture__actions">
          <button
            type="submit"
            className="cb-capture__btn cb-capture__btn--primary"
            disabled={status === "sending" || !name.trim() || !email.trim()}
          >
            {status === "sending" ? "Sending…" : "Send →"}
          </button>
          <button
            type="button"
            className="cb-capture__btn cb-capture__btn--ghost"
            onClick={() => onClose(messageId)}
          >
            No thanks
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────

const ENTER_MS = 1400;
const EXIT_MS = 800;

const TAGLINES = [
  "I know this town.",
  "Members at your fingertips.",
  "Events, businesses, membership, ask away.",
  "What are you looking for today?",
  "Your holographic concierge is ready.",
];

// ── Component ─────────────────────────────────────────────────────

export function ChamberBotPortal({
  open,
  initialQuery,
  onClose,
}: ChamberBotPortalProps) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("closed");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sceneState, setSceneState] = useState<SceneState>("idle");
  const [intent, setIntent] = useState<MascotIntent>("general");
  const [portalMode, setPortalMode] = useState<PortalMode | null>(null);
  const [clock, setClock] = useState("");
  const [taglineIdx, setTaglineIdx] = useState(0);
  // Chill mode: pause decorative animations. Initialises from localStorage
  // preference if set, otherwise mirrors the OS prefers-reduced-motion signal.
  const [chillMode, setChillMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("cb-chill");
    if (stored !== null) return stored === "true";
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  });

  const upcomingEventCount = useMemo(() => getUpcomingEvents().length, []);

  // Calendar mode subtitle — current month + 2 months out, dynamic so the
  // "APR – JUN" range slides forward as the year progresses instead of going
  // stale and forcing a manual edit every quarter.
  const calendarRange = useMemo(() => {
    const monthShort = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const now = new Date();
    const end = new Date(now);
    end.setMonth(now.getMonth() + 2);
    return `${monthShort(now)} – ${monthShort(end)}`;
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);
  const justSubmittedRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seededForQueryRef = useRef<string | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const posthog = usePostHog();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Live ET clock — ticks every second
  useEffect(() => {
    const tick = () => {
      setClock(
        new Date().toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
          hourCycle: "h23",
        }),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Persist chill preference across sessions
  useEffect(() => {
    localStorage.setItem("cb-chill", String(chillMode));
  }, [chillMode]);

  // Tagline carousel — cycles while the stage caption is visible
  const hasMessages = messages.length > 0;
  const showContact = portalMode === "contact" && !hasMessages;
  useEffect(() => {
    if (hasMessages || showContact) return;
    const id = setInterval(() => {
      setTaglineIdx(i => (i + 1) % TAGLINES.length);
    }, 3800);
    return () => clearInterval(id);
  }, [hasMessages, showContact]);

  // ── Streaming ────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q) return;
      if (sceneState === "thinking") return;

      setPortalMode((m) => (m === "contact" ? null : m));
      posthog?.capture("chamberbot_message_sent", {
        turn: messages.filter((m) => m.role === "user").length + 1,
      });

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: q,
      };
      const assistantId = crypto.randomUUID();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setSceneState("thinking");

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current, message: q }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) throw new Error("Failed");

        const serverSid = res.headers.get("x-session-id");
        if (serverSid) sessionIdRef.current = serverSid;

        const xSource = (res.headers.get("x-cb-source") ?? "general") as CbSource;
        const xIntent = (res.headers.get("x-cb-intent") ?? "general") as MascotIntent;
        const xMembers = res.headers.get("x-cb-members");
        const memberSlugs = xMembers ? xMembers.split(",").filter(Boolean) : [];
        setIntent(xIntent);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let firstToken = true;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (firstToken && chunk.length) {
            setSceneState("responding");
            firstToken = false;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, source: xSource, memberSlugs } : m,
              ),
            );
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + chunk }
                : m,
            ),
          );
        }

        // Detect and strip lead-capture token after stream completes.
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId) return m;
            const hasCapture = m.content.includes("[→STEPHANIE]");
            if (!hasCapture) return m;
            return {
              ...m,
              content: m.content.replace(/\[→STEPHANIE\]\s*/g, "").trim(),
              showCapture: true,
            };
          })
        );

        setSceneState("idle");
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    "Connection disrupted. Try again or close the portal and use the chat widget.",
                  source: "general",
                }
              : m,
          ),
        );
        setSceneState("idle");
      }
    },
    [sceneState, messages, posthog],
  );

  // ── Phase machine ─────────────────────────────────────────────────
  useEffect(() => {
    const shouldEnter = open && (phase === "closed" || phase === "exiting");
    const shouldExit = !open && (phase === "open" || phase === "entering");
    if (!shouldEnter && !shouldExit) return;

    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }

    if (shouldEnter) {
      setPhase("entering");
      posthog?.capture("chamberbot_opened");
      phaseTimerRef.current = setTimeout(() => {
        setPhase("open");
        phaseTimerRef.current = null;
      }, ENTER_MS);
    } else {
      setPhase("exiting");
      posthog?.capture("chamberbot_closed", { message_count: messages.length });
      phaseTimerRef.current = setTimeout(() => {
        setPhase("closed");
        setMessages([]);
        setIntent("general");
        setPortalMode(null);
        seededForQueryRef.current = null;
        phaseTimerRef.current = null;
      }, EXIT_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase]);

  useEffect(() => {
    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, []);

  // Seed first question from props (chat widget hand-off)
  useEffect(() => {
    if (phase !== "entering" && phase !== "open") return;
    if (!initialQuery) return;
    if (seededForQueryRef.current === initialQuery) return;
    seededForQueryRef.current = initialQuery;
    const t = setTimeout(() => sendMessage(initialQuery), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, initialQuery]);

  // Lock body scroll while portal is open.
  // position:fixed approach prevents iOS Safari rubber-band scroll behind the portal.
  useLayoutEffect(() => {
    if (phase === "closed") return;
    const y = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, y);
    };
  }, [phase]);

  // Input focus — desktop only. Touch devices skip auto-focus so the
  // virtual keyboard doesn't collapse the portal on open.
  useEffect(() => {
    const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    if (isTouch) return;
    if (phase === "entering") {
      const t = setTimeout(() => inputRef.current?.focus(), 400);
      return () => clearTimeout(t);
    }
    if (phase === "open") {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Pin transcript to newest message
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  // ESC → close
  useEffect(() => {
    if (phase === "closed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        abortRef.current?.abort();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, onClose]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    justSubmittedRef.current = true;
    setTimeout(() => {
      justSubmittedRef.current = false;
    }, 150);
    sendMessage(input);
  };

  const handleMode = (m: PortalMode) => {
    posthog?.capture("chamberbot_mode_selected", { mode: m });
    if (m === "contact") {
      setPortalMode("contact");
      return;
    }
    if (m === "find") {
      setPortalMode("find");
      setTimeout(() => inputRef.current?.focus(), 80);
      return;
    }
    const seeds: Partial<Record<PortalMode, string>> = {
      events: "What events are coming up in Medina this month?",
      join: "How do I join the chamber and what does membership cost?",
    };
    const seed = seeds[m];
    if (seed) sendMessage(seed);
  };

  const userIsTyping =
    input.trim().length > 0 && sceneState === "responding";
  if (!mounted || phase === "closed") return null;

  return createPortal(
    <div
      className={`cb-portal state-${sceneState}${chillMode ? " cb-chill" : ""}`}
      data-phase={phase}
      data-state={sceneState}
      role="dialog"
      aria-modal="true"
      aria-label="ChamberBot, Medina County Chamber concierge"
    >
      {/* Atmospheric backdrop layers */}
      <div className="chamber-sky" aria-hidden="true" />
      <div className="chamber-vignette" aria-hidden="true" />
      <div className="chamber-grid" aria-hidden="true" />
      <div className="chamber-scanlines" aria-hidden="true" />

      {/* HUD — 56px top grid row */}
      <header className="hud">
        <div className="hud-left">
          <div className="hud-wordmark">
            <span className="wm-1">MEDINA</span>
            <span className="wm-dot">·</span>
            <span className="wm-2">CHAMBER</span>
          </div>
          <div className="hud-sep" />
          <div className="hud-status">
            <span className="status-dot" />
            ChamberBot <span className="mono">· live</span>
          </div>
        </div>
        <div className="hud-right">
          <div className="hud-chip mono">ET {clock}</div>
          <div className="hud-chip mono">SINCE 1938</div>
          <button
            type="button"
            className="hud-btn hud-btn--close"
            onClick={() => {
              abortRef.current?.abort();
              onClose();
            }}
            aria-label="Close portal"
          >
            <svg
              viewBox="0 0 18 18"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          </button>
        </div>
      </header>

      {/* Scene — 1fr middle grid row */}
      <main className="scene">
        {/* Stage: mascot + rings centered, caption at bottom */}
        <section className="stage">
          <HoloRings state={sceneState} />
          <div
            className="mascot-slot"
            aria-label="ChamberBot mascot"
          >
            <div className="mascot-aura" aria-hidden="true" />
            <div className="mascot-figure">
              <ChamberBotMascot
                state={sceneState}
                className="cb-portal-mascot"
                userIsTyping={userIsTyping}
                intent={intent}
              />
            </div>
            <div className="mascot-floor" aria-hidden="true">
              <div className="floor-ring r1" />
              <div className="floor-ring r2" />
              <div className="floor-ring r3" />
            </div>
          </div>
          {!hasMessages && !showContact && (
            <div className="stage-caption" aria-hidden="true">
              <div className="sc-eyebrow mono">ChamberBot</div>
              <div className="sc-title" key={taglineIdx}>{TAGLINES[taglineIdx]}</div>
            </div>
          )}
        </section>

        {/* Panel: content body + input bar */}
        <section className="panel">
          <div className="panel-frame">
            <div className="panel-corners" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>

            <div className="panel-body">
              {showContact ? (
                <ContactPanel onBack={() => setPortalMode(null)} />
              ) : hasMessages ? (
                <div className="transcript" aria-live="polite">
                  {messages.map((m) => (
                    <div key={m.id}>
                      <div className={`msg msg-${m.role}`}>
                        <div className="msg-label mono">
                          {m.role === "user" ? "YOU" : "CHAMBERBOT"}
                        </div>
                        <div className="msg-bubble">
                          {m.role === "user" ? (
                            m.content
                          ) : m.content ? (
                            <span>{renderMarkdown(m.content)}</span>
                          ) : (
                            <span
                              className="typing"
                              aria-label="ChamberBot is thinking"
                            >
                              <span />
                              <span />
                              <span />
                            </span>
                          )}
                        </div>
                      </div>
                      {m.showCapture && (
                        <PortalCaptureCard
                          messageId={m.id}
                          sessionId={sessionIdRef.current}
                          onClose={(id) =>
                            setMessages((prev) =>
                              prev.map((msg) =>
                                msg.id === id ? { ...msg, showCapture: false } : msg
                              )
                            )
                          }
                        />
                      )}
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              ) : (
                <Welcome onMode={handleMode} calendarRange={calendarRange} />
              )}
            </div>

            <form className="input-bar" onSubmit={handleSubmit}>
              <div className="input-pulse" aria-hidden="true" />
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => {
                  if (sceneState === "idle") setSceneState("listening");
                }}
                onBlur={() => {
                  if (
                    !justSubmittedRef.current &&
                    sceneState === "listening"
                  ) {
                    setSceneState("idle");
                  }
                }}
                placeholder={
                  sceneState === "thinking"
                    ? "ChamberBot is thinking…"
                    : sceneState === "responding"
                      ? "Type to interrupt…"
                      : portalMode === "find"
                        ? "What type of business are you looking for?"
                        : hasMessages
                          ? "Ask another question…"
                          : "Ask anything about Medina businesses, events, or joining the chamber…"
                }
                disabled={sceneState === "thinking"}
                aria-label="Ask the ChamberBot"
                className="input-field"
                name="chamberbot-message"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="sentences"
                spellCheck={true}
              />
              <button
                type="submit"
                disabled={!input.trim() || sceneState === "thinking"}
                aria-label="Send"
                className="send-btn"
              >
                <svg
                  viewBox="0 0 18 18"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 9l14-7-5 16-3-7-6-2z" />
                </svg>
              </button>
            </form>
          </div>
          <p className="cb-disclaimer mono">
            AI, responses may be inaccurate · verify with{" "}
            <a href="/about/contact">{chamberOffice.email}</a>
            {" · "}
            <a href="/privacy">Privacy</a>
            {" · "}
            <a href="/terms">Terms</a>
          </p>
        </section>
      </main>

      {/* Rail — 36px bottom grid row */}
      <footer className="rail mono">
        <div className="rail-item" aria-hidden="true">
          <span className="rail-dot ok" /> MEMBERS INDEXED
        </div>
        <div className="rail-item" aria-hidden="true">
          <span className="rail-dot ok" /> {upcomingEventCount} UPCOMING EVENTS
        </div>
        <button
          className="rail-item rail-toggle"
          onClick={() => setChillMode((c) => !c)}
          aria-pressed={chillMode}
          aria-label={chillMode ? "Chill mode on, click to resume animations" : "Pause animations (chill mode)"}
        >
          <span className={`rail-dot ${chillMode ? "ok" : "off"}`} />
          CHILL
        </button>
        <div className="rail-spacer" aria-hidden="true" />
        <div className="rail-item" aria-hidden="true">VECTOR INDEX · v4.2.1</div>
        <div className="rail-item" aria-hidden="true">
          LATENCY <span className="rail-val">—</span>
        </div>
      </footer>
    </div>,
    document.body,
  );
}
