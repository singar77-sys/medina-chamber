"use client";

import { useState } from "react";
import Link from "next/link";

// ── Membership cost ────────────────────────────────────────────────────────────
const ESSENTIALS_PRICE = 345;

// ── Conservative assumption rates (displayed inline — nothing hidden) ──────────
const BWC_RATE    = 0.18;  // Ohio BWC group experience rating average savings
const ENERGY_RATE = 0.08;  // CEA program conservative savings rate
const SAFETY_FEE  = 100;   // Annual Safety Council fee for non-members

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

interface SliderRowProps {
  label: string;
  sublabel?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  onChange: (n: number) => void;
}

function SliderRow({ label, sublabel, value, min, max, step, prefix = "", suffix = "", onChange }: SliderRowProps) {
  function handleInput(raw: string) {
    const n = parseInt(raw.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(n)) onChange(clamp(n, min, max));
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-f8">
        <div>
          <p className="text-body font-bold text-text-primary">{label}</p>
          {sublabel && <p className="text-caption text-text-tertiary mt-f3">{sublabel}</p>}
        </div>
        <div className="flex items-center gap-f3 ml-f13">
          {prefix && <span className="text-body-sm text-text-tertiary">{prefix}</span>}
          <input
            type="text"
            inputMode="numeric"
            value={value.toLocaleString("en-US")}
            onChange={(e) => handleInput(e.target.value)}
            className="w-28 text-right text-body font-bold text-text-primary bg-bg-secondary border border-border-secondary rounded-[var(--radius-sm)] px-f8 py-f5 focus:outline-none focus:ring-2 focus:ring-cambridge/40"
          />
          {suffix && <span className="text-body-sm text-text-tertiary">{suffix}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cambridge h-1.5 rounded-full cursor-pointer"
      />
      <div className="flex justify-between mt-f5">
        <span className="text-caption text-text-tertiary">{prefix}{min.toLocaleString("en-US")}{suffix}</span>
        <span className="text-caption text-text-tertiary">{prefix}{max.toLocaleString("en-US")}{suffix}</span>
      </div>
    </div>
  );
}

// ── Main calculator ────────────────────────────────────────────────────────────

export function RoiCalculator() {
  const [bwcPremium,    setBwcPremium]    = useState(25_000);
  const [employees,     setEmployees]     = useState(8);
  const [monthlyEnergy, setMonthlyEnergy] = useState(1_500);

  // Savings calculations
  const bwcSavings     = Math.round(bwcPremium * BWC_RATE);
  const energySavings  = Math.round(monthlyEnergy * 12 * ENERGY_RATE);
  const totalSavings   = bwcSavings + SAFETY_FEE + energySavings;
  const netValue       = totalSavings - ESSENTIALS_PRICE;
  const breakEvenDays  = totalSavings > 0 ? Math.ceil(ESSENTIALS_PRICE / (totalSavings / 365)) : null;

  const isPositive = netValue > 0;

  return (
    <div className="grid lg:grid-cols-[1fr_420px] gap-f34 items-start">

      {/* ── Inputs ── */}
      <div className="space-y-f34">
        <div className="p-f21 lg:p-f34 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
          <h2 className="text-h3 mb-f5">Tell us about your business</h2>
          <p className="text-body-sm text-text-secondary mb-f21">
            Adjust the sliders to match your situation. We use conservative,
            verified averages — actual savings are often higher.
          </p>

          <div className="space-y-f34">
            <SliderRow
              label="Annual Ohio BWC premium"
              sublabel="What you pay per year in workers' compensation premiums"
              value={bwcPremium}
              min={0}
              max={500_000}
              step={1_000}
              prefix="$"
              onChange={setBwcPremium}
            />
            <SliderRow
              label="Number of employees"
              sublabel="Including yourself"
              value={employees}
              min={1}
              max={100}
              step={1}
              suffix=" people"
              onChange={setEmployees}
            />
            <SliderRow
              label="Monthly energy spend"
              sublabel="Combined electric and gas bills for your location"
              value={monthlyEnergy}
              min={0}
              max={20_000}
              step={100}
              prefix="$"
              onChange={setMonthlyEnergy}
            />
          </div>
        </div>

        {/* Assumptions */}
        <div className="px-f21 py-f13 bg-bg-primary border border-border-secondary rounded-[var(--radius-md)]">
          <p className="text-caption font-bold text-text-tertiary uppercase tracking-wider mb-f8">Assumptions used</p>
          <ul className="space-y-f5 text-caption text-text-tertiary">
            <li>BWC savings: {(BWC_RATE * 100).toFixed(0)}% of annual premium — Ohio group experience rating historical average</li>
            <li>Safety Council: $100/year avoided — fee non-members pay to participate</li>
            <li>Energy: {(ENERGY_RATE * 100).toFixed(0)}% of annual spend — CEA program conservative estimate</li>
            <li>Membership cost: Essentials tier at ${ESSENTIALS_PRICE}/year</li>
          </ul>
        </div>
      </div>

      {/* ── Output panel ── */}
      <div className="lg:sticky lg:top-f34">
        <div className="p-f21 lg:p-f34 bg-oxford text-white rounded-[var(--radius-lg)]">
          <p className="text-caption font-bold text-cambridge uppercase tracking-wider mb-f21">Your estimated annual value</p>

          {/* Line items */}
          <div className="space-y-f13 pb-f21 border-b border-white/10">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-body-sm font-bold">BWC Safety Council savings</p>
                <p className="text-caption text-white/50 mt-f3">{(BWC_RATE * 100).toFixed(0)}% of {fmt(bwcPremium)} premium</p>
              </div>
              <span className={`text-body font-bold tabular-nums ${bwcSavings > 0 ? "text-emerald" : "text-white/40"}`}>
                {bwcSavings > 0 ? `+${fmt(bwcSavings)}` : "—"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <p className="text-body-sm font-bold">Safety Council fee avoided</p>
                <p className="text-caption text-white/50 mt-f3">Non-members pay $100/year</p>
              </div>
              <span className="text-body font-bold tabular-nums text-emerald">+{fmt(SAFETY_FEE)}</span>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <p className="text-body-sm font-bold">Energy program savings</p>
                <p className="text-caption text-white/50 mt-f3">{(ENERGY_RATE * 100).toFixed(0)}% of {fmt(monthlyEnergy * 12)}/yr spend</p>
              </div>
              <span className={`text-body font-bold tabular-nums ${energySavings > 0 ? "text-emerald" : "text-white/40"}`}>
                {energySavings > 0 ? `+${fmt(energySavings)}` : "—"}
              </span>
            </div>
          </div>

          <div className="py-f13 border-b border-white/10">
            <div className="flex justify-between items-center">
              <p className="text-body-sm font-bold text-white/70">Total annual savings</p>
              <span className="text-body font-bold tabular-nums text-cambridge">{fmt(totalSavings)}</span>
            </div>
            <div className="flex justify-between items-center mt-f8">
              <p className="text-body-sm font-bold text-white/70">Essentials membership</p>
              <span className="text-body font-bold tabular-nums text-white/60">−{fmt(ESSENTIALS_PRICE)}</span>
            </div>
          </div>

          {/* Net value — the headline number */}
          <div className="pt-f21">
            <div className="flex justify-between items-baseline">
              <p className="text-body font-bold">Net annual value</p>
              <span className={`text-display leading-none font-bold tabular-nums ${isPositive ? "text-emerald" : "text-white/40"}`}>
                {isPositive ? `+${fmt(netValue)}` : fmt(netValue)}
              </span>
            </div>
            {breakEvenDays !== null && isPositive && (
              <p className="text-caption text-cambridge mt-f8">
                Membership pays for itself in {breakEvenDays} {breakEvenDays === 1 ? "day" : "days"}.
              </p>
            )}
          </div>

          {/* What's not counted */}
          <div className="mt-f21 pt-f21 border-t border-white/10">
            <p className="text-caption font-bold text-white/50 uppercase tracking-wider mb-f8">Not counted above</p>
            <ul className="space-y-f5 text-caption text-white/50">
              <li>→ Business referrals from member directory &amp; events</li>
              <li>→ Group health insurance access (2–49 employees)</li>
              <li>→ HR and payroll support via VensureHR</li>
              <li>→ 20% MCRC discount for your {employees.toLocaleString()} {employees === 1 ? "employee" : "employees"}</li>
            </ul>
          </div>

          <Link
            href="/membership/join"
            className="mt-f21 block w-full text-center py-f13 px-f21 bg-accent hover:bg-accent-hover text-white font-bold text-body rounded-[var(--radius-md)] transition-colors"
          >
            Join for {fmt(ESSENTIALS_PRICE)}/year →
          </Link>
          <p className="mt-f8 text-caption text-white/40 text-center">
            Visibility Plus and Community Investor tiers available.{" "}
            <Link href="/membership/pricing" className="underline underline-offset-2 hover:text-white/60 transition-colors">
              Compare tiers →
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}
