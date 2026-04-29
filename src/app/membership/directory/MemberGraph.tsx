"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { type Member } from "@/data/members";
import { buildGraphData, type GraphNode, type GraphLink } from "./graphData";
import { MemberModal } from "./MemberModal";

// Dynamic import — canvas doesn't exist on server
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: "#0C1B33" }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-10 h-10">
          <span className="absolute inset-0 rounded-full border-2 border-cambridge/10" />
          <span className="absolute inset-0 rounded-full border-2 border-t-cambridge animate-spin" />
        </div>
        <p style={{ color: "rgba(131,188,169,0.35)", fontSize: 12, letterSpacing: "0.1em" }}>
          BUILDING NETWORK
        </p>
      </div>
    </div>
  ),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

// ── Color palette (raw hex — CSS vars unavailable in canvas) ─────────────
const C = {
  bg:          "#0C1B33",
  // Member tiers
  ci:          "#83BCA9",                  // cambridge teal
  ciRgb:       "131,188,169",
  vp:          "#FF6233",                  // dark-mode text-accent (5.9:1 on oxford-blue)
  vpRgb:       "255,98,51",
  standard:    "rgba(131,188,169,0.58)",
  dimmed:      "rgba(131,188,169,0.025)",
  // Hub nodes — brighter so they're visible on dark bg
  cat:         "#00B894",                  // bright teal-green (was #005450 — too dark)
  catRgb:      "0,184,148",
  catDim:      "rgba(0,184,148,0.06)",
  city:        "#4D8EBA",                  // steel blue (was #1E3A5F — invisible on dark)
  cityRgb:     "77,142,186",
  // Links
  link:        "rgba(131,188,169,0.038)",
  linkActive:  "rgba(0,184,148,0.42)",
} as const;

function resolveColor(
  node: GraphNode,
  activeCat: string | null,
  search: string,
): string {
  if (node.type === "category") {
    return activeCat && activeCat !== node.name ? C.catDim : C.cat;
  }
  if (node.type === "city") return C.city;

  const catOk  = !activeCat || node.categories?.includes(activeCat);
  const termOk = !search    ||
    node.name.toLowerCase().includes(search.toLowerCase()) ||
    node.description?.toLowerCase().includes(search.toLowerCase());

  if (!catOk || !termOk) return C.dimmed;
  if (node.tier === "ci")  return C.ci;
  if (node.tier === "vp")  return C.vp;
  return C.standard;
}

interface MemberGraphProps {
  members: Member[];
  categories: string[];
}

export function MemberGraph({ members, categories }: MemberGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef        = useRef<any>(null);
  const startTimeRef = useRef(Date.now());

  const [dimensions, setDimensions]           = useState({ width: 800, height: 700 });
  const [selectedMember, setSelectedMember]   = useState<GraphNode | null>(null);
  const [hoveredId, setHoveredId]             = useState<string | null>(null);
  const [search, setSearch]                   = useState("");
  const [activeCategory, setActiveCategory]   = useState<string | null>(null);
  const [engineStopped, setEngineStopped]     = useState(false);

  // Refs for canvas RAF callbacks — no stale closures
  const activeCatRef = useRef<string | null>(null);
  const searchRef    = useRef<string>("");
  const hoveredIdRef = useRef<string | null>(null);
  activeCatRef.current = activeCategory;
  searchRef.current    = search;
  hoveredIdRef.current = hoveredId;

  const graphData = useMemo(() => buildGraphData(members), [members]);

  // ── Responsive sizing ─────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    setDimensions({ width: el.offsetWidth, height: el.offsetHeight });
    return () => ro.disconnect();
  }, []);

  // ── Custom D3 forces ──────────────────────────────────────────────────
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const charge = fg.d3Force("charge");
    if (charge) charge.strength((n: GraphNode) =>
      n.type === "category" ? -700 : n.type === "city" ? -220 : -65
    );
    const link = fg.d3Force("link");
    if (link) link.distance(55).strength(0.55);
    fg.d3ReheatSimulation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData]);

  // ── Zoom to fit once simulation settles ───────────────────────────────
  const handleEngineStop = useCallback(() => {
    if (!engineStopped) {
      fgRef.current?.zoomToFit(700, 80);
      setEngineStopped(true);
    }
  }, [engineStopped]);

  // ── Canvas node renderer ──────────────────────────────────────────────
  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x     = node.x ?? 0;
      const y     = node.y ?? 0;
      const cat   = activeCatRef.current;
      const q     = searchRef.current;
      const hov   = hoveredIdRef.current;
      const color = resolveColor(node, cat, q);
      const isHov = node.id === hov;
      const t     = (Date.now() - startTimeRef.current) / 1000;

      // ── Category hub ─────────────────────────────────────────────────
      if (node.type === "category") {
        const r     = 11;
        const isDim = !!(cat && cat !== node.name);
        const isAct = cat === node.name;

        if (!isDim) {
          // Animated outer ring — gentle pulse
          const pulse = 0.4 + 0.3 * Math.sin(t * Math.PI * 2 * 0.5);
          ctx.beginPath();
          ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${C.catRgb},${(pulse * 0.18).toFixed(3)})`;
          ctx.lineWidth   = 1.2;
          ctx.stroke();

          // Steady mid ring (brighter when active)
          ctx.beginPath();
          ctx.arc(x, y, r * 2, 0, Math.PI * 2);
          ctx.strokeStyle = isAct
            ? `rgba(${C.catRgb},0.7)`
            : `rgba(${C.catRgb},0.28)`;
          ctx.lineWidth   = isAct ? 1.6 : 0.9;
          ctx.stroke();

          // Ambient glow
          const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
          grd.addColorStop(0, isAct
            ? `rgba(${C.catRgb},0.32)`
            : `rgba(${C.catRgb},0.14)`);
          grd.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath();
          ctx.arc(x, y, r * 5, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        // Core circle
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = isDim ? C.catDim : C.cat;
        ctx.fill();

        // Inner white center dot — precision crosshair feel
        if (!isDim) {
          ctx.beginPath();
          ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.fill();
        }

        // Label
        const fs = Math.max(11 / globalScale, 1.5);
        ctx.font         = `700 ${fs}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle    = isDim ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.92)";
        ctx.textAlign    = "center";
        ctx.textBaseline = "top";
        const lbl = node.name.length > 22 ? node.name.slice(0, 20) + "…" : node.name;
        ctx.fillText(lbl, x, y + r + 4 / globalScale);
        return;
      }

      // ── City hub ──────────────────────────────────────────────────────
      if (node.type === "city") {
        const r = 4;
        // Subtle ambient glow
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        grd.addColorStop(0, `rgba(${C.cityRgb},0.22)`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(x, y, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = C.city;
        ctx.fill();

        // Outer ring
        ctx.beginPath();
        ctx.arc(x, y, r + 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${C.cityRgb},0.3)`;
        ctx.lineWidth   = 0.7;
        ctx.stroke();

        const fs = Math.max(8.5 / globalScale, 1);
        ctx.font         = `${fs}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle    = `rgba(${C.cityRgb},0.55)`;
        ctx.textAlign    = "center";
        ctx.textBaseline = "top";
        ctx.fillText(node.name, x, y + r + 2 / globalScale);
        return;
      }

      // ── Member node ───────────────────────────────────────────────────
      const baseR = node.tier === "ci" ? 5 : node.tier === "vp" ? 3.2 : 2;
      const r     = isHov ? baseR * 1.6 : baseR;
      const isDim = color === C.dimmed;
      const rgb   = node.tier === "ci" ? C.ciRgb : node.tier === "vp" ? C.vpRgb : C.ciRgb;

      // CI — pulsing glow ring (phase-offset by position for organic feel)
      if (node.tier === "ci" && !isDim) {
        const phase = (node.x ?? 0) * 0.3 + (node.y ?? 0) * 0.2;
        const pulse = 0.38 + 0.28 * Math.sin(t * Math.PI * 2 * 0.65 + phase);

        // Glow field
        const grd = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 6);
        grd.addColorStop(0, `rgba(${rgb},${(pulse * 0.5).toFixed(3)})`);
        grd.addColorStop(0.5, `rgba(${rgb},${(pulse * 0.15).toFixed(3)})`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(x, y, r * 6, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Pulse ring
        ctx.beginPath();
        ctx.arc(x, y, r + 2.8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb},${(pulse * 0.65).toFixed(3)})`;
        ctx.lineWidth   = 1.1;
        ctx.stroke();
      }

      // VP — steady accent glow
      if (node.tier === "vp" && !isDim) {
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 4.5);
        grd.addColorStop(0, `rgba(${rgb},0.38)`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(x, y, r * 4.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // Hover glow (all tiers)
      if (isHov && !isDim) {
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
        grd.addColorStop(0, `rgba(${rgb},0.55)`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(x, y, r * 5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // Core dot
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Labels: CI always visible at normal zoom; others on hover or deep zoom
      const showLabel = node.tier === "ci"
        ? (!isDim && globalScale > 0.75)
        : (isHov || globalScale > 4);

      if (showLabel) {
        const fs = Math.max(node.tier === "ci" ? 9.5 / globalScale : 9 / globalScale, 1.4);
        ctx.font         = `${node.tier === "ci" ? "600 " : ""}${fs}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle    = isDim ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.92)";
        ctx.textAlign    = "center";
        ctx.textBaseline = "top";
        const lbl = node.name.length > 26 ? node.name.slice(0, 24) + "…" : node.name;
        ctx.fillText(lbl, x, y + r + 2 / globalScale);
      }
    },
    [],
  );

  // ── Link color ────────────────────────────────────────────────────────
  const getLinkColor = useCallback(
    (link: GraphLink) => {
      if (!activeCategory) return C.link;
      const tid = typeof link.target === "object"
        ? (link.target as GraphNode).id
        : link.target;
      return tid === `cat:${activeCategory}` ? C.linkActive : C.link;
    },
    [activeCategory],
  );

  // ── Node physics weight ───────────────────────────────────────────────
  const getNodeVal = useCallback((node: GraphNode) => {
    if (node.type === "category") return 100;
    if (node.type === "city")     return 20;
    if (node.tier === "ci")       return 10;
    if (node.tier === "vp")       return 6;
    return 3;
  }, []);

  // ── Interactions ──────────────────────────────────────────────────────
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.type === "member") {
      setSelectedMember(node);
    } else if (node.type === "category") {
      setActiveCategory((prev) => (prev === node.name ? null : node.name));
    }
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredId(node?.id ?? null);
    const canvas = containerRef.current?.querySelector("canvas") as HTMLElement | null;
    if (canvas) canvas.style.cursor = node?.type === "member" ? "pointer" : "default";
  }, []);

  const clearFilters = () => { setSearch(""); setActiveCategory(null); };
  const hasFilters   = !!(search || activeCategory);

  const catCount = useMemo(
    () => new Set(members.flatMap((m) => m.categories)).size,
    [members],
  );

  // ── Shared inline style parts ─────────────────────────────────────────
  const glass = {
    background:    "rgba(12,27,51,0.88)",
    backdropFilter: "blur(16px)",
    border:        "1px solid rgba(131,188,169,0.14)",
    boxShadow:     "0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(131,188,169,0.07)",
  } as const;

  return (
    <div className="relative w-full" style={{ height: "85vh", background: C.bg }}>

      {/* ── HUD Controls ─────────────────────────────────────── */}
      <div className="absolute top-5 left-5 z-10">
        <div style={{ ...glass, display: "flex", flexDirection: "column", gap: 8, padding: 14, borderRadius: 12, minWidth: 224 }}>

          {/* Live indicator + count */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#00B894",
              boxShadow: "0 0 7px rgba(0,184,148,0.9)",
            }} />
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", color: "rgba(0,184,148,0.65)", textTransform: "uppercase", margin: 0 }}>
              {members.length} members · {catCount} industries
            </p>
          </div>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <svg
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, pointerEvents: "none" }}
              viewBox="0 0 16 16" fill="rgba(131,188,169,0.38)"
            >
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members…"
              style={{
                paddingLeft: 30, paddingRight: 10, paddingTop: 8, paddingBottom: 8,
                width: "100%", boxSizing: "border-box",
                background: "rgba(131,188,169,0.05)",
                border: "1px solid rgba(131,188,169,0.16)",
                borderRadius: 8,
                color: "rgba(255,255,255,0.88)",
                fontSize: 13, outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(0,184,148,0.5)")}
              onBlur={(e)  => (e.target.style.borderColor = "rgba(131,188,169,0.16)")}
            />
          </div>

          {/* Industry filter */}
          <select
            value={activeCategory ?? ""}
            onChange={(e) => setActiveCategory(e.target.value || null)}
            style={{
              padding: "8px 10px",
              background: "rgba(131,188,169,0.05)",
              border: `1px solid ${activeCategory ? "rgba(0,184,148,0.4)" : "rgba(131,188,169,0.16)"}`,
              borderRadius: 8,
              color: activeCategory ? "#00B894" : "rgba(255,255,255,0.45)",
              fontSize: 13, outline: "none", cursor: "pointer", width: "100%",
            }}
          >
            <option value="">All industries</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Active category badge */}
          {activeCategory && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "5px 9px",
              background: "rgba(0,184,148,0.1)",
              border: "1px solid rgba(0,184,148,0.28)",
              borderRadius: 6,
            }}>
              <span style={{ fontSize: 11, color: "#00B894", fontWeight: 600, letterSpacing: "0.02em" }}>
                {activeCategory}
              </span>
              <button
                onClick={() => setActiveCategory(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,184,148,0.55)", fontSize: 13, padding: 0, lineHeight: 1 }}
              >✕</button>
            </div>
          )}

          {/* Clear all */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{ fontSize: 11, color: "rgba(255,98,51,0.65)", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, letterSpacing: "0.05em", fontWeight: 600 }}
            >
              ✕ Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* ── Legend ───────────────────────────────────────────── */}
      <div
        className="absolute bottom-5 left-5 z-10"
        style={{ ...glass, display: "flex", flexDirection: "column", gap: 6, padding: "12px 14px", borderRadius: 10 }}
      >
        {([
          { color: C.ci,       label: "Community Investor", glow: C.ciRgb  },
          { color: C.vp,       label: "Visibility Plus",    glow: C.vpRgb  },
          { color: C.standard, label: "Member",             glow: null     },
          { color: C.cat,      label: "Industry hub",       glow: C.catRgb },
          { color: C.city,     label: "City",               glow: C.cityRgb},
        ] as const).map(({ color, label, glow }) => (
          <span
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, color: "rgba(255,255,255,0.38)" }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: color, flexShrink: 0,
              boxShadow: glow ? `0 0 6px rgba(${glow},0.65)` : undefined,
            }} />
            {label}
          </span>
        ))}
      </div>

      {/* ── Hint ─────────────────────────────────────────────── */}
      <p
        className="hidden sm:block absolute bottom-5 right-5 z-10"
        style={{ fontSize: 10.5, color: "rgba(255,255,255,0.15)", letterSpacing: "0.04em", margin: 0 }}
      >
        Click member to open · Click industry hub to filter · Scroll to zoom
      </p>

      {/* ── Canvas ───────────────────────────────────────────── */}
      <div ref={containerRef} className="w-full h-full">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeId="id"
          nodeLabel={() => ""}
          nodeVal={getNodeVal}
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={() => "replace"}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onEngineStop={handleEngineStop}
          linkColor={getLinkColor}
          linkWidth={0.35}
          backgroundColor={C.bg}
          width={dimensions.width}
          height={dimensions.height}
          warmupTicks={80}
          cooldownTicks={200}
          cooldownTime={8000}
          d3AlphaDecay={0.04}
          d3VelocityDecay={0.45}
          minZoom={0.12}
          maxZoom={14}
          enableZoomInteraction
          enablePanInteraction
        />
      </div>

      {/* ── Member modal ─────────────────────────────────────── */}
      {selectedMember && (
        <MemberModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}
