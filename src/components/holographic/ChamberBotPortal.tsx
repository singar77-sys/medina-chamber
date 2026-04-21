"use client";

/**
 * ChamberBotPortal — the "Dr. Know booth" experience.
 *
 * A full-viewport overlay that takes over the screen when the user
 * commits to a question on the homepage. Inspired by the Dr. Know scene
 * from A.I. Artificial Intelligence (2001) — a 2D projection you
 * converse with, not 3D — the portal dissolves away the site, raises a
 * stage light, emerges the mascot through it, and drops you into a
 * conversation framed by ambient particles and a synthesized score.
 *
 * Invariant: the portal renders into document.body via createPortal, so
 * its z-index and layout are isolated from the rest of the page. Body
 * scroll is locked while open.
 *
 * Lifecycle — driven by a single `phase` state:
 *   closed   → nothing mounted
 *   entering → enter animations running (≈1400ms)
 *   open     → steady state, input is live
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
import { ChamberBotMascot } from "./ChamberBotMascot";
import { ParticleField } from "./ParticleField";
import { renderMarkdown } from "@/lib/markdown";
import { usePortalAudio } from "@/hooks/usePortalAudio";

type Phase = "closed" | "entering" | "open" | "exiting";
type SceneState = "idle" | "listening" | "thinking" | "responding";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface ChamberBotPortalProps {
  open: boolean;
  initialQuery?: string | null;
  onClose: () => void;
}

const ENTER_MS = 1400;
const EXIT_MS = 800;

export function ChamberBotPortal({ open, initialQuery, onClose }: ChamberBotPortalProps) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("closed");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sceneState, setSceneState] = useState<SceneState>("idle");

  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seededForQueryRef = useRef<string | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const audio = usePortalAudio();

  // Mount flag — defer createPortal until we're in the browser
  useEffect(() => {
    setMounted(true);
  }, []);

  // Streaming logic — runs a user question through /api/chat and
  // incrementally appends tokens to the assistant message. Mirrors the
  // original HolographicChamber logic but uses a proper message list
  // so multi-turn works.
  const sendMessage = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q) return;
      if (sceneState === "thinking" || sceneState === "responding") return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: q,
      };
      const assistantId = crypto.randomUUID();
      const assistantMsg: Message = { id: assistantId, role: "assistant", content: "" };

      // Snapshot conversation + new user msg for the API
      const history = [...messages, userMsg]
        .slice(-16)
        .map(({ role, content }) => ({ role, content }));

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setSceneState("thinking");

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) throw new Error("Failed");

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
              ? { ...m, content: "Connection disrupted. Try again, or close the portal and use the chat widget." }
              : m,
          ),
        );
        setSceneState("idle");
      }
    },
    [messages, sceneState, audio],
  );

  // Phase machine — orchestrate enter/exit with timers so CSS
  // animations can finish before unmount. Driven by edges only:
  // we act when a new transition is actually needed, not on every
  // render. Crucially, we do NOT clear the timer in a cleanup, because
  // the effect re-runs when phase changes mid-transition — any cleanup
  // there would kill the timer before it can fire.
  useEffect(() => {
    const shouldEnter = open && (phase === "closed" || phase === "exiting");
    const shouldExit = !open && (phase === "open" || phase === "entering");

    if (!shouldEnter && !shouldExit) return;

    // Starting a fresh transition — cancel any prior pending timer.
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
        seededForQueryRef.current = null;
        phaseTimerRef.current = null;
      }, EXIT_MS);
    }
  // We intentionally omit `audio` — the hook identity is stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase]);

  // Unmount-only cleanup: kill any stray timer when the component
  // actually goes away. Runs once on unmount because of the empty deps.
  useEffect(() => {
    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, []);

  // Seed the first question exactly once when the portal opens with an
  // initialQuery. Guarded by seededForQueryRef so React StrictMode
  // double-invocations don't send it twice.
  useEffect(() => {
    if (phase !== "entering" && phase !== "open") return;
    if (!initialQuery) return;
    if (seededForQueryRef.current === initialQuery) return;
    seededForQueryRef.current = initialQuery;
    // Delay slightly so the enter animation has breathing room
    const t = setTimeout(() => sendMessage(initialQuery), 900);
    return () => clearTimeout(t);
  // sendMessage changes across renders — we want this to fire only when
  // phase transitions / initialQuery changes, not when messages do.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, initialQuery]);

  // Lock body scroll while portal is showing
  useLayoutEffect(() => {
    if (phase === "closed") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  // Auto-focus input once portal is fully open
  useEffect(() => {
    if (phase !== "open") return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [phase]);

  // Keep transcript pinned to the newest message
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Escape → close
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
    sendMessage(input);
  };

  if (!mounted || phase === "closed") return null;

  return createPortal(
    <div
      className="cb-portal"
      data-phase={phase}
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

      {/* HUD — top strip with label + controls */}
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
            onClick={() => {
              abortRef.current?.abort();
              onClose();
            }}
            aria-label="Close portal"
            className="cb-portal-hud__btn cb-portal-hud__btn--close"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Stage — mascot rises here. Click anywhere on the stage plays a
          little "boop" sound alongside the mascot's built-in spark burst
          (which she handles internally via her own click handler). */}
      <div
        className="cb-portal-stage"
        onClick={() => audio.boop()}
        aria-hidden="true"
      >
        <ChamberBotMascot state={sceneState} className="cb-portal-mascot" />
      </div>

      {/* Transcript — conversation bubbles float to the right */}
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
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* Input — bottom center */}
      <form className="cb-portal-input" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            sceneState === "thinking"
              ? "ChamberBot is thinking…"
              : sceneState === "responding"
              ? "She's talking — ask when she's done"
              : "Ask another question…"
          }
          disabled={sceneState === "thinking" || sceneState === "responding"}
          aria-label="Ask the ChamberBot"
          className="cb-portal-input__field"
        />
        <button
          type="submit"
          disabled={!input.trim() || sceneState !== "idle"}
          aria-label="Send"
          className="cb-portal-input__send"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>

      {/* Hint chip — visible only on first open */}
      <div className="cb-portal-hint" aria-hidden={phase !== "open"}>
        Press <kbd>Esc</kbd> to return
      </div>
    </div>,
    document.body,
  );
}
