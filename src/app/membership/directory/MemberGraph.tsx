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

// ── Brand palette (raw hex — CSS vars unavailable in canvas) ─────────────
const C = {
  bg:            "#0C1B33",
  ci:            "#83BCA9",               // cambridge — Community Investor
  vp:            "#C84A1E",               // accent — Visibility Plus
  standard:      "rgba(131,188,169,0.5)", // cambridge muted — standard member
  dimmed:        "rgba(131,188,169,0.06)",
  category:      "#005450",              // emerald hub
  categoryDim:   "rgba(0,84,80,0.15)",
  city:          "#1E3A5F",              // deep navy hub
  link:          "rgba(131,188,169,0.055)",
  linkHighlight: "rgba(131,188,169,0.3)",
} as const;

function resolveColor(
  node: GraphNode,
  activeCategory: string | null,
  searchQuery: string,
): string {
  if (node.type === "category") {
    return activeCategory && activeCategory !== node.name ? C.categoryDim : C.category;
  }
  if (node.type === "city") return C.city;

  const catMatch  = !activeCategory || node.categories?.includes(activeCategory);
  const termMatch = !searchQuery ||
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
  const containerRef  = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef         = useRef<any>(null);

  const [dimensions, setDimensions]       = useState({ width: 800, height: 700 });
  const [selectedMember, setSelectedMember] = useState<GraphNode | null>(null);
  const [hoveredId, setHoveredId]         = useState<string | null>(null);
  const [search, setSearch]               = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [engineStopped, setEngineStopped] = useState(false);

  // Refs for canvas RAF callbacks — avoids stale closures
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

  // ── Custom D3 forces — tune after graph mounts ────────────────────────
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    // Strong repulsion between category/city hubs; gentler between members
    const charge = fg.d3Force("charge");
    if (charge) {
      charge.strength((node: GraphNode) => {
        if (node.type === "category") return -600;
        if (node.type === "city")     return -200;
        return -60;
      });
    }

    // Shorter link distance keeps members snug to their hubs
    const link = fg.d3Force("link");
    if (link) {
      link.distance(50).strength(0.6);
    }

    // Reheat slightly so forces take effect
    fg.d3ReheatSimulation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData]);

  // ── Zoom to fit once simulation stops ────────────────────────────────
  const handleEngineStop = useCallback(() => {
    if (!engineStopped) {
      fgRef.current?.zoomToFit(600, 80);
      setEngineStopped(true);
    }
  }, [engineStopped]);

  // ── Custom canvas renderer ────────────────────────────────────────────
  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x     = node.x ?? 0;
      const y     = node.y ?? 0;
      const cat   = activeCatRef.current;
      const q     = searchRef.current;
      const hov   = hoveredIdRef.current;
      const color = resolveColor(node, cat, q);
      const isHov = node.id === hov;

      // ── Category hub ─────────────────────────────────────
      if (node.type === "category") {
        const r       = 9;
        const isDim   = !!(cat && cat !== node.name);

        if (!isDim) {
          // Ambient glow
          const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
          grd.addColorStop(0, "rgba(0,84,80,0.45)");
          grd.addColorStop(1, "rgba(0,84,80,0)");
          ctx.beginPath();
          ctx.arc(x, y, r * 4, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Label — constant screen size
        const fs = Math.max(10.5 / globalScale, 1.2);
        ctx.font          = `600 ${fs}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle     = isDim ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.88)";
        ctx.textAlign     = "center";
        ctx.textBaseline  = "top";
        const label = node.name.length > 20 ? node.name.slice(0, 19) + "…" : node.name;
        ctx.fillText(label, x, y + r + 3 / globalScale);
        return;
      }

      // ── City hub ─────────────────────────────────────────
      if (node.type === "city") {
        const r = 4.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = C.city;
        ctx.fill();

        // Subtle ring
        ctx.beginPath();
        ctx.arc(x, y, r + 1.2, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(131,188,169,0.15)";
        ctx.lineWidth   = 0.8;
        ctx.stroke();

        const fs = Math.max(9 / globalScale, 1);
        ctx.font          = `${fs}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle     = "rgba(255,255,255,0.38)";
        ctx.textAlign     = "center";
        ctx.textBaseline  = "top";
        ctx.fillText(node.name, x, y + r + 2 / globalScale);
        return;
      }

      // ── Member node ──────────────────────────────────────
      const baseR = node.tier === "ci" ? 4 : node.tier === "vp" ? 2.8 : 2;
      const r     = isHov ? baseR * 1.65 : baseR;

      // Glow on hover
      if (isHov && color !== C.dimmed) {
        const glowRgba =
          node.tier === "ci" ? "131,188,169" :
          node.tier === "vp" ? "200,74,30"   : "131,188,169";
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 4.5);
        grd.addColorStop(0, `rgba(${glowRgba},0.45)`);
        grd.addColorStop(1, `rgba(${glowRgba},0)`);
        ctx.beginPath();
        ctx.arc(x, y, r * 4.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Label: hover or zoomed in
      if (isHov || globalScale > 3.5) {
        const fs = Math.max(9 / globalScale, 1.4);
        ctx.font          = `${fs}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle     = "rgba(255,255,255,0.92)";
        ctx.textAlign     = "center";
        ctx.textBaseline  = "top";
        const label = node.name.length > 28 ? node.name.slice(0, 26) + "…" : node.name;
        ctx.fillText(label, x, y + r + 2 / globalScale);
      }
    },
    [],
  );

  // ── Link color ────────────────────────────────────────────────────────
  const getLinkColor = useCallback((link: GraphLink) => {
    if (!activeCategory) return C.link;
    const tid = typeof link.target === "object" ? link.target.id : link.target;
    return tid === `cat:${activeCategory}` ? C.linkHighlight : C.link;
  }, [activeCategory]);

  // ── Node physics weight ───────────────────────────────────────────────
  const getNodeVal = useCallback((node: GraphNode) => {
    if (node.type === "category") return 80;
    if (node.type === "city")     return 20;
    if (node.tier === "ci")       return 8;
    if (node.tier === "vp")       return 5;
    return 3;
  }, []);

  // ── Interaction ───────────────────────────────────────────────────────
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.type === "member") {
      setSelectedMember(node);
    } else if (node.type === "category") {
      setActiveCategory((prev) => (prev === node.name ? null : node.name));
    }
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredId(node?.id ?? null);
    // Set cursor directly on canvas element — most reliable
    const canvas = containerRef.current?.querySelector("canvas") as HTMLElement | null;
    if (canvas) canvas.style.cursor = node?.type === "member" ? "pointer" : "default";
  }, []);

  const clearFilters = () => { setSearch(""); setActiveCategory(null); };

  const hasFilters = !!(search || activeCategory);

  // member/category/city counts for HUD display
  const catCount = useMemo(
    () => new Set(members.flatMap((m) => m.categories)).size,
    [members],
  );

  return (
    <div className="relative w-full" style={{ height: "85vh", background: C.bg }}>

      {/* ── HUD Controls panel ───────────────────────────── */}
      <div className="absolute top-5 left-5 z-10">
        <div
          className="flex flex-col gap-2 p-3 rounded-[var(--radius-lg)]"
          style={{
            background: "rgba(12,27,51,0.82)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(131,188,169,0.14)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          {/* HUD label */}
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "rgba(131,188,169,0.45)", textTransform: "uppercase" }}>
            Network · {members.length} members · {catCount} industries
          </p>

          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
              viewBox="0 0 16 16"
              fill="rgba(131,188,169,0.45)"
            >
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members…"
              style={{
                paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                width: 200,
                background: "rgba(131,188,169,0.06)",
                border: "1px solid rgba(131,188,169,0.18)",
                borderRadius: 8,
                color: "rgba(255,255,255,0.88)",
                fontSize: 13,
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(131,188,169,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(131,188,169,0.18)")}
            />
          </div>

          {/* Category filter */}
          <select
            value={activeCategory ?? ""}
            onChange={(e) => setActiveCategory(e.target.value || null)}
            style={{
              padding: "7px 10px",
              background: "rgba(131,188,169,0.06)",
              border: "1px solid rgba(131,188,169,0.18)",
              borderRadius: 8,
              color: activeCategory ? "rgba(131,188,169,0.95)" : "rgba(255,255,255,0.55)",
              fontSize: 13,
              outline: "none",
              cursor: "pointer",
              width: 200,
            }}
          >
            <option value="">All industries</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{
                fontSize: 11,
                color: "rgba(200,74,30,0.8)",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                padding: 0,
                letterSpacing: "0.06em",
              }}
            >
              ✕ Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Legend ───────────────────────────────────────── */}
      <div
        className="absolute bottom-5 left-5 z-10 flex flex-col gap-1.5 p-3 rounded-[var(--radius-lg)]"
        style={{
          background: "rgba(12,27,51,0.75)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(131,188,169,0.1)",
        }}
      >
        {[
          { color: C.ci,       label: "Community Investor" },
          { color: C.vp,       label: "Visibility Plus"    },
          { color: C.standard, label: "Member"             },
          { color: C.category, label: "Industry hub"       },
          { color: C.city,     label: "City"               },
        ].map(({ color, label }) => (
          <span
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "rgba(255,255,255,0.38)" }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
            {label}
          </span>
        ))}
      </div>

      {/* ── Hint ─────────────────────────────────────────── */}
      <p
        className="absolute bottom-5 right-5 z-10 hidden sm:block"
        style={{ fontSize: 10.5, color: "rgba(255,255,255,0.18)", letterSpacing: "0.04em" }}
      >
        Click member to open · Click industry hub to filter · Scroll to zoom
      </p>

      {/* ── Canvas ───────────────────────────────────────── */}
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
          // Physics — settle fast, stay stable
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

      {/* ── Member modal ─────────────────────────────────── */}
      {selectedMember && (
        <MemberModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}
