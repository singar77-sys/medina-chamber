import Image from "next/image";
import { getAvatarColor } from "@/data/members";
import { personInitials, type Inductee } from "./shared";

/**
 * Photo, or a colored initials fallback when `inductee.photo` is unset.
 * Caller controls size/shape/border via `className` (aspect-square + rounded
 * corners for the grid, a fixed circle for the modal header).
 */
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
  const avatarColor = getAvatarColor(inductee.name);

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
        <div className={`absolute inset-0 flex items-center justify-center ${avatarColor.bg}`}>
          <span className={`${textSize} font-bold select-none ${avatarColor.text}`}>
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}
