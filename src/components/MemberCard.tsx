import Link from "next/link";
import Image from "next/image";
import { type Member, extractCity, isCommunityInvestor } from "@/data/members";

interface MemberCardProps {
  member: Member;
}

/** Location + phone rows, shared by both card tiers. */
function ContactRows({ city, phone }: { city: string; phone: string }) {
  if (!city && !phone) return null;
  return (
    <div className="mt-3 flex flex-col gap-1">
      {city && (
        <p className="text-caption text-text-tertiary flex items-center gap-1.5">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a5 5 0 0 0-5 5c0 3.5 5 9 5 9s5-5.5 5-9a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
          </svg>
          {city}, OH
        </p>
      )}
      {phone && (
        <p className="text-caption text-text-tertiary flex items-center gap-1.5">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.6 17.6 0 0 0 4.168 6.608 17.6 17.6 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.68.68 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.68.68 0 0 0-.122-.58L3.654 1.328z" />
          </svg>
          {phone}
        </p>
      )}
    </div>
  );
}

/** Extra-categories badge, shared by both card tiers. */
function MoreCategories({ count }: { count: number }) {
  if (count < 2) return null;
  return (
    <p className="mt-auto pt-3 text-caption text-text-tertiary">
      +{count - 1} more {count - 1 === 1 ? "category" : "categories"}
    </p>
  );
}

export function MemberCard({ member }: MemberCardProps) {
  const city = member.city || extractCity(member.address);
  const primaryCategory = member.categories[0] ?? "";
  const isCi = isCommunityInvestor(member);

  // The prominent logo header is the Community Investor perk — but only when the
  // CI actually has a logo on file. A CI without one (and every non-CI) gets the
  // clean, name-forward card instead of a repetitive first-letter tile; adding a
  // logo later simply upgrades that CI to the full header treatment.
  const hasLogoHeader = isCi && !!member.logoUrl;

  return (
    <Link
      href={`/membership/directory/${member.chamberSlug}`}
      className={`
        group flex flex-col
        bg-bg-primary border
        rounded-[var(--radius-lg)]
        hover:shadow-[var(--shadow-md)]
        transition-all duration-200
        overflow-hidden
        ${isCi
          ? "border-cambridge/40 hover:border-cambridge"
          : "border-border-secondary hover:border-border-primary"}
      `}
    >
      {hasLogoHeader && (
        // White tile — the curated logos are designed for a white background
        // (the marquee shows them the same way), so this reads correctly in
        // both light and dark mode.
        <div className="relative h-28 flex items-center justify-center border-b border-border-secondary overflow-hidden bg-white">
          <Image
            src={member.logoUrl}
            alt={`${member.name} logo, Greater Medina Chamber of Commerce member business`}
            fill
            className="object-contain p-4 mix-blend-multiply"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized
          />
        </div>
      )}

      <div className="flex flex-col flex-1 p-5">
        {isCi && (
          <p className="text-overline text-accent mb-f5">Community Investor</p>
        )}

        <h3
          className={`
            ${hasLogoHeader ? "text-body" : "text-body-lg"}
            font-bold text-text-primary leading-snug
            group-hover:text-accent transition-colors
          `}
        >
          {member.name}
        </h3>

        {primaryCategory && (
          isCi ? (
            <p className="text-caption text-cambridge mt-1 truncate">{primaryCategory}</p>
          ) : (
            <span className="mt-2 inline-flex self-start items-center rounded-full px-2.5 py-0.5 text-caption font-medium bg-cambridge/15 text-cambridge">
              {primaryCategory}
            </span>
          )
        )}

        <ContactRows city={city} phone={member.phone} />
        <MoreCategories count={member.categories.length} />
      </div>
    </Link>
  );
}
