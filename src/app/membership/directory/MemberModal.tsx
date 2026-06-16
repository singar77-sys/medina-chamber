"use client";

import Link from "next/link";
import { type GraphNode } from "./graphData";
import { getAvatarInitial, getAvatarColor } from "@/data/members";

interface MemberModalProps {
  member: GraphNode;
  onClose: () => void;
}

function Initials({ name }: { name: string }) {
  const initial = getAvatarInitial(name);
  const color = getAvatarColor(name);
  return (
    <div className={`w-14 h-14 shrink-0 rounded-[var(--radius-md)] flex items-center justify-center font-bold text-h4 ${color.bg} ${color.text}`}>
      {initial}
    </div>
  );
}

export function MemberModal({ member, onClose }: MemberModalProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-oxford/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-bg-primary border-l border-border-secondary shadow-2xl flex flex-col overflow-hidden"
        style={{
          paddingTop: "env(safe-area-inset-top)",
        }}
      >

        {/* Header */}
        <div className="flex items-start gap-f13 p-f21 border-b border-border-secondary">
          {member.logoUrl ? (
            <img
              src={member.logoUrl}
              alt={member.name}
              className="w-14 h-14 shrink-0 object-contain rounded-[var(--radius-md)] bg-bg-secondary p-1"
            />
          ) : (
            <Initials name={member.name} />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-h4 leading-tight">{member.name}</h2>
            {member.city && (
              <p className="text-caption text-text-tertiary mt-f3">
                {member.city}, OH
              </p>
            )}
            {member.tier === "ci" && (
              <span className="inline-block mt-f5 px-f8 py-f3 bg-cambridge/10 text-cambridge text-caption font-bold rounded-full">
                Community Investor
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-text-tertiary hover:text-text-primary transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-f21 space-y-f21">
          {member.description && (
            <p className="text-body-sm text-text-secondary leading-relaxed">
              {member.description}
            </p>
          )}

          {member.categories && member.categories.length > 0 && (
            <div>
              <p className="text-caption text-text-tertiary uppercase tracking-wider mb-f8">
                Industries
              </p>
              <div className="flex flex-wrap gap-f8">
                {member.categories.map((cat) => (
                  <span
                    key={cat}
                    className="px-f8 py-f3 bg-bg-secondary border border-border-secondary text-caption text-text-secondary rounded-full"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-f13">
            {member.website && (
              <a
                href={
                  member.website.startsWith("http")
                    ? member.website
                    : `https://${member.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-f8 text-body-sm text-cambridge hover:text-cambridge/80 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span className="truncate">
                  {member.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </span>
              </a>
            )}
            {member.phone && (
              <a
                href={`tel:${member.phone.replace(/\D/g, "")}`}
                className="flex items-center gap-f8 text-body-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.61 5a2 2 0 0 1 1.99-2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 10.9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {member.phone}
              </a>
            )}
            {member.address && (
              <p className="flex items-start gap-f8 text-body-sm text-text-tertiary">
                <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {member.address}
              </p>
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div
          className="p-f21 border-t border-border-secondary"
          style={{ paddingBottom: "max(var(--spacing-f21), env(safe-area-inset-bottom))" }}
        >
          <Link
            href={`/membership/directory/${member.chamberSlug}`}
            className="
              block w-full text-center py-f13 px-f21
              bg-accent hover:bg-accent-hover
              text-white font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            View Full Profile →
          </Link>
        </div>
      </div>
    </>
  );
}
