"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { FadeIn } from "@/components/FadeIn";
import { CountUp } from "@/components/CountUp";

/**
 * RentalSpaceCards — clickable stat cards for The Vault + Main Room.
 *
 * Cards no longer reveal a photo on hover. Clicking a card opens a
 * split-pane modal with the room's hero photo on one side and the
 * detail (seats, description, perfect-for, features, CTAs) on the
 * other. Keyboard + touch friendly: Esc closes, scrim-tap closes,
 * body scroll is locked while open, and focus is moved to the close
 * button on open and restored to the originating card on close.
 */

interface Room {
  name: string;
  chip: "Private" | "Flexible";
  seats: number;
  description: string;
  /** One-line "what it's great for" — pulled from /programs/rental-space copy. */
  bestFor: string;
  /** Short feature list, one per bullet. */
  features: string[];
  /** Primary photo — hero of the card AND the modal. */
  photo: string;
}

const ROOMS: Room[] = [
  {
    name: "The Vault",
    chip: "Private",
    seats: 16,
    description:
      "A private, closed-door meeting space featuring the chamber's distinctive vault door, professional, memorable, and perfectly sized for focused collaboration.",
    bestFor:
      "Board meetings, client presentations, team strategy sessions.",
    features: [
      "Private room with original vault door",
      "Soundproof acoustics inside the vault",
      "98 inch flat screen for presentations",
      "Whiteboard for working sessions",
      "Conference seating for up to 16",
    ],
    photo: "/images/programs/rental-space/chamber-rental-space-medina-004.webp",
  },
  {
    name: "Main Room",
    chip: "Flexible",
    seats: 50,
    description:
      "A spacious, flexible room with configurable table arrangements to fit your event, from classroom-style training to panel discussions to all-hands meetings.",
    bestFor:
      "Workshops, seminars, training sessions, and larger team meetings.",
    features: [
      "Reconfigurable tables and chairs",
      "98 inch flat screen / AV display",
      "Presentation-ready setup",
      "Seats up to 50 people",
    ],
    photo: "/images/programs/rental-space/chamber-rental-space-medina-001.webp",
  },
];

const CONTACT_EMAIL = "memberservices@medinaohchamber.com";
const CONTACT_PHONE = "+13307238773";
const CONTACT_PHONE_DISPLAY = "(330) 723-8773";

export function RentalSpaceCards() {
  // Index of the active room, or null if the modal is closed. An
  // index rather than a Room lets us key the modal by it — remounting
  // the content when the selection changes so CountUp + Ken-Burns
  // restart from 0 each open.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Remember which card button triggered the modal so we can restore
  // focus to it on close — standard accessible dialog behavior.
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeRoom = activeIndex === null ? null : ROOMS[activeIndex];

  function openRoom(index: number) {
    setActiveIndex(index);
  }

  function closeRoom() {
    const i = activeIndex;
    setActiveIndex(null);
    // Return focus to the card that opened the modal.
    if (i !== null) {
      requestAnimationFrame(() => triggerRefs.current[i]?.focus());
    }
  }

  // Esc-to-close + body scroll lock while a room is active.
  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRoom();
    };
    document.addEventListener("keydown", onKey);
    // iOS Safari ignores overflow:hidden on <body>. position:fixed is the
    // reliable cross-platform scroll lock; restore scroll position on close.
    const y = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflowY = "scroll";
    return () => {
      document.removeEventListener("keydown", onKey);
      const top = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflowY = "";
      if (top) window.scrollTo(0, -parseInt(top, 10));
    };
    // closeRoom intentionally excluded — it only reads refs + setState,
    // reattaching on every render isn't useful and would churn listeners.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-4 items-stretch">
        {ROOMS.map((room, i) => (
          <FadeIn key={room.name} delay={i * 120} className="h-full">
            <button
              ref={(el) => {
                triggerRefs.current[i] = el;
              }}
              type="button"
              onClick={() => openRoom(i)}
              className="rsc-card"
              aria-haspopup="dialog"
              aria-label={`View ${room.name} details, seats ${room.seats}`}
            >
              <span className="rsc-card__chip">{room.chip}</span>

              <p className="text-caption text-cambridge font-bold uppercase tracking-wider">
                {room.name}
              </p>

              <p className="text-display text-oxford [[data-theme=dark]_&]:text-cambridge leading-none mt-2">
                <CountUp end={room.seats} duration={1400} />
              </p>
              <p className="text-caption text-text-tertiary uppercase tracking-wider mt-1">
                Seats
              </p>

              <p className="text-body-sm text-text-secondary mt-5 leading-relaxed">
                {room.description.split(".")[0] + "."}
              </p>

              {/* Affordance sits in normal flow directly below the
                  description — reads as a tight, button-native action
                  rather than a floating footer. */}
              <span className="rsc-card__cta" aria-hidden="true">
                View details
                <svg className="rsc-card__cta-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 2 L12 8 L5 14" />
                </svg>
              </span>
            </button>
          </FadeIn>
        ))}
      </div>

      {activeRoom && (
        <RoomModal key={activeIndex ?? ""} room={activeRoom} onClose={closeRoom} />
      )}
    </>
  );
}

/* ─── Modal ──────────────────────────────────────────────────────── */

function RoomModal({ room, onClose }: { room: Room; onClose: () => void }) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Focus the close button on open so keyboard users are in-dialog
  // immediately.
  useEffect(() => {
    requestAnimationFrame(() => closeBtnRef.current?.focus());
  }, []);

  // Portal-mount to document.body. Required because RentalSpaceCards
  // is rendered inside <FadeIn>, which applies `transform` and
  // `will-change: transform` to its wrapper. A `position: fixed`
  // descendant inside a transformed ancestor anchors to that
  // ancestor's box rather than the viewport — which made the modal
  // appear "stuck inside the container." document.body is outside
  // every transform context, so the scrim covers the viewport.
  //
  // Safe to call here: this component only mounts after a click on
  // a card (post-hydration), so document is always defined.
  const modalNode = (
    <div
      className="rsc-modal-scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rsc-modal-title"
      onClick={onClose}
    >
      {/* Inner wrapper stops scrim clicks from closing when the user
          interacts with the dialog content itself. */}
      <div
        className="rsc-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeBtnRef}
          type="button"
          className="rsc-modal__close"
          onClick={onClose}
          aria-label="Close room details"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M5 5 L15 15 M15 5 L5 15" />
          </svg>
        </button>

        {/* Photo panel — hero of the dialog. Ken Burns on open. */}
        <div className="rsc-modal__photo">
          {/* No `priority` — this photo only renders after the user clicks
              a card to open the modal, so it's never the page LCP. Letting
              next/image lazy-load it on demand keeps it off the initial
              request path. */}
          <Image
            src={room.photo}
            alt={`${room.name} at the Greater Medina Chamber`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="rsc-modal__photo-img"
          />
          <span className="rsc-modal__chip">{room.chip}</span>
        </div>

        {/* Detail panel */}
        <div className="rsc-modal__body">
          <p className="text-caption text-cambridge font-bold uppercase tracking-wider">
            Meeting Space
          </p>
          <h3
            id="rsc-modal-title"
            className="text-h1 text-text-primary leading-[0.95] mt-2"
          >
            {room.name}
          </h3>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-h2 text-accent leading-none">
              <CountUp end={room.seats} duration={1400} />
            </span>
            <span className="text-caption text-text-tertiary uppercase tracking-wider font-bold">
              Seats
            </span>
          </div>

          <p className="text-body text-text-secondary mt-6 leading-relaxed">
            {room.description}
          </p>

          <div className="rsc-modal__section">
            <p className="text-overline text-cambridge mb-2">Perfect for</p>
            <p className="text-body-sm text-text-secondary">{room.bestFor}</p>
          </div>

          <div className="rsc-modal__section">
            <p className="text-overline text-cambridge mb-3">What's included</p>
            <ul className="rsc-modal__features">
              {room.features.map((f) => (
                <li key={f}>
                  <svg className="rsc-modal__check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8 L7 12 L13 4" />
                  </svg>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rsc-modal__actions">
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${room.name} rental inquiry`)}`}
              className="rsc-modal__btn rsc-modal__btn--primary"
            >
              Check Availability
              <span aria-hidden="true"> →</span>
            </a>
            <a
              href={`tel:${CONTACT_PHONE}`}
              className="rsc-modal__btn rsc-modal__btn--ghost"
            >
              {CONTACT_PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
