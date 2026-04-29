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

// ── Boundary force — keeps all nodes inside a circle in D3 simulation space
const BOUNDARY_R = 260;
function forceRadialBoundary(radius: number, strength = 0.14) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let nodes: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function force(alpha: number) {
    nodes.forEach((n) => {
      const x = n.x ?? 0;
      const y = n.y ?? 0;
      const d = Math.sqrt(x * x + y * y);
      if (d > radius) {
        const factor = ((d - radius) / d) * strength * alpha;
        n.vx = (n.vx ?? 0) - x * factor;
        n.vy = (n.vy ?? 0) - y * factor;
      }
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  force.initialize = (n: any[]) => { nodes = n; };
  return force;
}

// ── Color palette (raw hex — CSS vars unavailable inside canvas) ──────────
const C = {
  bg:          "#0C1B33",
  // Member tiers
  ci:          "#83BCA9",              // cambridge teal — Community Investor
  ciRgb:       "131,188,169",
  vp:          "#FF6233",              // dark-mode text-accent (5.9:1 on dark)
  vpRgb:       "255,98,51",
  standard:    "rgba(131,188,169,0.58)",
  dimmed:      "rgba(131,188,169,0.022)",
  // Hubs
  cat:         "#00B894",              // bright teal-green (was #005450 — invisible on dark)
  catRgb:      "0,184,148",
  catDim:      "rgba(0,184,148,0.05)",
  city:        "#4D8EBA",              // steel blue (was #1E3A5F — invisible on dark)
  cityRgb:     "77,142,186",
  // Links
  link:        "rgba(131,188,169,0.032)",
  linkActive:  "rgba(0,184,148,0.45)",
} as const;

function resolveColor(node: GraphNode, activeCat: string | null, search: string): string {
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
  const [isFocused, setIsFocused]             = useState(false);

  const activeCatRef  = useRef<string | null>(null);
  const searchRef     = useRef<string>("");
  const hoveredIdRef  = useRef<string | null>(null);
  activeCatRef.current  = activeCategory;
  searchRef.current     = search;
  hoveredIdRef.current  = hoveredId;

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

  // ── Custom D3 forces + circular boundary ─────────────────────────────
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const charge = fg.d3Force("charge");
    if (charge) charge.strength((n: GraphNode) =>
      n.type === "category" ? -800 : n.type === "city" ? -200 : -45
    );
    const link = fg.d3Force("link");
    if (link) link.distance(42).strength(0.65);
    // Confine all nodes to a circle — creates the "globe" cluster shape
    fg.d3Force("boundary", forceRadialBoundary(BOUNDARY_R, 0.14));
    fg.d3ReheatSimulation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData]);

  // ── Zoom to fit once simulation settles ───────────────────────────────
  const handleEngineStop = useCallback(() => {
    if (!engineStopped) {
      fgRef.current?.zoomToFit(800, 60);
      setEngineStopped(true);
    }
  }, [engineStopped]);

  // ── Globe ring + vignette drawn before nodes ──────────────────────────
  const handleRenderFramePre = useCallback((ctx: CanvasRenderingContext2D) => {
    const r = BOUNDARY_R;
    const t = (Date.now() - startTimeRef.current) / 1000;
    const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.18); // very slow breathing

    // Outer glow halo
    const halo = ctx.createRadialGradient(0, 0, r * 0.82, 0, 0, r * 1.28);
    halo.addColorStop(0, `rgba(131,188,169,${(0.035 + pulse * 0.028).toFixed(3)})`);
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.28, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.fill();

    // Boundary ring — the "globe" edge
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(131,188,169,${(0.07 + pulse * 0.07).toFixed(3)})`;
    ctx.lineWidth   = 0.6;
    ctx.stroke();

    // Inner vignette — darkens edges for depth / sphere feel
    const vignette = ctx.createRadialGradient(0, 0, r * 0.45, 0, 0, r);
    vignette.addColorStop(0,   "rgba(40,68,105,0.08)");
    vignette.addColorStop(0.7, "rgba(12,27,51,0)");
    vignette.addColorStop(1,   "rgba(0,0,0,0.42)");
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = vignette;
    ctx.fill();
  }, []);

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
        const r     = 10;
        const isDim = !!(cat && cat !== node.name);
        const isAct = cat === node.name;

        if (!isDim) {
          // Slow outer pulse ring
          const pulse = 0.42 + 0.3 * Math.sin(t * Math.PI * 2 * 0.42);
          ctx.beginPath();
          ctx.arc(x, y, r * 3, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${C.catRgb},${(pulse * 0.14).toFixed(3)})`;
          ctx.lineWidth   = 1;
          ctx.stroke();

          // Mid ring — brighter when this hub is the active filter
          ctx.beginPath();
          ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
          ctx.strokeStyle = isAct ? `rgba(${C.catRgb},0.8)` : `rgba(${C.catRgb},0.24)`;
          ctx.lineWidth   = isAct ? 1.6 : 0.8;
          ctx.stroke();

          // Ambient glow field
          const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 4.5);
          grd.addColorStop(0, isAct ? `rgba(${C.catRgb},0.38)` : `rgba(${C.catRgb},0.12)`);
          grd.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath();
          ctx.arc(x, y, r * 4.5, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        // Core dot
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = isDim ? C.catDim : C.cat;
        ctx.fill();

        // Inner white center point
        if (!isDim) {
          ctx.beginPath();
          ctx.arc(x, y, r * 0.36, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.88)";
          ctx.fill();
        }

        // Category labels — always shown (they ARE the structure)
        const fs = Math.max(10.5 / globalScale, 1.2);
        ctx.font         = `700 ${fs}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle    = isDim ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)";
        ctx.textAlign    = "center";
        ctx.textBaseline = "top";
        const lbl = node.name.length > 20 ? node.name.slice(0, 18) + "…" : node.name;
        ctx.fillText(lbl, x, y + r + 3 / globalScale);
        return;
      }

      // ── City hub ──────────────────────────────────────────────────────
      if (node.type === "city") {
        const r = 3.2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = C.city;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, r + 1, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${C.cityRgb},0.22)`;
        ctx.lineWidth   = 0.5;
        ctx.stroke();
        // City labels only when zoomed in deeply — they add noise at overview
        if (globalScale > 2.8) {
          const fs = Math.max(8 / globalScale, 1);
          ctx.font         = `${fs}px system-ui, -apple-system, sans-serif`;
          ctx.fillStyle    = `rgba(${C.cityRgb},0.6)`;
          ctx.textAlign    = "center";
          ctx.textBaseline = "top";
          ctx.fillText(node.name, x, y + r + 1.5 / globalScale);
        }
        return;
      }

      // ── Member node ───────────────────────────────────────────────────
      const baseR = node.tier === "ci" ? 4.5 : node.tier === "vp" ? 3 : 1.7;
      const r     = isHov ? baseR * 1.65 : baseR;
      const isDim = color === C.dimmed;
      const rgb   = node.tier === "ci" ? C.ciRgb : node.tier === "vp" ? C.vpRgb : C.ciRgb;

      // CI — pulsing glow with per-node phase so they breathe organically
      if (node.tier === "ci" && !isDim) {
        const phase = (node.x ?? 0) * 0.22 + (node.y ?? 0) * 0.14;
        const pulse = 0.36 + 0.28 * Math.sin(t * Math.PI * 2 * 0.62 + phase);
        const grd   = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 5.5);
        grd.addColorStop(0,   `rgba(${rgb},${(pulse * 0.52).toFixed(3)})`);
        grd.addColorStop(0.5, `rgba(${rgb},${(pulse * 0.13).toFixed(3)})`);
        grd.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(x, y, r * 5.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, r + 2.4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb},${(pulse * 0.65).toFixed(3)})`;
        ctx.lineWidth   = 1;
        ctx.stroke();
      }

      // VP — steady warm accent glow
      if (node.tier === "vp" && !isDim) {
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
        grd.addColorStop(0, `rgba(${rgb},0.38)`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(x, y, r * 4, 0, Math.PI * 2);
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

      // Member labels — ONLY on hover or when deeply zoomed in
      // (removed "CI always visible" — it creates label soup at overview zoom)
      if (isHov || globalScale > 3.5) {
        const fs = Math.max(9 / globalScale, 1.4);
        ctx.font         = `${node.tier === "ci" ? "600 " : ""}${fs}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle    = isDim ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.92)";
        ctx.textAlign    = "center";
        ctx.textBaseline = "top";
        const lbl = node.name.length > 24 ? node.name.slice(0, 22) + "…" : node.name;
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

  // ── Physics weight ────────────────────────────────────────────────────
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
  const catCount     = useMemo(
    () => new Set(members.flatMap((m) => m.categories)).size,
    [members],
  );

  const glass = {
    background:     "rgba(12,27,51,0.88)",
    backdropFilter: "blur(16px)",
    border:         "1px solid rgba(131,188,169,0.14)",
    boxShadow:      "0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(131,188,169,0.07)",
  } as const;

  return (
    <div
      className="relative w-full select-none"
      style={{ height: "85vh", background: C.bg }}
      onMouseEnter={() => setIsFocused(true)}
      onMouseLeave={() => setIsFocused(false)}
    >

      {/* ── Top gradient — page bg fades into graph ──────────── */}
      <div
        className="absolute top-0 inset-x-0 pointer-events-none z-[3]"
        style={{
          height: 72,
          background: "linear-gradient(to bottom, var(--bg-primary) 0%, rgba(12,27,51,0) 100%)",
        }}
      />

      {/* ── Bottom gradient — graph fades back to page bg ────── */}
      <div
        className="absolute bottom-0 inset-x-0 pointer-events-none z-[3]"
        style={{
          height: 72,
          background: "linear-gradient(to top, var(--bg-primary) 0%, rgba(12,27,51,0) 100%)",
        }}
      />

      {/* ── Screen-space edge vignette — globe depth effect ──── */}
      <div
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, transparent 42%, rgba(6,14,28,0.72) 100%)",
        }}
      />

      {/* ── Hover-to-activate badge — visible when not focused ─ */}
      {!isFocused && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div style={{
            padding: "7px 16px", borderRadius: 20,
            background: "rgba(12,27,51,0.72)",
            border: "1px solid rgba(131,188,169,0.22)",
            backdropFilter: "blur(8px)",
            whiteSpace: "nowrap",
          }}>
            <p style={{
              fontSize: 10, letterSpacing: "0.13em", fontWeight: 700,
              color: "rgba(131,188,169,0.55)", textTransform: "uppercase", margin: 0,
            }}>
              Hover to zoom &amp; pan
            </p>
          </div>
        </div>
      )}

      {/* ── HUD Controls ─────────────────────────────────────── */}
      <div className="absolute top-20 left-5 z-10">
        <div style={{ ...glass, display: "flex", flexDirection: "column", gap: 8, padding: 14, borderRadius: 12, minWidth: 220 }}>

          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#00B894", boxShadow: "0 0 7px rgba(0,184,148,0.9)",
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
              <span style={{ fontSize: 11, color: "#00B894", fontWeight: 600 }}>
                {activeCategory}
              </span>
              <button
                onClick={() => setActiveCategory(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,184,148,0.55)", fontSize: 13, padding: 0 }}
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
        className="absolute bottom-20 left-5 z-10"
        style={{ ...glass, display: "flex", flexDirection: "column", gap: 6, padding: "12px 14px", borderRadius: 10 }}
      >
        {([
          { color: C.ci,       label: "Community Investor", glow: C.ciRgb   },
          { color: C.vp,       label: "Visibility Plus",    glow: C.vpRgb   },
          { color: C.standard, label: "Member",             glow: null      },
          { color: C.cat,      label: "Industry hub",       glow: C.catRgb  },
          { color: C.city,     label: "City",               glow: C.cityRgb },
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
        className="hidden sm:block absolute bottom-20 right-5 z-10"
        style={{ fontSize: 10.5, color: "rgba(255,255,255,0.14)", letterSpacing: "0.04em", margin: 0, lineHeight: 1.6 }}
      >
        Click member to open profile<br />
        Click industry hub to filter<br />
        Scroll to zoom · drag to pan
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
          onRenderFramePre={handleRenderFramePre}
          linkColor={getLinkColor}
          linkWidth={0.3}
          backgroundColor={C.bg}
          width={dimensions.width}
          height={dimensions.height}
          warmupTicks={100}
          cooldownTicks={200}
          cooldownTime={8000}
          d3AlphaDecay={0.04}
          d3VelocityDecay={0.45}
          minZoom={0.12}
          maxZoom={14}
          // Zoom/pan ONLY active when mouse is over the graph — prevents page scroll hijacking
          enableZoomInteraction={isFocused}
          enablePanInteraction={isFocused}
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
