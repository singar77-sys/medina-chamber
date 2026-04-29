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
      <div className="flex flex-col items-center gap-f13">
        <span className="w-8 h-8 border-2 border-cambridge/30 border-t-cambridge rounded-full animate-spin" />
        <p className="text-caption text-white/30">Building the network…</p>
      </div>
    </div>
  ),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

// ── Brand palette (raw hex — can't use CSS vars in canvas) ──────────────
const C = {
  bg:       "#0C1B33",
  ci:       "#83BCA9",               // cambridge — top tier
  vp:       "#C84A1E",               // accent — mid tier
  standard: "rgba(131,188,169,0.55)", // cambridge muted — standard
  dimmed:   "rgba(131,188,169,0.07)", // nearly invisible when filtered out
  category: "#005450",               // emerald hubs
  categoryDim: "rgba(0,84,80,0.2)",
  city:     "#2E4A6E",               // muted navy hubs
  link:         "rgba(131,188,169,0.06)",
  linkActive:   "rgba(131,188,169,0.28)",
} as const;

// ── Node color resolver — reads from refs, safe for canvas RAF loop ──────
function resolveColor(
  node: GraphNode,
  activeCategory: string | null,
  searchQuery: string,
): string {
  if (node.type === "category") {
    return activeCategory && activeCategory !== node.name
      ? C.categoryDim
      : C.category;
  }
  if (node.type === "city") return C.city;

  // Member
  const catMatch  = !activeCategory || node.categories?.includes(activeCategory);
  const termMatch = !searchQuery   ||
    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.description?.toLowerCase().includes(searchQuery.toLowerCase());

  if (!catMatch || !termMatch) return C.dimmed;
  if (node.tier === "ci") return C.ci;
  if (node.tier === "vp") return C.vp;
  return C.standard;
}

interface MemberGraphProps {
  members: Member[];
  categories: string[];
}

export function MemberGraph({ members, categories }: MemberGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 700 });
  const [selectedMember, setSelectedMember] = useState<GraphNode | null>(null);
  const [hoveredId, setHoveredId]           = useState<string | null>(null);
  const [search, setSearch]                 = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Refs so canvas RAF callbacks always read current values without stale closures
  const activeCatRef  = useRef<string | null>(null);
  const searchRef     = useRef<string>("");
  const hoveredIdRef  = useRef<string | null>(null);
  activeCatRef.current  = activeCategory;
  searchRef.current     = search;
  hoveredIdRef.current  = hoveredId;

  // Build graph data once
  const graphData = useMemo(() => buildGraphData(members), [members]);

  // Responsive container sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDimensions({
        width:  entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    ro.observe(el);
    setDimensions({ width: el.offsetWidth, height: el.offsetHeight });
    return () => ro.disconnect();
  }, []);

  // Fit graph to view after simulation settles
  useEffect(() => {
    const timer = setTimeout(() => {
      fgRef.current?.zoomToFit(900, 80);
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  // ── Custom canvas renderer ────────────────────────────────────────────
  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x   = node.x ?? 0;
      const y   = node.y ?? 0;
      const cat = activeCatRef.current;
      const q   = searchRef.current;
      const hov = hoveredIdRef.current;
      const color     = resolveColor(node, cat, q);
      const isHovered = node.id === hov;

      // ── Category hub ─────────────────────────────────────
      if (node.type === "category") {
        const r         = 10;
        const isDimmed  = cat && cat !== node.name;

        // Glow ring
        if (!isDimmed) {
          const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5);
          grd.addColorStop(0, "rgba(0,84,80,0.4)");
          grd.addColorStop(1, "rgba(0,84,80,0)");
          ctx.beginPath();
          ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        // Circle
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Label — always visible, constant screen size
        const fs = Math.max(11 / globalScale, 1.5);
        ctx.font          = `600 ${fs}px system-ui, sans-serif`;
        ctx.fillStyle     = isDimmed ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.85)";
        ctx.textAlign     = "center";
        ctx.textBaseline  = "top";
        const label = node.name.length > 22 ? node.name.slice(0, 20) + "…" : node.name;
        ctx.fillText(label, x, y + r + 3 / globalScale);
        return;
      }

      // ── City hub ─────────────────────────────────────────
      if (node.type === "city") {
        const r = 5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = C.city;
        ctx.fill();

        const fs = Math.max(9 / globalScale, 1.2);
        ctx.font          = `${fs}px system-ui, sans-serif`;
        ctx.fillStyle     = "rgba(255,255,255,0.4)";
        ctx.textAlign     = "center";
        ctx.textBaseline  = "top";
        ctx.fillText(node.name, x, y + r + 2 / globalScale);
        return;
      }

      // ── Member node ──────────────────────────────────────
      const baseR = node.tier === "ci" ? 4 : node.tier === "vp" ? 2.8 : 2;
      const r     = isHovered ? baseR * 1.7 : baseR;

      // Glow on hover (only for non-dimmed nodes)
      if (isHovered && color !== C.dimmed) {
        const glowA = node.tier === "ci"
          ? "rgba(131,188,169,"
          : node.tier === "vp"
          ? "rgba(200,74,30,"
          : "rgba(131,188,169,";
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
        grd.addColorStop(0, `${glowA}0.4)`);
        grd.addColorStop(1, `${glowA}0)`);
        ctx.beginPath();
        ctx.arc(x, y, r * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // Circle
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Label on hover or high zoom
      if (isHovered || globalScale > 3.5) {
        const fs = Math.max(9 / globalScale, 1.5);
        ctx.font          = `${fs}px system-ui, sans-serif`;
        ctx.fillStyle     = "rgba(255,255,255,0.9)";
        ctx.textAlign     = "center";
        ctx.textBaseline  = "top";
        const label = node.name.length > 30 ? node.name.slice(0, 28) + "…" : node.name;
        ctx.fillText(label, x, y + r + 2 / globalScale);
      }
    },
    [], // empty deps — reads state via refs inside RAF loop
  );

  // ── Link color ───────────────────────────────────────────────────────
  const getLinkColor = useCallback((link: GraphLink) => {
    if (!activeCategory) return C.link;
    const targetId =
      typeof link.target === "object" ? link.target.id : link.target;
    return targetId === `cat:${activeCategory}` ? C.linkActive : C.link;
  }, [activeCategory]);

  // ── Node physics size (affects D3 force repulsion) ───────────────────
  const getNodeVal = useCallback((node: GraphNode) => {
    if (node.type === "category") return 80;
    if (node.type === "city")     return 25;
    if (node.tier === "ci")       return 8;
    if (node.tier === "vp")       return 5;
    return 3;
  }, []);

  // ── Interaction handlers ─────────────────────────────────────────────
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.type === "member") {
      setSelectedMember(node);
    } else if (node.type === "category") {
      setActiveCategory((prev) => (prev === node.name ? null : node.name));
    }
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredId(node?.id ?? null);
    if (containerRef.current) {
      containerRef.current.style.cursor =
        node?.type === "member" ? "pointer" : "default";
    }
  }, []);

  const clearFilters = () => {
    setSearch("");
    setActiveCategory(null);
  };

  return (
    <div className="relative w-full" style={{ height: "85vh", background: C.bg }}>

      {/* ── Controls overlay ─────────────────────────────── */}
      <div className="absolute top-f21 left-f21 z-10 flex flex-col sm:flex-row gap-f8 max-w-[calc(100%-2rem)]">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            viewBox="0 0 16 16"
            fill="rgba(131,188,169,0.5)"
          >
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a member…"
            className="
              pl-8 pr-3 py-2 w-52
              bg-oxford/75 backdrop-blur-sm
              border border-cambridge/20 hover:border-cambridge/40 focus:border-cambridge
              text-white text-sm placeholder:text-white/30
              rounded-[var(--radius-md)]
              focus:outline-none transition-colors
            "
          />
        </div>

        {/* Category filter */}
        <select
          value={activeCategory ?? ""}
          onChange={(e) => setActiveCategory(e.target.value || null)}
          className="
            px-3 py-2
            bg-oxford/75 backdrop-blur-sm
            border border-cambridge/20 hover:border-cambridge/40 focus:border-cambridge
            text-white text-sm
            rounded-[var(--radius-md)]
            focus:outline-none transition-colors cursor-pointer
          "
        >
          <option value="">All industries</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {(search || activeCategory) && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-white/40 hover:text-white text-sm transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Legend ──────────────────────────────────────── */}
      <div className="absolute bottom-f21 left-f21 z-10 flex flex-wrap gap-x-f13 gap-y-f8">
        {[
          { color: C.ci,       label: "Community Investor" },
          { color: C.vp,       label: "Visibility Plus"    },
          { color: C.standard, label: "Member"             },
          { color: C.category, label: "Industry hub"       },
          { color: C.city,     label: "City"               },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] text-white/45">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: color }}
            />
            {label}
          </span>
        ))}
      </div>

      {/* ── Hint ─────────────────────────────────────────── */}
      <p className="absolute bottom-f21 right-f21 z-10 text-[11px] text-white/20 hidden sm:block">
        Click a member to open · Scroll to zoom · Drag to pan
      </p>

      {/* ── Canvas container ──────────────────────────────── */}
      <div ref={containerRef} className="w-full h-full">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeId="id"
          nodeLabel={() => ""}           // suppress built-in tooltip — canvas handles labels
          nodeVal={getNodeVal}
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={() => "replace"}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          linkColor={getLinkColor}
          linkWidth={0.4}
          backgroundColor={C.bg}
          width={dimensions.width}
          height={dimensions.height}
          cooldownTicks={250}
          d3AlphaDecay={0.015}
          d3VelocityDecay={0.25}
          minZoom={0.15}
          maxZoom={14}
          enableZoomInteraction
          enablePanInteraction
        />
      </div>

      {/* ── Member detail modal ───────────────────────────── */}
      {selectedMember && (
        <MemberModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}
