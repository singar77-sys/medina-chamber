"use client";

import { FadeIn } from "@/components/FadeIn";
import { CountUp } from "@/components/CountUp";

/**
 * RentalSpaceCards — the "The Vault / Main Room" stat cards.
 *
 * Differentiation chip top-right (Private / Flexible), CountUp on the
 * seat numbers, hover lift + cambridge border glow.
 */

interface Room {
  name: string;
  chip: string;
  seats: number;
  description: string;
}

const ROOMS: Room[] = [
  {
    name: "The Vault",
    chip: "Private",
    seats: 16,
    description:
      "Private conference room with the chamber's distinctive vault door. Board meetings, client presentations, strategy sessions.",
  },
  {
    name: "Main Room",
    chip: "Flexible",
    seats: 50,
    description:
      "Flexible training and seminar space. Configurable tables, presentation-ready AV, works for workshops through all-hands meetings.",
  },
];

export function RentalSpaceCards() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {ROOMS.map((room, i) => (
        <FadeIn key={room.name} delay={i * 120}>
          <div className="rsc-card">
            <div className="rsc-card__chip">{room.chip}</div>

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
              {room.description}
            </p>
          </div>
        </FadeIn>
      ))}
    </div>
  );
}
