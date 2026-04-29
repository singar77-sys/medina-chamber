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
    <div className="w-full h-full flex items-center justify-center">
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

// ── Boundary force — keeps all nodes inside a circle ─────────────────────
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

// ── Label pill — rounded-rect background behind canvas text ──────────────
function drawLabelPill(
  ctx:       CanvasRenderingContext2D,
  text:      string,
  cx:        number,   // horizontal center
  ty:        number,   // top edge of pill
  fontSize:  number,
  bgAlpha:   number,
  textColor: string,
  bold?:     boolean,
) {
  ctx.font = `${bold ? "700 " : ""}${fontSize}px system-ui,-apple-system,sans-serif`;
  const tw  = ctx.measureText(text).width;
  const ph  = fontSize * 1.55;          // pill height
  const px  = fontSize * 0.60;          // horizontal padding
  const rad = Math.min(fontSize * 0.38, ph / 2);
  const bx  = cx - tw / 2 - px;
  const by  = ty;
  const bw  = tw + px * 2;

  ctx.beginPath();
  ctx.moveTo(bx + rad, by);
  ctx.lineTo(bx + bw - rad, by);
  ctx.arcTo(bx + bw, by,      bx + bw, by + rad,  rad);
  ctx.lineTo(bx + bw, by + ph - rad);
  ctx.arcTo(bx + bw, by + ph, bx + bw - rad, by + ph, rad);
  ctx.lineTo(bx + rad, by + ph);
  ctx.arcTo(bx,        by + ph, bx, by + ph - rad, rad);
  ctx.lineTo(bx, by + rad);
  ctx.arcTo(bx,        by,      bx + rad, by, rad);
  ctx.closePath();
  ctx.fillStyle = `rgba(12,27,51,${bgAlpha})`;
  ctx.fill();

  ctx.fillStyle    = textColor;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, by + ph / 2);
}

// ── Color palette ─────────────────────────────────────────────────────────
const C = {
  bg:         "#0C1B33",
  ci:         "#83BCA9",   ciRgb:  "131,188,169",
  vp:         "#FF6233",   vpRgb:  "255,98,51",
  standard:   "rgba(131,188,169,0.58)",
  dimmed:     "rgba(131,188,169,0.022)",
  cat:        "#00B894",   catRgb: "0,184,148",
  catDim:     "rgba(0,184,148,0.05)",
  city:       "#4D8EBA",   cityRgb:"77,142,186",
  link:       "rgba(131,188,169,0.032)",
  linkActive: "rgba(0,184,148,0.45)",
} as const;

function resolveColor(node: GraphNode, activeCat: string | null, search: string): string {
  if (node.type === "category") return activeCat && activeCat !== node.name ? C.catDim : C.cat;
  if (node.type === "city")     return C.city;
  const catOk  = !activeCat || node.categories?.includes(activeCat);
  const termOk = !search    ||
    node.name.toLowerCase().includes(search.toLowerCase()) ||
    node.description?.toLowerCase().includes(search.toLowerCase());
  if (!catOk || !termOk) return C.dimmed;
  if (node.tier === "ci") return C.ci;
  if (node.tier === "vp") return C.vp;
  return C.standard;
}

// ── Glass style shared across HUD panels ──────────────────────────────────
const GLASS = {
  background:     "rgba(12,27,51,0.88)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border:         "1px solid rgba(131,188,169,0.14)",
  boxShadow:      "0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(131,188,169,0.07)",
} as const;

interface MemberGraphProps {
  members:    Member[];
  categories: string[];
}

export function MemberGraph({ members, categories }: MemberGraphProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const catMenuRef    = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef         = useRef<any>(null);
  const startTimeRef  = useRef(Date.now());

  const [dimensions, setDimensions]         = useState({ width: 800, height: 700 });
  const [selectedMember, setSelectedMember] = useState<GraphNode | null>(null);
  const [hoveredId, setHoveredId]           = useState<string | null>(null);
  const [search, setSearch]                 = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [engineStopped, setEngineStopped]   = useState(false);
  const [isFocused, setIsFocused]           = useState(false);

  // Custom industry dropdown
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [catSearch, setCatSearch]     = useState("");

  const activeCatRef  = useRef<string | null>(null);
  const searchRef     = useRef<string>("");
  const hoveredIdRef  = useRef<string | null>(null);
  activeCatRef.current  = activeCategory;
  searchRef.current     = search;
  hoveredIdRef.current  = hoveredId;

  const graphData = useMemo(() => buildGraphData(members), [members]);

  const filteredCats = useMemo(
    () => categories.filter((c) => c.toLowerCase().includes(catSearch.toLowerCase())),
    [categories, catSearch],
  );

  // ── Responsive sizing ─────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height })
    );
    ro.observe(el);
    setDimensions({ width: el.offsetWidth, height: el.offsetHeight });
    return () => ro.disconnect();
  }, []);

  // ── Close industry menu on outside click ──────────────────────────────
  useEffect(() => {
    if (!catMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!catMenuRef.current?.contains(e.target as Node)) {
        setCatMenuOpen(false);
        setCatSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [catMenuOpen]);

  // ── Custom D3 forces + boundary ───────────────────────────────────────
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const charge = fg.d3Force("charge");
    if (charge) charge.strength((n: GraphNode) =>
      n.type === "category" ? -800 : n.type === "city" ? -200 : -45
    );
    const link = fg.d3Force("link");
    if (link) link.distance(42).strength(0.65);
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

  // ── Pre-frame: draw atmosphere (screen space) + globe ring (graph space)
  const handleRenderFramePre = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = ctx.canvas;
    const cw = canvas.width;
    const ch = canvas.height;
    const t  = (Date.now() - startTimeRef.current) / 1000;
    const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.18);

    // ── Screen-space atmosphere — dark center fading to transparent edge
    // Step out of D3 transform so we draw in raw pixel coords
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const maxR = Math.sqrt((cw / 2) ** 2 + (ch / 2) ** 2);
    const atm  = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, maxR);
    atm.addColorStop(0,    "rgba(12,27,51,0.97)");
    atm.addColorStop(0.40, "rgba(12,27,51,0.93)");
    atm.addColorStop(0.70, "rgba(12,27,51,0.52)");
    atm.addColorStop(0.88, "rgba(12,27,51,0.14)");
    atm.addColorStop(1,    "rgba(12,27,51,0)");
    ctx.fillStyle = atm;
    ctx.fillRect(0, 0, cw, ch);
    ctx.restore();

    // ── Globe ring drawn in D3 transform space (0,0 = simulation center)
    const r = BOUNDARY_R;

    const halo = ctx.createRadialGradient(0, 0, r * 0.82, 0, 0, r * 1.28);
    halo.addColorStop(0, `rgba(131,188,169,${(0.035 + pulse * 0.028).toFixed(3)})`);
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.28, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(131,188,169,${(0.07 + pulse * 0.07).toFixed(3)})`;
    ctx.lineWidth   = 0.6;
    ctx.stroke();

    const vig = ctx.createRadialGradient(0, 0, r * 0.45, 0, 0, r);
    vig.addColorStop(0,   "rgba(40,68,105,0.08)");
    vig.addColorStop(0.7, "rgba(12,27,51,0)");
    vig.addColorStop(1,   "rgba(0,0,0,0.42)");
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = vig;
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
          const pulse = 0.42 + 0.3 * Math.sin(t * Math.PI * 2 * 0.42);
          ctx.beginPath();
          ctx.arc(x, y, r * 3, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${C.catRgb},${(pulse * 0.14).toFixed(3)})`;
          ctx.lineWidth   = 1;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
          ctx.strokeStyle = isAct ? `rgba(${C.catRgb},0.8)` : `rgba(${C.catRgb},0.24)`;
          ctx.lineWidth   = isAct ? 1.6 : 0.8;
          ctx.stroke();

          const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 4.5);
          grd.addColorStop(0, isAct ? `rgba(${C.catRgb},0.38)` : `rgba(${C.catRgb},0.12)`);
          grd.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath();
          ctx.arc(x, y, r * 4.5, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = isDim ? C.catDim : C.cat;
        ctx.fill();

        if (!isDim) {
          ctx.beginPath();
          ctx.arc(x, y, r * 0.36, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.88)";
          ctx.fill();
        }

        // Label with pill background
        const fs  = Math.max(10.5 / globalScale, 1.2);
        const lbl = node.name.length > 20 ? node.name.slice(0, 18) + "…" : node.name;
        if (isDim) {
          ctx.font         = `700 ${fs}px system-ui,-apple-system,sans-serif`;
          ctx.fillStyle    = "rgba(255,255,255,0.08)";
          ctx.textAlign    = "center";
          ctx.textBaseline = "top";
          ctx.fillText(lbl, x, y + r + 3 / globalScale);
        } else {
          drawLabelPill(
            ctx, lbl, x, y + r + 3 / globalScale, fs,
            isAct ? 0.90 : 0.75,
            isAct ? "rgba(0,230,160,0.95)" : "rgba(255,255,255,0.92)",
            true,
          );
        }
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
        if (globalScale > 2.8) {
          const fs = Math.max(8 / globalScale, 1);
          drawLabelPill(ctx, node.name, x, y + r + 1.5 / globalScale, fs, 0.68, `rgba(${C.cityRgb},0.95)`, false);
        }
        return;
      }

      // ── Member node ───────────────────────────────────────────────────
      const baseR = node.tier === "ci" ? 4.5 : node.tier === "vp" ? 3 : 1.7;
      const r     = isHov ? baseR * 1.65 : baseR;
      const isDim = color === C.dimmed;
      const rgb   = node.tier === "ci" ? C.ciRgb : node.tier === "vp" ? C.vpRgb : C.ciRgb;

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

      if (node.tier === "vp" && !isDim) {
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
        grd.addColorStop(0, `rgba(${rgb},0.38)`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(x, y, r * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      if (isHov && !isDim) {
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
        grd.addColorStop(0, `rgba(${rgb},0.55)`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(x, y, r * 5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Member label — pill on hover or deep zoom
      if (isHov || globalScale > 3.5) {
        const fs  = Math.max(9 / globalScale, 1.4);
        const lbl = node.name.length > 24 ? node.name.slice(0, 22) + "…" : node.name;
        if (isDim) {
          ctx.font         = `${fs}px system-ui,-apple-system,sans-serif`;
          ctx.fillStyle    = "rgba(255,255,255,0.2)";
          ctx.textAlign    = "center";
          ctx.textBaseline = "top";
          ctx.fillText(lbl, x, y + r + 2 / globalScale);
        } else {
          const tcol =
            node.tier === "ci" ? `rgba(${C.ciRgb},0.95)` :
            node.tier === "vp" ? `rgba(${C.vpRgb},0.95)` :
            "rgba(255,255,255,0.88)";
          drawLabelPill(ctx, lbl, x, y + r + 2 / globalScale, fs, 0.78, tcol, node.tier === "ci");
        }
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
    if (node.type === "member") setSelectedMember(node);
    else if (node.type === "category")
      setActiveCategory((prev) => (prev === node.name ? null : node.name));
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

  return (
    <div
      className="relative w-full select-none"
      style={{ height: "85vh" }}   /* transparent — atmosphere drawn on canvas */
      onMouseEnter={() => setIsFocused(true)}
      onMouseLeave={() => setIsFocused(false)}
    >
      {/* ── Interceptor overlay ───────────────────────────────────────────
          Sits above the canvas when not focused. Blocks canvas from
          receiving wheel events so the page can scroll normally.
          Controls have z-10 (> z-5) so they still receive events.       */}
      {!isFocused && (
        <div
          className="absolute inset-0 z-[5]"
          onMouseEnter={() => setIsFocused(true)}
        />
      )}

      {/* ── Hover hint — bottom center ────────────────────────────────── */}
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

      {/* ── HUD Controls — top left ───────────────────────────────────── */}
      <div className="absolute top-20 left-5 z-10">
        <div style={{
          ...GLASS,
          display: "flex", flexDirection: "column", gap: 8,
          padding: 14, borderRadius: 12, minWidth: 220,
        }}>

          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#00B894", boxShadow: "0 0 7px rgba(0,184,148,0.9)",
              flexShrink: 0,
            }} />
            <p style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.15em",
              color: "rgba(0,184,148,0.65)", textTransform: "uppercase", margin: 0,
            }}>
              {members.length} members · {catCount} industries
            </p>
          </div>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <svg
              style={{
                position: "absolute", left: 10, top: "50%",
                transform: "translateY(-50%)", width: 12, height: 12, pointerEvents: "none",
              }}
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

          {/* ── Custom industry dropdown (replaces native <select>) ────── */}
          <div ref={catMenuRef} style={{ position: "relative" }}>
            {/* Trigger */}
            <button
              onClick={() => setCatMenuOpen((v) => !v)}
              style={{
                width: "100%", padding: "8px 10px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "rgba(131,188,169,0.05)",
                border: `1px solid ${activeCategory ? "rgba(0,184,148,0.4)" : "rgba(131,188,169,0.16)"}`,
                borderRadius: 8,
                color: activeCategory ? "#00B894" : "rgba(255,255,255,0.45)",
                fontSize: 13, cursor: "pointer",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>
                {activeCategory ?? "All industries"}
              </span>
              <svg
                width="10" height="6" viewBox="0 0 10 6" fill="none"
                style={{
                  flexShrink: 0, marginLeft: 6,
                  transform: catMenuOpen ? "rotate(180deg)" : "none",
                  transition: "transform 180ms ease",
                }}
              >
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Dropdown panel */}
            {catMenuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                ...GLASS,
                borderRadius: 10,
                zIndex: 60,
                maxHeight: 260,
                display: "flex", flexDirection: "column",
                overflow: "hidden",
              }}>
                {/* Search within dropdown */}
                <div style={{ padding: "8px 8px 4px", flexShrink: 0 }}>
                  <input
                    autoFocus
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                    placeholder="Filter industries…"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "6px 10px",
                      background: "rgba(131,188,169,0.07)",
                      border: "1px solid rgba(131,188,169,0.18)",
                      borderRadius: 6,
                      color: "rgba(255,255,255,0.88)",
                      fontSize: 12, outline: "none",
                    }}
                  />
                </div>

                {/* Options list */}
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {/* All industries */}
                  <button
                    onClick={() => { setActiveCategory(null); setCatMenuOpen(false); setCatSearch(""); }}
                    style={{
                      width: "100%", padding: "7px 12px",
                      textAlign: "left",
                      background: !activeCategory ? "rgba(0,184,148,0.12)" : "transparent",
                      border: "none", borderBottom: "1px solid rgba(131,188,169,0.06)",
                      cursor: "pointer",
                      color: !activeCategory ? "#00B894" : "rgba(255,255,255,0.55)",
                      fontSize: 12,
                    }}
                  >
                    All industries
                  </button>
                  {filteredCats.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setActiveCategory(cat); setCatMenuOpen(false); setCatSearch(""); }}
                      style={{
                        width: "100%", padding: "7px 12px",
                        textAlign: "left",
                        background: activeCategory === cat ? "rgba(0,184,148,0.12)" : "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: activeCategory === cat ? "#00B894" : "rgba(255,255,255,0.55)",
                        fontSize: 12,
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                  {filteredCats.length === 0 && (
                    <p style={{ padding: "10px 12px", fontSize: 12, color: "rgba(255,255,255,0.25)", margin: 0 }}>
                      No match
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active category badge */}
          {activeCategory && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "5px 9px",
              background: "rgba(0,184,148,0.1)",
              border: "1px solid rgba(0,184,148,0.28)",
              borderRadius: 6,
            }}>
              <span style={{ fontSize: 11, color: "#00B894", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeCategory}
              </span>
              <button
                onClick={() => setActiveCategory(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,184,148,0.55)", fontSize: 13, padding: "0 0 0 6px", flexShrink: 0 }}
              >✕</button>
            </div>
          )}

          {/* Clear all */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{
                fontSize: 11, color: "rgba(255,98,51,0.65)",
                background: "none", border: "none", cursor: "pointer",
                textAlign: "left", padding: 0, letterSpacing: "0.05em", fontWeight: 600,
              }}
            >
              ✕ Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* ── Legend — bottom left ──────────────────────────────────────── */}
      <div
        className="absolute bottom-20 left-5 z-10"
        style={{ ...GLASS, display: "flex", flexDirection: "column", gap: 6, padding: "12px 14px", borderRadius: 10 }}
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

      {/* ── Hint — bottom right ───────────────────────────────────────── */}
      <p
        className="hidden sm:block absolute bottom-20 right-5 z-10"
        style={{ fontSize: 10.5, color: "rgba(255,255,255,0.14)", letterSpacing: "0.04em", margin: 0, lineHeight: 1.6 }}
      >
        Click member to open profile<br />
        Click industry hub to filter<br />
        Scroll to zoom · drag to pan
      </p>

      {/* ── Canvas ────────────────────────────────────────────────────── */}
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
          backgroundColor="rgba(0,0,0,0)"   /* transparent — atmosphere drawn in onRenderFramePre */
          width={dimensions.width}
          height={dimensions.height}
          warmupTicks={100}
          cooldownTicks={200}
          cooldownTime={8000}
          d3AlphaDecay={0.04}
          d3VelocityDecay={0.45}
          minZoom={0.12}
          maxZoom={14}
          enableZoomInteraction={isFocused}
          enablePanInteraction={isFocused}
        />
      </div>

      {/* ── Member modal ─────────────────────────────────────────────── */}
      {selectedMember && (
        <MemberModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}
