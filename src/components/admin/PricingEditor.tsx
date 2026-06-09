"use client";

import { useState } from "react";
import type { PricingConfig, PricingTier } from "@/lib/cms-store";

interface Props {
  adminToken: string;
  initialPricing: PricingConfig;
  isOverridden: boolean;
  updatedAt: string | null;
}

export function PricingEditor({ adminToken, initialPricing, isOverridden, updatedAt }: Props) {
  const [tiers, setTiers] = useState<PricingTier[]>(initialPricing.tiers);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  function updateTier(index: number, patch: Partial<PricingTier>) {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
    setSaved(false);
  }

  function updateBenefits(index: number, raw: string) {
    const benefits = raw.split("\n").map((b) => b.trim()).filter(Boolean);
    updateTier(index, { benefits });
  }

  function updateAddedBenefits(index: number, raw: string) {
    const addedBenefits = raw.split("\n").map((b) => b.trim()).filter(Boolean);
    updateTier(index, { addedBenefits: addedBenefits.length ? addedBenefits : undefined });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ tiers, faqs: initialPricing.faqs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function resetToDefaults() {
    if (!confirm("Reset pricing to compiled defaults? This removes any custom values.")) return;
    setResetting(true);
    try {
      await fetch("/api/admin/pricing", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      window.location.reload();
    } catch {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isOverridden && updatedAt && (
            <span className="text-xs text-text-tertiary">
              Last saved {new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
          {!isOverridden && (
            <span className="text-xs text-text-tertiary">Using compiled defaults, no overrides saved</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOverridden && (
            <button
              onClick={resetToDefaults}
              disabled={resetting}
              className="text-xs text-text-tertiary hover:text-red-500 transition-colors"
            >
              Reset to defaults
            </button>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="text-sm px-5 py-2 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
            style={{ background: saved ? "#16a34a" : "var(--color-oxford)" }}
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save Pricing"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
        Saving updates both the pricing page and ChamberBot simultaneously, the bot picks up new prices within seconds.
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-3 gap-4">
        {tiers.map((tier, i) => (
          <TierCard
            key={tier.key}
            tier={tier}
            onUpdate={(patch) => updateTier(i, patch)}
            onUpdateBenefits={(raw) => updateBenefits(i, raw)}
            onUpdateAddedBenefits={(raw) => updateAddedBenefits(i, raw)}
          />
        ))}
      </div>
    </div>
  );
}

function TierCard({
  tier,
  onUpdate,
  onUpdateBenefits,
  onUpdateAddedBenefits,
}: {
  tier: PricingTier;
  onUpdate: (patch: Partial<PricingTier>) => void;
  onUpdateBenefits: (raw: string) => void;
  onUpdateAddedBenefits: (raw: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{
        borderColor: tier.featured ? "var(--color-cambridge)" : undefined,
        background: tier.featured ? "#f0faf7" : "#fff",
      }}
    >
      {tier.featured && (
        <span
          className="inline-block text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
          style={{ background: "var(--color-cambridge)", color: "#fff" }}
        >
          Most Popular
        </span>
      )}

      {/* Tier name */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-text-tertiary block mb-1">Tier Name</label>
        <input
          type="text"
          value={tier.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full text-sm font-bold text-text-primary border border-border-primary rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-cambridge/40"
        />
      </div>

      {/* Price */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-text-tertiary block mb-1">Annual Price ($)</label>
        <div className="flex items-center gap-1">
          <span className="text-text-tertiary text-sm">$</span>
          <input
            type="number"
            value={tier.price}
            min={1}
            onChange={(e) => onUpdate({ price: Math.max(1, parseInt(e.target.value) || 0) })}
            className="w-full text-2xl font-bold text-text-primary border border-border-primary rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cambridge/40"
          />
          <span className="text-text-tertiary text-xs whitespace-nowrap">/year</span>
        </div>
      </div>

      {/* Tagline */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-text-tertiary block mb-1">Tagline</label>
        <textarea
          value={tier.tagline}
          onChange={(e) => onUpdate({ tagline: e.target.value })}
          rows={3}
          className="w-full text-xs text-text-primary border border-border-primary rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-cambridge/40"
        />
      </div>

      {/* CTA */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-text-tertiary block mb-1">Button Text</label>
        <input
          type="text"
          value={tier.cta}
          onChange={(e) => onUpdate({ cta: e.target.value })}
          className="w-full text-xs border border-border-primary rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-cambridge/40"
        />
      </div>

      {/* Benefits toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-text-tertiary hover:text-gray-600 transition-colors w-full text-left"
        style={{ color: "var(--color-cambridge)" }}
      >
        {expanded ? "▲ Hide" : "▼ Edit"} benefits list
        <span className="text-text-tertiary ml-1">
          ({tier.addedBenefits ? tier.addedBenefits.length : tier.benefits.length} items)
        </span>
      </button>

      {expanded && (
        <div className="space-y-2">
          {tier.addedBenefits !== undefined ? (
            /* Plus / Investor — edit only the added benefits */
            <div>
              <label className="text-[10px] uppercase tracking-widest text-text-tertiary block mb-1">
                Added Benefits (one per line)
              </label>
              <textarea
                value={tier.addedBenefits.join("\n")}
                onChange={(e) => onUpdateAddedBenefits(e.target.value)}
                rows={tier.addedBenefits.length + 1}
                className="w-full text-xs border border-border-primary rounded-md px-2 py-1.5 resize-y focus:outline-none focus:ring-2 focus:ring-cambridge/40 font-mono"
              />
              <p className="text-[10px] text-text-tertiary mt-0.5">These appear as the "plus" section on the card</p>
            </div>
          ) : (
            /* Essentials — edit the full base benefits list */
            <div>
              <label className="text-[10px] uppercase tracking-widest text-text-tertiary block mb-1">
                Base Benefits (one per line, shared across all tiers)
              </label>
              <textarea
                value={tier.benefits.join("\n")}
                onChange={(e) => onUpdateBenefits(e.target.value)}
                rows={Math.min(tier.benefits.length + 2, 20)}
                className="w-full text-xs border border-border-primary rounded-md px-2 py-1.5 resize-y focus:outline-none focus:ring-2 focus:ring-cambridge/40 font-mono"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
