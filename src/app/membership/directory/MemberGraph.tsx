"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { type Member } from "@/data/members";
import { buildGraphData, type GraphNode, type GraphLink } from "./graphData";
import { MemberModal } from "./MemberModal";

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

// ── Constants ──────────────────────────────────────────────────────────────
const TOP_N = 35; // categories shown in overview globe

// ── Boundary force — keeps nodes inside circle ────────────────────────────
function forceRadialBoundary(radius: number, strength = 0.12) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let nodes: any[];
  function force(alpha: number) {
    nodes.forEach((n) => {
      const x = n.x ?? 0;
      const y = n.y ?? 0;
      const d = Math.sqrt(x * x + y * y);
      if (d > radius) {
        const f = ((d - radius) / d) * strength * alpha;
        n.vx = (n.vx ?? 0) - x * f;
        n.vy = (n.vy ?? 0) - y * f;
      }
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  force.initialize = (n: any[]) => { nodes = n; };
  return force;
}

// ── Ring force — attracts nodes toward a target orbit radius ─────────────
// Nodes inside the ring get pushed out; nodes outside get pulled in.
// Combined with forceRadialBoundary (ceiling) + charge (spread), this
// packs all category nodes into a tight, visible orbit band.
function forceRing(targetR: number, strength = 0.10) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let nodes: any[];
  function force(alpha: number) {
    nodes.forEach((n) => {
      const x = n.x ?? 0;
      const y = n.y ?? 0;
      const d = Math.sqrt(x * x + y * y);
      // Nudge nodes at origin outward so they don't get stuck at (0,0)
      if (d < 0.5) { n.vx = (n.vx ?? 0) + (Math.random() - 0.5) * 2; return; }
      const delta = (d - targetR) / d;
      n.vx = (n.vx ?? 0) - x * delta * strength * alpha;
      n.vy = (n.vy ?? 0) - y * delta * strength * alpha;
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  force.initialize = (n: any[]) => { nodes = n; };
  return force;
}

// ── Collision force — prevents node overlap, distributes angular spacing ──
// O(n²) over 35 nodes = 1225 comparisons per tick — negligible cost.
function forceNodeCollide(radius: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let nodes: any[];
  function force() {
    const minD = radius * 2;
    const minD2 = minD * minD;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = (a.x ?? 0) - (b.x ?? 0);
        const dy = (a.y ?? 0) - (b.y ?? 0);
        const d2 = dx * dx + dy * dy;
        if (d2 < minD2 && d2 > 0.01) {
          const d    = Math.sqrt(d2);
          const push = (minD - d) / d * 0.45;
          const fx   = dx * push;
          const fy   = dy * push;
          a.vx = (a.vx ?? 0) + fx;
          a.vy = (a.vy ?? 0) + fy;
          b.vx = (b.vx ?? 0) - fx;
          b.vy = (b.vy ?? 0) - fy;
        }
      }
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  force.initialize = (n: any[]) => { nodes = n; };
  return force;
}

// ── Label pill — rounded chip drawn behind canvas text ────────────────────
function drawLabelPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number, ty: number,
  fontSize: number,
  bgAlpha: number,
  textColor: string,
  bold?: boolean,
) {
  ctx.font = `${bold ? "700 " : ""}${fontSize}px 'BN Bergen','BN Bergen',system-ui,-apple-system,sans-serif`;
  const tw  = ctx.measureText(text).width;
  const ph  = fontSize * 1.6;
  const px  = fontSize * 0.65;
  const rad = Math.min(fontSize * 0.4, ph / 2);
  const bx  = cx - tw / 2 - px;
  const bw  = tw + px * 2;

  ctx.beginPath();
  ctx.moveTo(bx + rad, ty);
  ctx.lineTo(bx + bw - rad, ty);
  ctx.arcTo(bx + bw, ty,       bx + bw, ty + rad,       rad);
  ctx.lineTo(bx + bw, ty + ph - rad);
  ctx.arcTo(bx + bw, ty + ph,  bx + bw - rad, ty + ph,  rad);
  ctx.lineTo(bx + rad, ty + ph);
  ctx.arcTo(bx,        ty + ph, bx, ty + ph - rad,       rad);
  ctx.lineTo(bx, ty + rad);
  ctx.arcTo(bx,        ty,      bx + rad, ty,             rad);
  ctx.closePath();
  ctx.fillStyle    = `rgba(12,27,51,${bgAlpha})`;
  ctx.fill();
  ctx.fillStyle    = textColor;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, ty + ph / 2);
}

// ── Palette ───────────────────────────────────────────────────────────────
const C = {
  ci:       "#83BCA9",  ciRgb:  "131,188,169",
  vp:       "#FF6233",  vpRgb:  "255,98,51",
  standard: "rgba(131,188,169,0.5)",
  cat:      "#83BCA9",  catRgb: "131,188,169",
  link:     "rgba(131,188,169,0.15)",
} as const;

function tierOrder(n: GraphNode) {
  if (n.tier === "ci") return 0;
  if (n.tier === "vp") return 1;
  return 2;
}

// ── Component ─────────────────────────────────────────────────────────────
interface MemberGraphProps {
  members:    Member[];
  categories: string[];
}

export function MemberGraph({ members }: MemberGraphProps) {
  const containerRef     = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef            = useRef<any>(null);
  const startTimeRef     = useRef(Date.now());
  const zoomRef          = useRef(1);
  const bgColorRef       = useRef("#ffffff");
  const engineStoppedRef = useRef(false);
  // Dynamic boundary radius — updated whenever container resizes
  const boundaryRRef     = useRef(230);
  // CSS-pixel circle radius (no dpr) — used by handleEngineStop to compute
  // zoomToFit padding so nodes land inside the circle, not the rectangle corners
  const crCssRef         = useRef(200);
  // Device pixel ratio — cached on resize, never read inside the 60fps loop
  const dprRef           = useRef(typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1);
  // Node positions captured from paintNode each frame.
  // Reading this ref inside render callbacks is safe; calling
  // fgRef.current.graphData() inside a frame callback is NOT safe in v1.29.1.
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  // Chamber seal image — preloaded once, drawn in POST callback
  const logoImgRef = useRef<HTMLImageElement | null>(null);

  // Stable refs for canvas callbacks (avoids stale closures)
  const activeCatRef  = useRef<string | null>(null);
  const hoveredIdRef  = useRef<string | null>(null);
  const sidebarHovRef = useRef<string | null>(null);

  const [dimensions,     setDimensions]     = useState({ width: 800, height: 700 });
  const [selectedMember, setSelectedMember] = useState<GraphNode | null>(null);
  const [hoveredId,      setHoveredId]      = useState<string | null>(null);
  const [sidebarHovId,   setSidebarHovId]   = useState<string | null>(null);
  const [search,         setSearch]         = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sheetOpen,      setSheetOpen]      = useState(false);
  // True on touch-primary devices — pinch zoom works without the circle gate
  const [isTouch,        setIsTouch]        = useState(false);
  // Toggle between showing industry categories or individual members in the globe
  const [globeMode,      setGlobeMode]      = useState<"categories" | "members">("categories");

  activeCatRef.current  = activeCategory;
  hoveredIdRef.current  = hoveredId;
  sidebarHovRef.current = sidebarHovId;
  // Stable ref so canvas callbacks read globeMode without stale closures
  const globeModeRef = useRef(globeMode);
  globeModeRef.current = globeMode;

  // Detect touch-primary device once on mount
  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // Mobile = container narrower than 640px (all iPhones, not iPads)
  const isMobile = dimensions.width < 1024;

  // ── Derived data ───────────────────────────────────────────────────────
  const allGraphData = useMemo(() => buildGraphData(members), [members]);

  const catCounts = useMemo(() => {
    const map = new Map<string, number>();
    members.forEach((m) => m.categories.forEach((c) => map.set(c, (map.get(c) ?? 0) + 1)));
    return map;
  }, [members]);

  const sortedCategories = useMemo(
    () => [...catCounts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name),
    [catCounts],
  );

  const topCatSet = useMemo(
    () => new Set(sortedCategories.slice(0, TOP_N)),
    [sortedCategories],
  );

  const filteredCategories = useMemo(
    () => sortedCategories.filter((c) => c.toLowerCase().includes(search.toLowerCase())),
    [sortedCategories, search],
  );

  const focusMembers = useMemo(() => {
    if (!activeCategory) return [];
    return allGraphData.nodes
      .filter((n) => n.type === "member" && n.categories?.includes(activeCategory))
      .sort((a, b) => tierOrder(a) - tierOrder(b) || a.name.localeCompare(b.name));
  }, [activeCategory, allGraphData]);

  // ── Graph data fed to ForceGraph2D ─────────────────────────────────────
  const graphData = useMemo<{ nodes: GraphNode[]; links: GraphLink[] }>(() => {
    if (!activeCategory) {
      if (globeMode === "members") {
        // Members overview: every member node, no links (spokes drawn in POST)
        return {
          nodes: allGraphData.nodes.filter((n) => n.type === "member"),
          links: [],
        };
      }
      // Pre-position nodes at evenly distributed angles on a small inner circle.
      // The ring force expands them radially to the target orbit while the preset
      // angles enforce Euclidean symmetry — D3 charge alone can't guarantee even
      // angular spacing, so we seed it here. vx/vy=0 prevents random kick-off.
      const catNodes = allGraphData.nodes.filter(
        (n) => n.type === "category" && topCatSet.has(n.name),
      );
      return {
        nodes: catNodes.map((n, i) => {
          const angle = (i / catNodes.length) * Math.PI * 2 - Math.PI / 2;
          const r = 12;
          return { ...n, x: Math.cos(angle) * r, y: Math.sin(angle) * r, vx: 0, vy: 0 };
        }),
        links: [],
      };
    }
    const catNode = allGraphData.nodes.find((n) => n.id === `cat:${activeCategory}`);
    if (!catNode) return { nodes: [], links: [] };

    const memberNodes = allGraphData.nodes.filter(
      (n) => n.type === "member" && n.categories?.includes(activeCategory),
    );

    const pinnedCat: GraphNode = { ...catNode, fx: 0, fy: 0, x: 0, y: 0 };

    return {
      nodes: [pinnedCat, ...memberNodes],
      links: memberNodes.map((m) => ({ source: m.id, target: `cat:${activeCategory}` })),
    };
  }, [activeCategory, globeMode, allGraphData, topCatSet]);

  // ── Read page bg colour for canvas mask ────────────────────────────────
  useEffect(() => {
    bgColorRef.current =
      getComputedStyle(document.documentElement).getPropertyValue("--bg-primary").trim() ||
      "#ffffff";
  }, []);

  // ── Preload Chamber seal — drawn in POST callback once loaded ───────────
  useEffect(() => {
    const img = new Image();
    img.src = "/images/logos/stamp-orange.png";
    img.onload  = () => { logoImgRef.current = img; };
    img.onerror = () => { logoImgRef.current = null; }; // text fallback stays active
  }, []);

  // ── Responsive sizing — watch the globe container ──────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      dprRef.current = window.devicePixelRatio || 1;
      setDimensions({ width: e.contentRect.width, height: e.contentRect.height });
    });
    ro.observe(el);
    setDimensions({ width: el.offsetWidth, height: el.offsetHeight });
    return () => ro.disconnect();
  }, []);

  // ── Dynamic boundary radius — Euclidean safe-area constraint ───────────
  // Find the largest circle centered at the canvas midpoint that avoids the
  // top UI stack (toggle pill + caption at top-5) and bottom hint bar, then
  // set the D3 orbit radius to 78% of that circle so nodes stay well inside.
  useEffect(() => {
    const { width: w, height: h } = dimensions;
    const topPad  = 110; // toggle + caption + top-5 offset + buffer (CSS px)
    const botPad  = 32;  // bottom hint + buffer (CSS px)
    const sidePad = 12;  // aesthetic side clearance (CSS px)
    const crCss = Math.max(
      60,
      Math.floor(Math.min(w / 2 - sidePad, h / 2 - topPad, h / 2 - botPad)) - 2,
    );
    crCssRef.current     = crCss;
    boundaryRRef.current = Math.max(Math.round(crCss * 0.78), 60);
  }, [dimensions]);

  // ── D3 force reconfiguration on mode switch ────────────────────────────
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    if (activeCategory) {
      fg.d3Force("charge")?.strength((n: GraphNode) => n.type === "category" ? 0 : -140);
      fg.d3Force("link")?.distance(85).strength(0.55);
      fg.d3Force("boundary", forceRadialBoundary(boundaryRRef.current, 0.18));
      fg.d3Force("ring",    null); // ring force not needed in focus mode
      fg.d3Force("collide", null); // collision force not needed in focus mode
    } else if (globeMode === "members") {
      // Members overview: 500+ small dots fill the globe organically.
      // Light charge for even distribution; no ring (fill whole globe area);
      // strong boundary to contain them; no custom collide (charge handles spacing).
      fg.d3Force("charge")?.strength(-20);
      fg.d3Force("link")?.strength(0);
      fg.d3Force("boundary", forceRadialBoundary(boundaryRRef.current, 0.30));
      fg.d3Force("ring",    null);
      fg.d3Force("collide", null);
    } else {
      // Categories overview: ring force pulls category nodes toward a target orbit band,
      // leaving the centre clear for the Chamber pupil.
      //
      // Ring target at 0.70 × boundary gives labels ~30% of the boundary radius
      // as outward clearance so they don't clip the circle edge.
      fg.d3Force("charge")?.strength(-360);
      fg.d3Force("link")?.strength(0);
      fg.d3Force("boundary", forceRadialBoundary(boundaryRRef.current, 0.22));
      fg.d3Force("ring",     forceRing(boundaryRRef.current * 0.70, 0.14));
      fg.d3Force("collide",  forceNodeCollide(18));
    }

    // Clear stale positions so PRE/POST don't draw spokes from old coords
    // during the transition frame before paintNode repopulates the map.
    nodePositionsRef.current.clear();
    engineStoppedRef.current = false;
    fg.d3ReheatSimulation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData]);

  // ── Engine settled → zoom to fit ──────────────────────────────────────
  // zoomToFit fits nodes to the full canvas rectangle, but the visible area
  // is a circle. We pad by the dead rectangular corners (min(W,H)/2 − crCss)
  // so nodes land inside the circle, plus a label-buffer for text overhang.
  const handleEngineStop = useCallback(() => {
    if (!engineStoppedRef.current) {
      engineStoppedRef.current = true;
      const canvas = containerRef.current?.querySelector("canvas");
      const w = canvas ? canvas.offsetWidth  : 800;
      const h = canvas ? canvas.offsetHeight : 700;
      const circleMargin = Math.max(0, Math.round(Math.min(w, h) / 2 - crCssRef.current));
      const labelBuffer  = activeCatRef.current ? 60 : 40;
      fgRef.current?.zoomToFit(700, circleMargin + labelBuffer);
    }
  }, []);

  // ── Zoom helpers ───────────────────────────────────────────────────────
  const handleZoom  = useCallback(({ k }: { k: number }) => { zoomRef.current = k; }, []);
  const zoomIn      = useCallback(() => fgRef.current?.zoom(zoomRef.current * 1.5, 300), []);
  const zoomOut     = useCallback(() => fgRef.current?.zoom(zoomRef.current / 1.5, 300), []);
  const zoomReset   = useCallback(() => fgRef.current?.zoomToFit(500, 40), []);

  // ── Pre-frame: radial atmosphere + pulsing globe ring ─────────────────
  const handleRenderFramePre = useCallback((ctx: CanvasRenderingContext2D) => {
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const t  = (Date.now() - startTimeRef.current) / 1000;
    const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.18);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const maxR = Math.sqrt((cw / 2) ** 2 + (ch / 2) ** 2);
    const atm  = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, maxR);
    atm.addColorStop(0,    "rgba(12,27,51,0.97)");
    atm.addColorStop(0.45, "rgba(12,27,51,0.93)");
    atm.addColorStop(0.72, "rgba(12,27,51,0.48)");
    atm.addColorStop(0.88, "rgba(12,27,51,0.10)");
    atm.addColorStop(1,    "rgba(12,27,51,0)");
    ctx.fillStyle = atm;
    ctx.fillRect(0, 0, cw, ch);
    ctx.restore();

    // Use dynamic boundary radius (synced via ref)
    const r    = boundaryRRef.current;
    const halo = ctx.createRadialGradient(0, 0, r * 0.78, 0, 0, r * 1.32);
    halo.addColorStop(0, `rgba(131,188,169,${(0.04 + pulse * 0.03).toFixed(3)})`);
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(0, 0, r * 1.32, 0, Math.PI * 2);
    ctx.fillStyle = halo; ctx.fill();

    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(131,188,169,${(0.09 + pulse * 0.07).toFixed(3)})`;
    ctx.lineWidth   = 0.8;
    ctx.stroke();

    const vig = ctx.createRadialGradient(0, 0, r * 0.38, 0, 0, r);
    vig.addColorStop(0,   "rgba(40,68,105,0.05)");
    vig.addColorStop(0.7, "rgba(12,27,51,0)");
    vig.addColorStop(1,   "rgba(0,0,0,0.48)");
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = vig; ctx.fill();
  }, []);

  // ── Post-frame: paint page-bg over corners → circle illusion ──────────
  const handleRenderFramePost = useCallback((ctx: CanvasRenderingContext2D) => {
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    // Euclidean: largest circle centered at (cw/2, ch/2) that clears the
    // top UI stack (toggle + caption) and bottom hint, in physical pixels.
    const dpr     = dprRef.current;
    const topPad  = Math.round(110 * dpr);
    const botPad  = Math.round(32  * dpr);
    const sidePad = Math.round(12  * dpr);
    const cr = Math.max(
      60 * dpr,
      Math.floor(Math.min(cw / 2 - sidePad, ch / 2 - topPad, ch / 2 - botPad)) - 2,
    );

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Shared pulse — drives spoke + pupil glow breathing
    const _t     = (Date.now() - startTimeRef.current) / 1000;
    const _pulse = 0.55 + 0.45 * Math.sin(_t * Math.PI * 2 * 0.22);

    // ── Spokes: coquelicot radial lines from Chamber pupil to each node ──
    // Two-pass (glow + core) for the orange-red bloom effect.
    // Members mode uses batched single-stroke calls (no per-line gradient
    // objects) to stay inside frame budget with 500+ nodes.
    if (!activeCatRef.current && nodePositionsRef.current.size > 0) {
      const k   = zoomRef.current;
      const pr  = Math.max(26, Math.min(cr * 0.24, 88));
      const ocx = cw / 2;
      const ocy = ch / 2;

      if (globeModeRef.current === "members") {
        // Batched: collect all sub-paths, single stroke() per pass
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255,80,0,${(0.05 * _pulse).toFixed(3)})`;
        ctx.lineWidth   = Math.max(1.2, 1.1 * dpr);
        nodePositionsRef.current.forEach(({ x, y }) => {
          const sx = ocx + x * k * dpr;
          const sy = ocy + y * k * dpr;
          const dx = sx - ocx, dy = sy - ocy;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < pr + 4) return;
          const nx = dx / d, ny = dy / d;
          ctx.moveTo(ocx + nx * (pr + 8), ocy + ny * (pr + 8));
          ctx.lineTo(sx - nx * 4, sy - ny * 4);
        });
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = `rgba(255,98,51,${(0.22 * _pulse).toFixed(3)})`;
        ctx.lineWidth   = Math.max(0.45, 0.40 * dpr);
        nodePositionsRef.current.forEach(({ x, y }) => {
          const sx = ocx + x * k * dpr;
          const sy = ocy + y * k * dpr;
          const dx = sx - ocx, dy = sy - ocy;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < pr + 4) return;
          const nx = dx / d, ny = dy / d;
          ctx.moveTo(ocx + nx * (pr + 8), ocy + ny * (pr + 8));
          ctx.lineTo(sx - nx * 4, sy - ny * 4);
        });
        ctx.stroke();
      } else {
        // Per-node gradient spokes for ≤35 category nodes
        nodePositionsRef.current.forEach(({ x, y }) => {
          const sx = ocx + x * k * dpr;
          const sy = ocy + y * k * dpr;
          const dx = sx - ocx;
          const dy = sy - ocy;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < pr + 4) return;
          const nx = dx / d;
          const ny = dy / d;
          const x0 = ocx + nx * (pr + 10);
          const y0 = ocy + ny * (pr + 10);
          const x1 = sx  - nx * 7;
          const y1 = sy  - ny * 7;

          // Glow pass — wide soft halo in coquelicot
          const glowA  = (0.18 * _pulse).toFixed(3);
          const glowA2 = (0.30 * _pulse).toFixed(3);
          const glowGrad = ctx.createLinearGradient(x0, y0, x1, y1);
          glowGrad.addColorStop(0,   "rgba(255,80,0,0)");
          glowGrad.addColorStop(0.2, `rgba(255,80,0,${glowA})`);
          glowGrad.addColorStop(1,   `rgba(255,98,33,${glowA2})`);
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.strokeStyle = glowGrad;
          ctx.lineWidth   = Math.max(3.0, 2.8 * dpr);
          ctx.stroke();

          // Core pass — tight bright line
          const coreA  = (0.28 * _pulse).toFixed(3);
          const coreA2 = (0.60 * _pulse).toFixed(3);
          const coreGrad = ctx.createLinearGradient(x0, y0, x1, y1);
          coreGrad.addColorStop(0,    "rgba(255,98,51,0)");
          coreGrad.addColorStop(0.15, `rgba(255,98,51,${coreA})`);
          coreGrad.addColorStop(1,    `rgba(255,140,70,${coreA2})`);
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.strokeStyle = coreGrad;
          ctx.lineWidth   = Math.max(0.7, 0.65 * dpr);
          ctx.stroke();
        });
      }
    }

    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    ctx.arc(cw / 2, ch / 2, cr, 0, Math.PI * 2, true);
    ctx.fillStyle = bgColorRef.current;
    ctx.fill("evenodd");

    ctx.beginPath();
    ctx.arc(cw / 2, ch / 2, cr, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(131,188,169,0.22)";
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // ── Chamber pupil — only in overview mode (focus mode has a category hub) ──
    if (!activeCatRef.current) {
      const cx = cw / 2;
      const cy = ch / 2;
      // Pupil is ~36% of the circle radius — big enough to read the seal,
      // still leaves comfortable ring space for all 35 industry nodes.
      const pr = Math.max(26, Math.min(cr * 0.24, 88));

      // Pulsing outer glow — cambridge halo that breathes with the scene
      const glowR1 = pr * 0.9;
      const glowR2 = pr * 2.4;
      const outerGlow = ctx.createRadialGradient(cx, cy, glowR1, cx, cy, glowR2);
      outerGlow.addColorStop(0,   `rgba(131,188,169,${(0.28 * _pulse).toFixed(3)})`);
      outerGlow.addColorStop(0.4, `rgba(131,188,169,${(0.10 * _pulse).toFixed(3)})`);
      outerGlow.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx, cy, glowR2, 0, Math.PI * 2);
      ctx.fillStyle = outerGlow; ctx.fill();

      // Pupil background — deep navy, slightly lighter at top for depth
      const pupilBg = ctx.createRadialGradient(cx, cy - pr * 0.18, 0, cx, cy, pr);
      pupilBg.addColorStop(0,   "rgba(22,45,82,0.97)");
      pupilBg.addColorStop(0.65,"rgba(14,31,58,0.98)");
      pupilBg.addColorStop(1,   "rgba(9,20,40,1.0)");
      ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2);
      ctx.fillStyle = pupilBg; ctx.fill();

      // Inner border ring — cambridge, pulsing
      ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(131,188,169,${(0.22 + 0.18 * _pulse).toFixed(3)})`;
      ctx.lineWidth   = 1.0; ctx.stroke();

      // Outer accent ring — coquelicot pulse, sits just outside pupil
      ctx.beginPath(); ctx.arc(cx, cy, pr * 1.06, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,98,51,${(0.08 + 0.10 * _pulse).toFixed(3)})`;
      ctx.lineWidth   = 1.8; ctx.stroke();

      // Far halo ring — soft cambridge at 1.5× radius
      ctx.beginPath(); ctx.arc(cx, cy, pr * 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(131,188,169,${(0.04 + 0.04 * _pulse).toFixed(3)})`;
      ctx.lineWidth   = 0.8; ctx.stroke();

      if (logoImgRef.current) {
        // ── Glowing seal image ──────────────────────────────────────────────
        // Step 1: coquelicot shadow halo rendered BEFORE the clip so it bleeds
        // outward past the circle edge for a genuine bloom effect.
        ctx.beginPath();
        ctx.arc(cx, cy, pr * 0.90, 0, Math.PI * 2);
        ctx.shadowColor = `rgba(255,80,0,${(0.70 * _pulse).toFixed(3)})`;
        ctx.shadowBlur  = Math.round(pr * 0.45);
        ctx.fillStyle   = `rgba(255,80,0,${(0.06 + 0.08 * _pulse).toFixed(3)})`;
        ctx.fill();
        ctx.shadowBlur  = 0;

        // Step 2: draw seal clipped to pupil circle — keeps corners tidy
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, pr, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalAlpha = 0.78 + 0.16 * _pulse;
        ctx.drawImage(logoImgRef.current, cx - pr, cy - pr, pr * 2, pr * 2);
        ctx.globalAlpha = 1;
        ctx.restore();
      } else {
        // ── Text fallback while seal loads ──────────────────────────────────
        ctx.fillStyle    = "rgba(131,188,169,0.93)";
        ctx.font         = `700 ${Math.round(pr * 0.26)}px 'BN Bergen',system-ui,-apple-system,sans-serif`;
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("MEDINA", cx, cy - pr * 0.13);
        ctx.fillStyle = "rgba(255,255,255,0.48)";
        ctx.font      = `300 ${Math.round(pr * 0.165)}px 'BN Bergen',system-ui,-apple-system,sans-serif`;
        ctx.fillText("CHAMBER", cx, cy + pr * 0.13);
        ctx.fillStyle = "rgba(131,188,169,0.36)";
        ctx.font      = `${Math.round(pr * 0.105)}px 'BN Bergen',system-ui,-apple-system,sans-serif`;
        ctx.fillText("EST. 1938", cx, cy + pr * 0.36);
      }
    }

    ctx.restore();
  }, []);

  // ── Node canvas renderer ───────────────────────────────────────────────
  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x   = node.x ?? 0;
      const y   = node.y ?? 0;
      // Capture live position so POST can draw spokes without calling graphData()
      nodePositionsRef.current.set(node.id, { x, y });
      const t   = (Date.now() - startTimeRef.current) / 1000;
      const isGlobeHov  = node.id === hoveredIdRef.current;
      const isSideHov   = node.id === sidebarHovRef.current;
      const isHov       = isGlobeHov || isSideHov;
      const isFocusMode = !!activeCatRef.current;

      // ── Category node ────────────────────────────────────────────────
      if (node.type === "category") {
        const count      = catCounts.get(node.name) ?? 0;
        const isFocusHub = isFocusMode && activeCatRef.current === node.name;

        if (isFocusHub) {
          const r     = 15;
          const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.22);

          const neb = ctx.createRadialGradient(x, y, r, x, y, r * 5);
          neb.addColorStop(0, `rgba(${C.catRgb},${(0.38 + pulse * 0.22).toFixed(3)})`);
          neb.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath(); ctx.arc(x, y, r * 5, 0, Math.PI * 2);
          ctx.fillStyle = neb; ctx.fill();

          ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${C.catRgb},${(0.55 + pulse * 0.32).toFixed(3)})`;
          ctx.lineWidth   = 1.8; ctx.stroke();

          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = C.cat; ctx.fill();

          ctx.beginPath(); ctx.arc(x, y, r * 0.34, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.fill();

          const fs  = Math.max(11.5 / globalScale, 1.5);
          const lbl = node.name.length > 22 ? node.name.slice(0, 20) + "…" : node.name;
          drawLabelPill(ctx, lbl, x, y + r + 5 / globalScale, fs, 0.93, "rgba(255,255,255,0.96)", true);

          const subFs = Math.max(9 / globalScale, 1.1);
          drawLabelPill(
            ctx, "Members", x,
            y + r + (fs * 1.65 + 7) / globalScale,
            subFs, 0.70, `rgba(${C.catRgb},0.85)`,
          );
          return;
        }

        const r     = Math.max(5, Math.min(17, 5 + Math.sqrt(count) * 1.05));
        const phase = x * 0.14 + y * 0.10;
        const pulse = 0.42 + 0.32 * Math.sin(t * 1.88 + phase);

        if (isHov) {
          const hov = ctx.createRadialGradient(x, y, 0, x, y, r * 5.5);
          hov.addColorStop(0, `rgba(${C.catRgb},0.55)`);
          hov.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath(); ctx.arc(x, y, r * 5.5, 0, Math.PI * 2);
          ctx.fillStyle = hov; ctx.fill();
        }

        const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3.8);
        glow.addColorStop(0, `rgba(${C.catRgb},${(pulse * 0.20).toFixed(3)})`);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(x, y, r * 3.8, 0, Math.PI * 2);
        ctx.fillStyle = glow; ctx.fill();

        const effectiveR = isHov ? r * 1.28 : r;
        ctx.beginPath(); ctx.arc(x, y, effectiveR, 0, Math.PI * 2);
        ctx.fillStyle = isHov ? C.ci : `rgba(${C.catRgb},0.88)`;
        ctx.fill();

        ctx.beginPath(); ctx.arc(x, y, effectiveR * 0.30, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.88)"; ctx.fill();

        const fs  = Math.max(10 / globalScale, 1.2);
        const lbl = node.name.length > 21 ? node.name.slice(0, 19) + "…" : node.name;
        drawLabelPill(
          ctx, lbl, x, y + effectiveR + 3.5 / globalScale, fs,
          isHov ? 0.92 : 0.74,
          isHov ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.82)",
          isHov,
        );

        // Show count sub-label only on hover (overview) or always in focus mode —
        // 35 two-line labels in a ring creates too much radial clutter.
        if (count > 0 && (isHov || isFocusMode)) {
          const cfs = Math.max(8.5 / globalScale, 1.0);
          drawLabelPill(
            ctx, `${count}`, x,
            y + effectiveR + (fs * 1.65 + 4) / globalScale,
            cfs, 0.60, `rgba(${C.catRgb},0.72)`,
          );
        }
        return;
      }

      // ── Member node — focus mode or members-overview ─────────────────
      const isMembersOv = globeModeRef.current === "members" && !activeCatRef.current;
      // Tiny dots in members overview; full size in focus mode
      const baseR = isMembersOv
        ? (node.tier === "ci" ? 3.0 : node.tier === "vp" ? 2.2 : 1.6)
        : (node.tier === "ci" ? 8.5 : node.tier === "vp" ? 6.5 : 5);
      const r   = isHov ? baseR * (isMembersOv ? 2.8 : 1.55) : baseR;
      const rgb = node.tier === "ci" ? C.ciRgb : node.tier === "vp" ? C.vpRgb : C.ciRgb;
      const col = node.tier === "ci" ? C.ci    : node.tier === "vp" ? C.vp    : C.standard;

      // Aura/glow: always in focus mode; only on hover in members overview
      if (!isMembersOv || isHov) {
        if (node.tier === "ci" || isHov) {
          const phase = (node.x ?? 0) * 0.20 + (node.y ?? 0) * 0.13;
          const pulse = 0.38 + 0.28 * Math.sin(t * 1.9 + phase);
          const auraR = isHov ? r * 6.5 : r * 5;
          const grd   = ctx.createRadialGradient(x, y, r * 0.5, x, y, auraR);
          grd.addColorStop(0, `rgba(${rgb},${(pulse * (isHov ? 0.68 : 0.50)).toFixed(3)})`);
          grd.addColorStop(0.55, `rgba(${rgb},${(pulse * 0.10).toFixed(3)})`);
          grd.addColorStop(1,   "rgba(0,0,0,0)");
          ctx.beginPath(); ctx.arc(x, y, auraR, 0, Math.PI * 2);
          ctx.fillStyle = grd; ctx.fill();
        } else if (node.tier === "vp") {
          const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5);
          grd.addColorStop(0, `rgba(${rgb},0.28)`);
          grd.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath(); ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = grd; ctx.fill();
        }
      }

      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      // In members overview (non-hover) use slightly muted fill so tiers still read
      ctx.fillStyle = (isMembersOv && !isHov)
        ? (node.tier === "ci" ? `rgba(${C.ciRgb},0.82)`
           : node.tier === "vp" ? `rgba(${C.vpRgb},0.72)`
           : `rgba(${C.ciRgb},0.38)`)
        : col;
      ctx.fill();

      if (isHov) {
        ctx.beginPath(); ctx.arc(x, y, r + (isMembersOv ? 1.2 : 1.8), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb},0.88)`;
        ctx.lineWidth   = 0.9; ctx.stroke();
      } else if (!isMembersOv && node.tier === "ci") {
        ctx.beginPath(); ctx.arc(x, y, r + 1.8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb},0.42)`;
        ctx.lineWidth   = 0.9; ctx.stroke();
      }

      // Labels: show in focus mode always; members overview only on hover
      if (!isMembersOv || isHov) {
        const fs  = Math.max(10.5 / globalScale, 1.4);
        const lbl = node.name.length > 24 ? node.name.slice(0, 22) + "…" : node.name;
        const tcol = node.tier === "ci" ? `rgba(${C.ciRgb},0.96)` :
                     node.tier === "vp" ? `rgba(${C.vpRgb},0.96)` :
                     "rgba(255,255,255,0.83)";
        drawLabelPill(
          ctx, lbl, x, y + r + 2.5 / globalScale, fs,
          isHov ? 0.92 : 0.80,
          tcol, node.tier === "ci",
        );
      }
    },
    [catCounts],
  );

  // ── Link colour ────────────────────────────────────────────────────────
  const getLinkColor = useCallback(() => C.link, []);

  // ── Node value (influences D3 collision area) ──────────────────────────
  const getNodeVal = useCallback(
    (node: GraphNode) => {
      if (node.type === "category") {
        const count = catCounts.get(node.name) ?? 0;
        return activeCategory ? 220 : Math.max(12, 5 + count * 0.35);
      }
      // Members overview: tiny values so 500+ dots pack tightly
      if (!activeCategory && globeMode === "members") {
        if (node.tier === "ci") return 2;
        if (node.tier === "vp") return 1.5;
        return 1;
      }
      if (node.tier === "ci") return 16;
      if (node.tier === "vp") return 10;
      return 6;
    },
    [catCounts, activeCategory, globeMode],
  );

  // ── Interactions ───────────────────────────────────────────────────────
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.type === "category") {
      setActiveCategory((prev) => (prev === node.name ? null : node.name));
      setSearch("");
      setSheetOpen(false);
      engineStoppedRef.current = false;
    } else if (node.type === "member") {
      setSelectedMember(node);
    }
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredId(node?.id ?? null);
    const canvas = containerRef.current?.querySelector("canvas") as HTMLElement | null;
    if (canvas) canvas.style.cursor = node ? "pointer" : "default";
  }, []);

  const focusCategory = useCallback((cat: string) => {
    setActiveCategory(cat);
    setSearch("");
    setSheetOpen(false);
    engineStoppedRef.current = false;
  }, []);

  const clearFocus = useCallback(() => {
    setActiveCategory(null);
    setSearch("");
    engineStoppedRef.current = false;
  }, []);

  // ── Filtered member list ───────────────────────────────────────────────
  const visibleFocusMembers = useMemo(
    () => focusMembers.filter(
      (m) => !search || m.name.toLowerCase().includes(search.toLowerCase()),
    ),
    [focusMembers, search],
  );

  // ── Tier dot colour for sidebar rows ──────────────────────────────────
  function tierDot(tier: string | undefined) {
    if (tier === "ci") return C.ci;
    if (tier === "vp") return C.vp;
    return "rgba(131,188,169,0.5)";
  }

  // ── Sidebar inner content — shared between desktop aside + mobile sheet
  const sidebarContent = (
    <>
      {/* Search */}
      <div style={{ padding: "11px 14px 9px", flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <svg style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            width: 13, height: 13, pointerEvents: "none", color: "var(--text-tertiary)",
          }} viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.116-.099zM6.5 12a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeCategory ? "Search members…" : "Search industries…"}
            style={{
              paddingLeft: 32, paddingRight: 10, paddingTop: 8, paddingBottom: 8,
              width: "100%", boxSizing: "border-box",
              background:  "var(--bg-tertiary)",
              border:      "1px solid var(--border-primary)", borderRadius: 8,
              color:       "var(--text-primary)", fontSize: 13, outline: "none",
              fontFamily:  "inherit",
              transition:  "border-color 150ms ease",
            }}
          />
        </div>
      </div>

      {/* Mode bar */}
      <div style={{
        padding:      "0 14px 9px", flexShrink: 0,
        borderBottom: "1px solid var(--border-primary)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {activeCategory ? (
          <>
            <button
              onClick={clearFocus}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-accent)", fontSize: 12, fontWeight: 600,
                padding: 0, fontFamily: "inherit", touchAction: "manipulation",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M8 2.5L3.5 6.5L8 10.5" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              All industries
            </button>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              Members
            </span>
          </>
        ) : (
          <>
            <span style={{
              fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)",
              textTransform: "uppercase", letterSpacing: "0.12em",
            }}>
              Industries
            </span>
          </>
        )}
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: 4, paddingBottom: 4 }}>
        {activeCategory ? (
          <>
            {/* Active category banner */}
            <div style={{
              margin: "6px 12px 6px", padding: "9px 12px", borderRadius: 8,
              background: "rgba(131,188,169,0.09)", border: "1px solid rgba(131,188,169,0.22)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", background: C.cat,
                boxShadow: "0 0 7px rgba(131,188,169,0.6)", flexShrink: 0,
              }} />
              <span style={{
                fontSize: 12, fontWeight: 700, color: "var(--text-primary)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {activeCategory}
              </span>
            </div>

            {visibleFocusMembers.map((m) => {
              const isHov = m.id === sidebarHovId;
              const dot   = tierDot(m.tier);
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMember(m)}
                  onMouseEnter={() => setSidebarHovId(m.id)}
                  onMouseLeave={() => setSidebarHovId(null)}
                  style={{
                    width: "100%", padding: "10px 16px", minHeight: 44,
                    display: "flex", alignItems: "center", gap: 10,
                    background:  isHov ? "var(--bg-tertiary)" : "transparent",
                    border:      "none", cursor: "pointer", textAlign: "left",
                    fontFamily:  "inherit", touchAction: "manipulation",
                    transition:  "background 120ms ease",
                  }}
                >
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0,
                    boxShadow: m.tier !== "standard" ? `0 0 5px ${dot}` : undefined,
                  }} />
                  <span style={{
                    flex: 1, fontSize: 13, color: "var(--text-primary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {m.name}
                  </span>
                  <svg
                    width="11" height="11" viewBox="0 0 11 11" fill="none"
                    style={{ flexShrink: 0, opacity: isHov ? 0.5 : 0, transition: "opacity 120ms" }}
                  >
                    <path d="M3.5 2L7.5 5.5L3.5 9" stroke="var(--text-primary)"
                      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              );
            })}

            {visibleFocusMembers.length === 0 && (
              <p style={{
                padding: "20px 18px", fontSize: 12,
                color: "var(--text-tertiary)", textAlign: "center",
              }}>
                No members match
              </p>
            )}
          </>
        ) : (
          filteredCategories.map((cat) => {
            const count   = catCounts.get(cat) ?? 0;
            const isHov   = `cat:${cat}` === sidebarHovId;
            const inGlobe = topCatSet.has(cat);
            return (
              <button
                key={cat}
                onClick={() => focusCategory(cat)}
                onMouseEnter={() => setSidebarHovId(`cat:${cat}`)}
                onMouseLeave={() => setSidebarHovId(null)}
                style={{
                  width: "100%", padding: "10px 16px", minHeight: 44,
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: 8,
                  background:  isHov ? "var(--bg-tertiary)" : "transparent",
                  border:      "none", cursor: "pointer", textAlign: "left",
                  fontFamily:  "inherit", touchAction: "manipulation",
                  transition:  "background 120ms ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background:  inGlobe ? C.cat : "var(--border-primary)",
                    flexShrink:  0,
                    boxShadow:   inGlobe && isHov ? "0 0 6px rgba(131,188,169,0.55)" : undefined,
                    transition:  "box-shadow 120ms",
                  }} />
                  <span style={{
                    fontSize: 13, color: "var(--text-primary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {cat}
                  </span>
                </div>
                <span style={{
                  fontSize: 11, flexShrink: 0, transition: "color 120ms",
                  color:             isHov ? C.cat : "var(--text-tertiary)",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {count}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div style={{
        padding: "11px 16px", borderTop: "1px solid var(--border-primary)", flexShrink: 0,
      }}>
        <p style={{
          margin: "0 0 7px", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.12em", color: "var(--text-tertiary)", textTransform: "uppercase",
        }}>
          Membership tier
        </p>
        {([
          { color: C.ci,    glow: C.ciRgb, label: "Community Investor" },
          { color: C.vp,    glow: C.vpRgb, label: "Visibility Plus" },
          { color: "rgba(131,188,169,0.5)", glow: null, label: "Member" },
        ] as const).map(({ color, glow, label }) => (
          <span key={label} style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 11, color: "var(--text-secondary)", marginBottom: 5,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0,
              boxShadow: glow ? `0 0 5px rgba(${glow},0.6)` : undefined,
            }} />
            {label}
          </span>
        ))}
      </div>
    </>
  );

  return (
    // Mobile: `relative` wrapper (globe = absolute inset-0, no sidebar)
    // Desktop: `flex` row (296px sidebar | flex-1 globe)
    <div
      className={`select-none overflow-hidden rounded-2xl border border-border-primary${isMobile ? " relative" : " flex"}`}
      style={{
        height:    "86vh",
        minHeight: isMobile ? 360 : 560,
        boxShadow: "0 4px 40px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.8) inset",
      }}
    >
      {/* ════════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR — hidden on mobile
          ════════════════════════════════════════════════════════════════ */}
      {!isMobile && (
        <aside
          className="flex flex-col flex-shrink-0 overflow-hidden"
          style={{
            width:       296,
            background:  "var(--bg-secondary)",
            borderRight: "1px solid var(--border-primary)",
          }}
        >
          {/* Header */}
          <div style={{
            padding:      "18px 18px 14px",
            borderBottom: "1px solid var(--border-primary)",
            flexShrink:   0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%", background: "#00B894",
                boxShadow: "0 0 8px rgba(0,184,148,0.8)", flexShrink: 0,
              }} />
              <h2 style={{
                margin: 0, fontSize: 14, fontWeight: 700,
                color: "var(--text-primary)", letterSpacing: "-0.01em",
              }}>
                Member Network
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-tertiary)" }}>
              Every member, mapped by industry
            </p>
          </div>
          {sidebarContent}
        </aside>
      )}

      {/* ════════════════════════════════════════════════════════════════
          GLOBE — full width on mobile, flex-1 on desktop
          ════════════════════════════════════════════════════════════════ */}
      <div
        className={`${isMobile ? "absolute inset-0" : "relative flex-1"} overflow-hidden`}
        style={{ background: "var(--bg-primary)" }}
      >
        {/* ForceGraph2D canvas */}
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
            onZoom={handleZoom}
            onRenderFramePre={handleRenderFramePre}
            onRenderFramePost={handleRenderFramePost}
            linkColor={getLinkColor}
            linkWidth={0.45}
            linkOpacity={0.85}
            backgroundColor="rgba(0,0,0,0)"
            width={dimensions.width}
            height={dimensions.height}
            warmupTicks={
              activeCategory
                ? (isMobile ? 30 : 70)
                : globeMode === "members"
                  ? (isMobile ? 120 : 260)
                  : (isMobile ? 60 : 140)
            }
            cooldownTicks={160}
            cooldownTime={7000}
            d3AlphaDecay={0.038}
            d3VelocityDecay={0.44}
            minZoom={0.14}
            maxZoom={14}
            // Touch: keep pinch-zoom (natural gesture, no scroll conflict).
            // Desktop: scroll-zoom disabled — it hijacks page scroll and feels
            // clunky. Use the +/− buttons or zoomToFit instead.
            enableZoomInteraction={isTouch}
            enablePanInteraction={true}
          />
        </div>

        {/* Globe mode toggle + caption */}
        <div className="absolute top-5 left-0 right-0 flex flex-col items-center gap-2 z-10">
          {/* Toggle pill — overview only, needs pointer events */}
          {!activeCategory && (
            <div style={{
              display:              "flex",
              background:           "rgba(12,27,51,0.72)",
              backdropFilter:       "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border:               "1px solid rgba(131,188,169,0.18)",
              borderRadius:         20,
              padding:              "3px",
              gap:                  2,
            }}>
              {(["categories", "members"] as const).map((mode) => {
                const active = globeMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setGlobeMode(mode)}
                    style={{
                      padding:       "4px 14px",
                      borderRadius:  16,
                      border:        "none",
                      cursor:        "pointer",
                      fontFamily:    "inherit",
                      fontSize:      10,
                      fontWeight:    700,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase" as const,
                      touchAction:   "manipulation",
                      transition:    "background 200ms ease, color 200ms ease",
                      background:    active ? "rgba(131,188,169,0.22)" : "transparent",
                      color:         active ? "rgba(131,188,169,0.95)" : "rgba(131,188,169,0.38)",
                    }}
                  >
                    {mode === "categories" ? "Industries" : "Members"}
                  </button>
                );
              })}
            </div>
          )}
          {/* Caption */}
          <div
            className="pointer-events-none"
            style={{
              background:           "rgba(12,27,51,0.62)",
              backdropFilter:       "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border:               "1px solid rgba(131,188,169,0.14)",
              borderRadius:         20, padding: "5px 16px",
            }}
          >
            <p style={{
              margin: 0, fontSize: 10, letterSpacing: "0.13em", fontWeight: 700,
              color: "rgba(131,188,169,0.72)", textTransform: "uppercase", whiteSpace: "nowrap",
            }}>
              {activeCategory
                ? `${activeCategory} · tap to open`
                : globeMode === "members"
                  ? `Members · tap to open`
                  : `Top industries · tap to explore`}
            </p>
          </div>
        </div>

        {/* Zoom controls — 44×44 touch targets with touch-action: manipulation */}
        <div
          className="absolute flex flex-col gap-2 z-10"
          style={{ bottom: isMobile ? 68 : 40, right: 20 }}
        >
          {([
            { label: "+", fn: zoomIn,    title: "Zoom in" },
            { label: "−", fn: zoomOut,   title: "Zoom out" },
            { label: "⊡", fn: zoomReset, title: "Fit to screen" },
          ] as const).map(({ label, fn, title }) => (
            <button
              key={label}
              onClick={fn}
              title={title}
              style={{
                width: 44, height: 44,
                display: "flex", alignItems: "center", justifyContent: "center",
                background:           "rgba(12,27,51,0.78)",
                backdropFilter:       "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border:               "1px solid rgba(131,188,169,0.18)",
                borderRadius:         8,
                color:                "rgba(131,188,169,0.78)",
                fontSize:             label === "⊡" ? 14 : 18,
                cursor:               "pointer",
                fontWeight:           700,
                touchAction:          "manipulation",
              }}
            >
              {label}
            </button>
          ))}
        </div>

      </div>

      {/* ════════════════════════════════════════════════════════════════
          MOBILE: Browse bar + sliding bottom sheet
          ════════════════════════════════════════════════════════════════ */}
      {isMobile && (
        <>
          {/* Always-visible browse bar at bottom of globe */}
          <button
            onClick={() => setSheetOpen(true)}
            className="absolute left-0 right-0 z-10 flex items-center justify-between"
            style={{
              bottom: 0,
              padding: "13px 20px",
              paddingBottom: "max(13px, env(safe-area-inset-bottom))",
              background:           "rgba(12,27,51,0.92)",
              backdropFilter:       "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderTop:            "1px solid rgba(131,188,169,0.16)",
              color:                "rgba(131,188,169,0.85)",
              fontSize:             13,
              fontWeight:           700,
              cursor:               "pointer",
              fontFamily:           "inherit",
              touchAction:          "manipulation",
              border:               "none",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background:  activeCategory ? C.cat : "#00B894",
                boxShadow:   activeCategory
                  ? "0 0 6px rgba(131,188,169,0.6)"
                  : "0 0 8px rgba(0,184,148,0.8)",
              }} />
              {activeCategory
                ? `${activeCategory}`
                : `Members by industry`}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 3, opacity: 0.6, fontSize: 11 }}>
              Browse
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </button>

          {/* Sheet backdrop */}
          {sheetOpen && (
            <div
              className="fixed inset-0 z-40"
              style={{
                background:           "rgba(12,27,51,0.55)",
                backdropFilter:       "blur(2px)",
                WebkitBackdropFilter: "blur(2px)",
              }}
              onClick={() => setSheetOpen(false)}
            />
          )}

          {/* Bottom sheet panel — CSS transform for smooth slide up/down */}
          <div
            className="fixed left-0 right-0 bottom-0 z-50 flex flex-col"
            style={{
              maxHeight:     "70vh",
              background:    "var(--bg-secondary)",
              borderRadius:  "16px 16px 0 0",
              borderTop:     "1px solid var(--border-primary)",
              borderLeft:    "1px solid var(--border-primary)",
              borderRight:   "1px solid var(--border-primary)",
              boxShadow:     "0 -8px 40px rgba(0,0,0,0.22)",
              paddingBottom: "env(safe-area-inset-bottom)",
              transform:     sheetOpen ? "translateY(0)" : "translateY(100%)",
              transition:    "transform 300ms cubic-bezier(0.16,1,0.3,1)",
              pointerEvents: sheetOpen ? "auto" : "none",
            }}
          >
            {/* Drag handle + header */}
            <div style={{
              padding: "10px 18px 12px",
              borderBottom: "1px solid var(--border-primary)",
              flexShrink: 0,
            }}>
              {/* Visual drag handle pill */}
              <div style={{
                width: 32, height: 3, borderRadius: 2,
                background: "var(--border-primary)", margin: "0 auto 12px",
              }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%", background: "#00B894",
                    boxShadow: "0 0 8px rgba(0,184,148,0.8)", flexShrink: 0,
                  }} />
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                    Member Network
                  </h2>
                </div>
                <button
                  onClick={() => setSheetOpen(false)}
                  aria-label="Close"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-tertiary)", padding: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    touchAction: "manipulation",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
            {sidebarContent}
          </div>
        </>
      )}

      {/* Member detail panel */}
      {selectedMember && (
        <MemberModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </div>
  );
}
