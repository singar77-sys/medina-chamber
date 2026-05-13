"use client";

import { useState, useMemo } from "react";
import type { SCFiscalYear, SCCompanyRecord } from "@/data/safety-council-attendance";

type Status = "qualified" | "on_track" | "at_risk" | "cannot_qualify" | "not_enrolled";

function getStatus(company: SCCompanyRecord, required: number): Status {
  if (!company.enrolled) return "not_enrolled";
  const credits =
    company.attendance.filter((a) => a === true).length +
    company.externalCredits +
    (company.onsiteCredit ? 1 : 0);
  const remaining = company.attendance.filter((a) => a === null).length;
  const maxPossible = credits + remaining;
  if (credits >= required) return "qualified";
  if (maxPossible >= required && credits >= required - 2) return "on_track";
  if (maxPossible >= required) return "at_risk";
  return "cannot_qualify";
}

const STATUS_CONFIG: Record<Status, { label: string; classes: string }> = {
  qualified:       { label: "Qualified ✓",     classes: "bg-emerald/20 text-emerald border border-emerald/30" },
  on_track:        { label: "On Track",         classes: "bg-cambridge/15 text-cambridge border border-cambridge/30" },
  at_risk:         { label: "At Risk",          classes: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
  cannot_qualify:  { label: "Cannot Qualify",   classes: "bg-red-500/15 text-red-400 border border-red-500/25" },
  not_enrolled:    { label: "Not Enrolled",     classes: "bg-bg-tertiary text-text-tertiary border border-border-secondary" },
};

interface Props {
  fy: SCFiscalYear;
}

export function AttendanceViewer({ fy }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");

  const enriched = useMemo(
    () =>
      fy.companies
        .map((c) => ({ ...c, status: getStatus(c, fy.required) }))
        .sort((a, b) => a.companyName.localeCompare(b.companyName)),
    [fy]
  );

  const stats = useMemo(() => {
    const enrolled = enriched.filter((c) => c.enrolled).length;
    const qualified = enriched.filter((c) => c.status === "qualified").length;
    const onTrack = enriched.filter((c) => c.status === "on_track").length;
    const atRisk = enriched.filter((c) => c.status === "at_risk").length;
    const cannotQualify = enriched.filter((c) => c.status === "cannot_qualify").length;
    return { enrolled, qualified, onTrack, atRisk, cannotQualify };
  }, [enriched]);

  const filtered = useMemo(
    () =>
      enriched.filter((c) => {
        const matchSearch = c.companyName.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "all" || c.status === filter;
        return matchSearch && matchFilter;
      }),
    [enriched, search, filter]
  );

  const completedCount = fy.meetings.filter((m) => m.completed).length;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-f13 mb-f34">
        {[
          { label: "Enrolled", value: stats.enrolled, sub: "in rebate program" },
          { label: "Qualified", value: stats.qualified, sub: "already at 10+", accent: "text-emerald" },
          { label: "On Track", value: stats.onTrack, sub: "likely to qualify", accent: "text-cambridge" },
          { label: "At Risk", value: stats.atRisk + stats.cannotQualify, sub: "need attention", accent: "text-amber-400" },
        ].map((s) => (
          <div
            key={s.label}
            className="p-f13 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
          >
            <p className={`text-h3 font-bold ${s.accent ?? "text-text-primary"}`}>{s.value}</p>
            <p className="text-body-sm font-bold text-text-primary mt-f3">{s.label}</p>
            <p className="text-caption text-text-tertiary">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-f13 mb-f21">
        <input
          type="search"
          placeholder="Search company name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="
            flex-1 px-f13 py-f8
            bg-bg-secondary border border-border-secondary rounded-[var(--radius-md)]
            text-body-sm text-text-primary placeholder:text-text-tertiary
            focus:outline-none focus:border-cambridge
            transition-colors
          "
        />
        <div className="flex gap-f8 flex-wrap">
          {(["all", "qualified", "on_track", "at_risk", "cannot_qualify", "not_enrolled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`
                px-f8 py-f5 rounded-full text-caption font-bold border transition-colors
                ${filter === s
                  ? "bg-cambridge text-white border-cambridge"
                  : "bg-bg-secondary text-text-tertiary border-border-secondary hover:border-cambridge/50"
                }
              `}
            >
              {s === "all" ? "All" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Progress note */}
      <p className="text-caption text-text-tertiary mb-f13">
        {completedCount} of {fy.meetings.length} meetings completed · {fy.meetings.length - completedCount} remaining ·
        Updated {new Date(fy.lastUpdated).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border-secondary">
        <table className="w-full min-w-[860px] text-left border-collapse">
          <thead>
            <tr className="bg-bg-secondary border-b border-border-secondary">
              <th className="px-f13 py-f8 text-caption font-bold text-text-tertiary uppercase tracking-wider w-[220px]">
                Company
              </th>
              <th className="px-f8 py-f8 text-caption font-bold text-text-tertiary uppercase tracking-wider w-[120px]">
                Status
              </th>
              {fy.meetings.map((m) => (
                <th
                  key={m.date}
                  className={`px-[3px] py-f8 text-caption font-bold uppercase tracking-wider text-center w-8 ${
                    m.completed ? "text-text-tertiary" : "text-text-tertiary/50"
                  }`}
                >
                  {m.label}
                </th>
              ))}
              <th className="px-f8 py-f8 text-caption font-bold text-text-tertiary uppercase tracking-wider text-center">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={fy.meetings.length + 3} className="px-f13 py-f21 text-body-sm text-text-tertiary text-center">
                  No companies match your search.
                </td>
              </tr>
            )}
            {filtered.map((company, i) => {
              const credits =
                company.attendance.filter((a) => a === true).length +
                company.externalCredits +
                (company.onsiteCredit ? 1 : 0);
              const cfg = STATUS_CONFIG[company.status];
              return (
                <tr
                  key={company.companyName}
                  className={`border-b border-border-secondary last:border-0 ${
                    i % 2 === 0 ? "bg-bg-primary" : "bg-bg-secondary/40"
                  }`}
                >
                  <td className="px-f13 py-f8">
                    <span className="text-body-sm font-medium text-text-primary">{company.companyName}</span>
                    {(company.externalCredits > 0 || company.onsiteCredit) && (
                      <span className="ml-f5 text-caption text-cambridge">
                        +{company.externalCredits + (company.onsiteCredit ? 1 : 0)} ext
                      </span>
                    )}
                  </td>
                  <td className="px-f8 py-f8">
                    <span className={`inline-flex items-center px-f8 py-[3px] rounded-full text-caption font-bold ${cfg.classes}`}>
                      {cfg.label}
                    </span>
                  </td>
                  {company.attendance.map((a, idx) => {
                    const meeting = fy.meetings[idx];
                    return (
                      <td key={idx} className="px-[3px] py-f8 text-center">
                        <span
                          className={`
                            inline-block w-5 h-5 rounded-sm
                            ${a === true
                              ? "bg-cambridge"
                              : a === false && meeting.completed
                              ? "bg-red-400/30 border border-red-400/40"
                              : "border border-border-secondary"
                            }
                          `}
                          title={
                            a === true
                              ? `Attended ${meeting.label}`
                              : a === false && meeting.completed
                              ? `Missed ${meeting.label}`
                              : `${meeting.label} — upcoming`
                          }
                        />
                      </td>
                    );
                  })}
                  <td className="px-f8 py-f8 text-center">
                    <span
                      className={`text-body-sm font-bold tabular-nums ${
                        credits >= fy.required
                          ? "text-emerald"
                          : credits >= fy.required - 2
                          ? "text-cambridge"
                          : credits >= fy.required - 4
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {credits}
                      <span className="text-text-tertiary font-normal">/{fy.required}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-f13 text-caption text-text-tertiary">
        Showing {filtered.length} of {enriched.length} companies
      </p>
    </div>
  );
}
