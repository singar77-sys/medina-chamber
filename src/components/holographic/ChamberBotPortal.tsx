"use client";

/**
 * ChamberBotPortal — the "Dr. Know booth" experience.
 *
 * Concierge interface, not a decorated transcript. Four entry modes
 * (Find a business / Upcoming events / Join the chamber / Talk to a human)
 * replace the generic "Ask anything" blank. Member answers render as
 * profile cards with provenance tags. The mascot shrinks after the first
 * turn so the answer area dominates.
 *
 * Lifecycle — driven by a single `phase` state:
 *   closed   → nothing mounted
 *   entering → enter animations running (≈1400ms); input is live at 400ms
 *   open     → steady state
 *   exiting  → exit animations running (≈800ms)
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { ChamberBotMascot, type MascotIntent } from "./ChamberBotMascot";
import { ParticleField } from "./ParticleField";
import { renderMarkdown } from "@/lib/markdown";
import { usePortalAudio } from "@/hooks/usePortalAudio";
import { DEFAULT_PROMPTS } from "@/lib/chamberbot-prompts";
import {
  getMemberBySlug,
  isCommunityInvestor,
  isVisibilityPlus,
} from "@/data/members";

// ── Sub-components ────────────────────────────────────────────────

type CbSource = "directory" | "events" | "general";

/** Compact profile card rendered below directory answers. */
function MemberCard({ slug }: { slug: string }) {
  const member = getMemberBySlug(slug);
  if (!member) return null;
  const isCI = isCommunityInvestor(member);
  const isVP = isVisibilityPlus(member);
  return (
    <a
      href={`https://medinachamber.com/membership/directory/${member.chamberSlug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="cb-member-card"
      tabIndex={0}
    >
      {(isCI || isVP) && (
        <span className={`cb-member-card__tier ${isCI ? "cb-member-card__tier--ci" : "cb-member-card__tier--vp"}`}>
          {isCI ? "Community Investor" : "Visibility Plus"}
        </span>
      )}
      <div className="cb-member-card__name">{member.name}</div>
      {member.categories[0] && (
        <div className="cb-member-card__cat">{member.categories[0]}</div>
      )}
      {member.phone && (
        <div className="cb-member-card__phone">{member.phone}</div>
      )}
    </a>
  );
}

/** Source attribution shown under each bot reply. */
function ProvenanceTag({ source }: { source: CbSource }) {
  const labels: Record<CbSource, string> = {
    directory: "from member directory",
    events: "from event calendar",
    general: "from chamber knowledge base",
  };
  return (
    <div className="cb-provenance">
      <span className="cb-provenance__dot" />
      {labels[source]}
    </div>
  );
}

/** "Talk to a human" contact panel — shown instead of chat. */
function ContactPanel({ onBack }: { onBack: () => void }) {
  return (
    <div className="cb-contact-panel">
      <div className="cb-contact-panel__title">Reach the Chamber Team</div>
      <div className="cb-contact-panel__rows">
        <a href="tel:+13307238773" className="cb-contact-row">
          <span className="cb-contact-row__icon" aria-hidden="true">📞</span>
          <div>
            <div className="cb-contact-row__label">Phone</div>
            <div className="cb-contact-row__value">(330) 723-8773</div>
          </div>
        </a>
        <a href="mailto:office@medinaohchamber.com" className="cb-contact-row">
          <span className="cb-contact-row__icon" aria-hidden="true">✉️</span>
          <div>
            <div className="cb-contact-row__label">Email</div>
            <div className="cb-contact-row__value">office@medinaohchamber.com</div>
          </div>
        </a>
        <div className="cb-contact-row cb-contact-row--static">
          <span className="cb-contact-row__icon" aria-hidden="true">⏰</span>
          <div>
            <div className="cb-contact-row__label">Hours</div>
            <div className="cb-contact-row__value">Mon–Fri · 10 AM – 4 PM</div>
          </div>
        </div>
        <div className="cb-contact-panel__divider" />
        <a href="mailto:stephanie@medinaohchamber.com" className="cb-contact-row">
          <span className="cb-contact-row__icon" aria-hidden="true">👋</span>
          <div>
            <div className="cb-contact-row__label">Membership & Events</div>
            <div className="cb-contact-row__value">Stephanie Mueller</div>
            <div className="cb-contact-row__sub">stephanie@medinaohchamber.com</div>
          </div>
        </a>
        <a href="mailto:jaclyn@medinaohchamber.com" className="cb-contact-row">
          <span className="cb-contact-row__icon" aria-hidden="true">🏛️</span>
          <div>
            <div className="cb-contact-row__label">Executive Director</div>
            <div className="cb-contact-row__value">Jaclyn Ringstmeier</div>
            <div className="cb-contact-row__sub">jaclyn@medinaohchamber.com</div>
          </div>
        </a>
      </div>
      <button type="button" onClick={onBack} className="cb-contact-panel__back">
        Ask ChamberBot instead
      </button>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────

type Phase = "closed" | "entering" | "open" | "exiting";
type SceneState = "idle" | "listening" | "thinking" | "responding";
type PortalMode = "find" | "events" | "join" | "contact";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: CbSource;
  memberSlugs?: string[];
}

export interface ChamberBotPortalProps {
  open: boolean;
  initialQuery?: string | null;
  onClose: () => void;
}

const ENTER_MS = 1400;
const EXIT_MS = 800;

/** Classify the user's question so the mascot can react appropriately. */
function detectIntent(question: string): MascotIntent {
  const q = question.toLowerCase();
  if (/\bhow many\b|\bcount\b|\bnumber of\b|\btotal\b/.test(q)) return "count";
  if (/\bevent|events|happening|upcoming|calendar\b/.test(q)) return "event";
  if (/\b(?:find|who is|looking for|recommend|any)\b/.test(q)) return "member";
  return "general";
}

// ── Component ─────────────────────────────────────────────────────

export function ChamberBotPortal({ open, initialQuery, onClose }: ChamberBotPortalProps) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("closed");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sceneState, setSceneState] = useState<SceneState>("idle");
  const [intent, setIntent] = useState<MascotIntent>("general");
  const [portalMode, setPortalMode] = useState<PortalMode | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const justSubmittedRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seededForQueryRef = useRef<string | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const audio = usePortalAudio();

  useEffect(() => { setMounted(true); }, []);

  // ── Streaming ────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q) return;
      if (sceneState === "thinking") return;
      setIntent(detectIntent(q));
      setPortalMode((m) => m === "contact" ? null : m); // leave contact mode on send

      const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: q };
      const assistantId = crypto.randomUUID();
      const assistantMsg: Message = { id: assistantId, role: "assistant", content: "" };

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

        // Read provenance headers before streaming starts
        const xSource = (res.headers.get("x-cb-source") ?? "general") as CbSource;
        const xMembers = res.headers.get("x-cb-members");
        const memberSlugs = xMembers ? xMembers.split(",").filter(Boolean) : [];

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let firstToken = true;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (firstToken && chunk.length) {
            setSceneState("responding");
            audio.receive();
            firstToken = false;
            // Tag the assistant message with provenance on first token
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, source: xSource, memberSlugs }
                  : m,
              ),
            );
          }
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
          );
        }

        setSceneState("idle");
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Connection disrupted. Try again, or close the portal and use the chat widget.", source: "general" }
              : m,
          ),
        );
        setSceneState("idle");
      }
    },
    [sceneState, audio],
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
      audio.enter();
      audio.startAmbient();
      phaseTimerRef.current = setTimeout(() => {
        setPhase("open");
        phaseTimerRef.current = null;
      }, ENTER_MS);
    } else {
      setPhase("exiting");
      audio.exit();
      audio.stopAmbient();
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
    return () => { if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current); };
  }, []);

  // Seed first question from props
  useEffect(() => {
    if (phase !== "entering" && phase !== "open") return;
    if (!initialQuery) return;
    if (seededForQueryRef.current === initialQuery) return;
    seededForQueryRef.current = initialQuery;
    const t = setTimeout(() => sendMessage(initialQuery), 900);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, initialQuery]);

  // Lock body scroll
  useLayoutEffect(() => {
    if (phase === "closed") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [phase]);

  // Focus input early — during entering (400ms in) so it's ready before
  // the theatrics finish, then again once fully open as a safety catch.
  useEffect(() => {
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
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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
    setTimeout(() => { justSubmittedRef.current = false; }, 150);
    sendMessage(input);
  };

  const userIsTyping = input.trim().length > 0 && sceneState === "responding";
  const hasMessages = messages.length > 0;
  const showModeSelector = !hasMessages && portalMode === null && phase === "open";
  const showContact = portalMode === "contact" && !hasMessages;

  if (!mounted || phase === "closed") return null;

  return createPortal(
    <div
      className="cb-portal"
      data-phase={phase}
      data-has-messages={hasMessages ? "true" : "false"}
      role="dialog"
      aria-modal="true"
      aria-label="ChamberBot — live conversation"
    >
      {/* Layered backdrop */}
      <div className="cb-portal-bg" aria-hidden="true" />
      <div className="cb-portal-vignette" aria-hidden="true" />
      <ParticleField
        className="cb-portal-particles"
        intensity={sceneState}
        color="rgba(131, 188, 169, 0.5)"
        count={70}
      />
      <div className="cb-portal-beam" aria-hidden="true" />
      <div className="cb-portal-floor" aria-hidden="true" />

      {/* HUD */}
      <header className="cb-portal-hud" aria-hidden={phase !== "open"}>
        <div className="cb-portal-hud__label">
          <span className="cb-portal-hud__dot" />
          ChamberBot &middot; Live
        </div>
        <div className="cb-portal-hud__actions">
          <button
            type="button"
            onClick={audio.toggleMute}
            aria-label={audio.muted ? "Unmute portal audio" : "Mute portal audio"}
            title={audio.muted ? "Unmute" : "Mute"}
            className="cb-portal-hud__btn"
          >
            {audio.muted ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => { abortRef.current?.abort(); onClose(); }}
            aria-label="Close portal"
            className="cb-portal-hud__btn cb-portal-hud__btn--close"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Stage wrapper — handles position + shrink transition.
          Inner .cb-portal-stage handles the enter/exit animation. */}
      <div className="cb-portal-stage-wrap" aria-hidden="true">
        <div
          className="cb-portal-stage"
          onClick={() => audio.boop()}
        >
          <ChamberBotMascot
            state={sceneState}
            className="cb-portal-mascot"
            userIsTyping={userIsTyping}
            intent={intent}
          />
        </div>
      </div>

      {/* Transcript — conversation history */}
      <div className="cb-portal-transcript" aria-live="polite">
        <div className="cb-portal-transcript__inner">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`cb-msg ${m.role === "user" ? "cb-msg--user" : "cb-msg--bot"}`}
            >
              <div className="cb-msg__label">
                {m.role === "user" ? "You" : "ChamberBot"}
              </div>
              <div className="cb-msg__bubble">
                {m.role === "user" ? (
                  m.content
                ) : m.content ? (
                  <span dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                ) : (
                  <span className="cb-msg__typing" aria-label="thinking">
                    <span /><span /><span />
                  </span>
                )}
              </div>

              {/* Provenance + member cards — bot messages only, after content loads */}
              {m.role === "assistant" && m.source && m.content && (
                <>
                  <ProvenanceTag source={m.source} />
                  {m.memberSlugs && m.memberSlugs.length > 0 && (
                    <div className="cb-member-cards">
                      {m.memberSlugs.slice(0, 4).map((slug) => (
                        <MemberCard key={slug} slug={slug} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* Contact panel — replaces mode selector when "Talk to a human" selected */}
      {showContact && (
        <ContactPanel onBack={() => setPortalMode(null)} />
      )}

      {/* Mode selector — appears before first message, replaces suggestion chips */}
      {showModeSelector && (
        <div className="cb-mode-selector" aria-label="Choose a topic">
          <p className="cb-mode-selector__label">What can I help with?</p>
          <div className="cb-mode-selector__grid">
            <button
              type="button"
              className="cb-mode-btn"
              onClick={() => {
                setPortalMode("find");
                setTimeout(() => inputRef.current?.focus(), 80);
              }}
            >
              <span className="cb-mode-btn__icon" aria-hidden="true">🏢</span>
              <span className="cb-mode-btn__label">Find a business</span>
              <span className="cb-mode-btn__sub">Search 511 members</span>
            </button>
            <button
              type="button"
              className="cb-mode-btn"
              onClick={() => sendMessage("What events are coming up in Medina this month?")}
            >
              <span className="cb-mode-btn__icon" aria-hidden="true">📅</span>
              <span className="cb-mode-btn__label">Upcoming events</span>
              <span className="cb-mode-btn__sub">What's on the calendar</span>
            </button>
            <button
              type="button"
              className="cb-mode-btn"
              onClick={() => sendMessage("How do I join the chamber and what does membership cost?")}
            >
              <span className="cb-mode-btn__icon" aria-hidden="true">🤝</span>
              <span className="cb-mode-btn__label">Join the chamber</span>
              <span className="cb-mode-btn__sub">Tiers, benefits, cost</span>
            </button>
            <button
              type="button"
              className="cb-mode-btn"
              onClick={() => setPortalMode("contact")}
            >
              <span className="cb-mode-btn__icon" aria-hidden="true">👤</span>
              <span className="cb-mode-btn__label">Talk to a human</span>
              <span className="cb-mode-btn__sub">Staff contact info</span>
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <form className="cb-portal-input" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => { if (sceneState === "idle") setSceneState("listening"); }}
          onBlur={() => {
            if (!justSubmittedRef.current && sceneState === "listening") {
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
              : "Ask anything…"
          }
          disabled={sceneState === "thinking"}
          aria-label="Ask the ChamberBot"
          className="cb-portal-input__field"
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
          className="cb-portal-input__send"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>
    </div>,
    document.body,
  );
}
