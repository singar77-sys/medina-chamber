import Image from "next/image";
import { personInitials, type Inductee } from "./shared";

/**
 * Photo, or a laurel-crest fallback when `inductee.photo` is unset.
 * Caller controls size/shape/border via `className` (aspect-square + rounded
 * corners for the grid, a fixed circle for the modal header).
 *
 * The fallback is deliberately uniform — solid oxford field, ghosted laurel
 * wreath, cambridge initials — so photo-less inductees read as an intentional
 * "crest" rather than a broken image. (The directory's hash-picked avatar
 * palette was designed for light surfaces; on this page it produced glaring
 * white tiles and invisible navy-on-navy initials.)
 */

/** Ghosted laurel wreath — two mirrored leaf branches. */
function LaurelMark() {
  const leaves = (
    <g>
      <ellipse cx="38" cy="86" rx="7.5" ry="3.2" transform="rotate(-16 38 86)" />
      <ellipse cx="28" cy="78" rx="7.5" ry="3.2" transform="rotate(-36 28 78)" />
      <ellipse cx="21" cy="67" rx="7.5" ry="3.2" transform="rotate(-56 21 67)" />
      <ellipse cx="17" cy="55" rx="7.5" ry="3.2" transform="rotate(-76 17 55)" />
      <ellipse cx="17" cy="43" rx="7.5" ry="3.2" transform="rotate(-96 17 43)" />
      <ellipse cx="20" cy="32" rx="7.5" ry="3.2" transform="rotate(-116 20 32)" />
      <ellipse cx="26" cy="23" rx="7.5" ry="3.2" transform="rotate(-136 26 23)" />
    </g>
  );
  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 h-full w-full p-[9%] text-white opacity-[0.09]"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {leaves}
      <g transform="scale(-1,1) translate(-100,0)">{leaves}</g>
    </svg>
  );
}

export function InducteeAvatar({
  inductee,
  className = "",
  textSize = "text-h3",
  imgSizes = "80px",
}: {
  inductee: Inductee;
  className?: string;
  textSize?: string;
  imgSizes?: string;
}) {
  const initials = personInitials(inductee.name);

  return (
    <div className={`relative overflow-hidden bg-bg-primary ${className}`}>
      {inductee.photo ? (
        <Image
          src={inductee.photo}
          alt={`${inductee.name}, Greater Medina Chamber of Commerce Hall of Fame inductee`}
          fill
          className="object-cover object-top"
          sizes={imgSizes}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-oxford">
          {/* Soft cambridge lift behind the initials */}
          <div
            className="absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 72% 62% at 50% 42%, rgba(131,188,169,0.16), transparent 72%)",
            }}
          />
          <LaurelMark />
          <span
            className={`relative ${textSize} font-bold select-none text-cambridge`}
          >
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}
