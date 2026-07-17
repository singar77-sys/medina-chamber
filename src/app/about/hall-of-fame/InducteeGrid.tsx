"use client";

import { useState } from "react";
import { InducteeAvatar } from "./InducteeAvatar";
import { InducteeModal } from "./InducteeModal";
import { type Inductee } from "./shared";

const GRID_SIZES =
  "(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw";

export function InducteeGrid({ inductees }: { inductees: Inductee[] }) {
  const [selected, setSelected] = useState<Inductee | null>(null);

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-f13 lg:gap-f21">
        {inductees.map((inductee) => (
          <figure key={inductee.name} className="m-0">
            {inductee.bio ? (
              <button
                type="button"
                onClick={() => setSelected(inductee)}
                className="group flex flex-col items-center gap-f8 w-full text-left"
              >
                <InducteeAvatar
                  inductee={inductee}
                  className="w-full aspect-square rounded-[var(--radius-lg)] border-2 border-cambridge/30 group-hover:border-cambridge transition-colors"
                  imgSizes={GRID_SIZES}
                />
                <p className="text-caption font-bold text-text-primary text-center leading-snug group-hover:text-cambridge transition-colors">
                  {inductee.name}
                </p>
              </button>
            ) : (
              <div className="flex flex-col items-center gap-f8">
                <InducteeAvatar
                  inductee={inductee}
                  className="w-full aspect-square rounded-[var(--radius-lg)] border border-border-secondary"
                  imgSizes={GRID_SIZES}
                />
                <p className="text-caption font-bold text-text-primary text-center leading-snug">
                  {inductee.name}
                </p>
              </div>
            )}
            <figcaption className="sr-only">
              {inductee.name}, Greater Medina Chamber of Commerce Hall of Fame inductee, Medina County, Ohio business leader
            </figcaption>
          </figure>
        ))}
      </div>

      {selected && (
        <InducteeModal inductee={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
