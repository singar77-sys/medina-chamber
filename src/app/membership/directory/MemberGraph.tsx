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
const BOUNDARY_R = 230;
const TOP_N      = 35;   // categories shown in industry constellation
const CHAMBER_ID = "__chamber__"; // synthetic chamber hub node
const CI_R       = 112;  // inner ring radius for Community Investors
const VP_R       = 182;  // outer ring radius for Visibility Plus

// ── Boundary force — prevents nodes from leaving the circle ───────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function forceRadialBoundary(radius: number, strength = 0.12) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let nodes: any[];
  function force(alpha: number) {
    nodes.forEach((n) => {
      const x = n.x ?? 0, y = n.y ?? 0;
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

// ── Radial-attract force — pulls matching nodes toward a target orbit ──────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function forceRadialAttract(targetR: number, filter: (n: any) => boolean, strength = 0.4) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let nodes: any[];
  function force(alpha: number) {
    nodes.forEach((n) => {
      if (!filter(n)) return;
      const x = n.x ?? 0, y = n.y ?? 0;
      const d = Math.sqrt(x * x + y * y) || 0.001;
      const f = (d - targetR) * strength * alpha / d;
      n.vx = (n.vx ?? 0) - x * f;
      n.vy = (n.vy ?? 0) - y * f;
    });
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
  ctx.font = `${bold ? "700 " : ""}${fontSize}px system-ui,-apple-system,sans-serif`;
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

// ── Static tab definitions (hoisted to avoid `as const` inside JSX) ───────
const GLOBE_TABS = [
  { mode: "eye"        as const, label: "Members"    },
  { mode: "industries" as const, label: "Industries" },
];

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
  const mouseInCircleRef = useRef(false);
  const engineStoppedRef = useRef(false);

  // Refs read inside canvas callbacks to avoid stale closures
  const activeCatRef   = useRef<string | null>(null);
  const hoveredIdRef   = useRef<string | null>(null);
  const sidebarHovRef  = useRef<string | null>(null);
  const globeModeRef   = useRef<"eye" | "industries">("eye");

  const [dimensions,     setDimensions]     = useState({ width: 800, height: 700 });
  const [selectedMember, setSelectedMember] = useState<GraphNode | null>(null);
  const [hoveredId,      setHoveredId]      = useState<string | null>(null);
  const [sidebarHovId,   setSidebarHovId]   = useState<string | null>(null);
  const [search,         setSearch]         = useState("");
  const [globeMode,      setGlobeMode]      = useState<"eye" | "industries">("eye");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [mouseInCircle,  setMouseInCircle]  = useState(false);

  // Keep refs in sync
  activeCatRef.current  = activeCategory;
  hoveredIdRef.current  = hoveredId;
  sidebarHovRef.current = sidebarHovId;
  globeModeRef.current  = globeMode;

  // ── All source data ────────────────────────────────────────────────────
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

  // ── Eye-mode member lists ──────────────────────────────────────────────
  const eyeCIAll = useMemo(
    () => allGraphData.nodes
      .filter((n) => n.type === "member" && n.tier === "ci")
      .sort((a, b) => a.name.localeCompare(b.name)),
    [allGraphData],
  );
  const eyeVPAll = useMemo(
    () => allGraphData.nodes
      .filter((n) => n.type === "member" && n.tier === "vp")
      .sort((a, b) => a.name.localeCompare(b.name)),
    [allGraphData],
  );
  const eyeCIFiltered = useMemo(
    () => eyeCIAll.filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase())),
    [eyeCIAll, search],
  );
  const eyeVPFiltered = useMemo(
    () => eyeVPAll.filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase())),
    [eyeVPAll, search],
  );

  // ── Industry-mode derived data ─────────────────────────────────────────
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

  const visibleFocusMembers = useMemo(
    () => focusMembers.filter(
      (m) => !search || m.name.toLowerCase().includes(search.toLowerCase()),
    ),
    [focusMembers, search],
  );

  // ── Graph data fed to ForceGraph2D ─────────────────────────────────────
  const graphData = useMemo<{ nodes: GraphNode[]; links: GraphLink[] }>(() => {

    // ── Eye mode: chamber hub + CI ring + VP ring ──────────────────────
    if (globeMode === "eye") {
      const chamberNode: GraphNode = {
        id:   CHAMBER_ID,
        name: "Medina Chamber",
        type: "category",   // reuse type; paintNode checks id first
        fx:   0, fy: 0, x: 0, y: 0,
      };
      const ciNodes = allGraphData.nodes.filter((n) => n.type === "member" && n.tier === "ci");
      const vpNodes = allGraphData.nodes.filter((n) => n.type === "member" && n.tier === "vp");
      const memberNodes = [...ciNodes, ...vpNodes];
      return {
        nodes: [chamberNode, ...memberNodes],
        links: memberNodes.map((n) => ({ source: CHAMBER_ID, target: n.id })),
      };
    }

    // ── Industries overview: top N category constellation ─────────────
    if (!activeCategory) {
      return {
        nodes: allGraphData.nodes.filter(
          (n) => n.type === "category" && topCatSet.has(n.name),
        ),
        links: [],
      };
    }

    // ── Focus: pinned category hub + its members ───────────────────────
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
  }, [globeMode, activeCategory, allGraphData, topCatSet]);

  // ── Page background for canvas mask ───────────────────────────────────
  useEffect(() => {
    bgColorRef.current =
      getComputedStyle(document.documentElement).getPropertyValue("--bg-primary").trim() ||
      "#ffffff";
  }, []);

  // ── Responsive sizing ──────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setDimensions({ width: e.contentRect.width, height: e.contentRect.height }),
    );
    ro.observe(el);
    setDimensions({ width: el.offsetWidth, height: el.offsetHeight });
    return () => ro.disconnect();
  }, []);

  // ── D3 force reconfiguration — fires whenever graphData changes ────────
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    if (globeModeRef.current === "eye") {
      // Pupil mode: concentric ring forces
      fg.d3Force("charge")?.strength(
        (n: GraphNode) => n.id === CHAMBER_ID ? 0 : n.tier === "ci" ? -70 : -50,
      );
      fg.d3Force("link")?.strength(0); // links are visual only; radial forces do positioning
      fg.d3Force("radial-ci", forceRadialAttract(CI_R, (n: GraphNode) => n.tier === "ci", 0.55));
      fg.d3Force("radial-vp", forceRadialAttract(VP_R, (n: GraphNode) => n.tier === "vp", 0.45));
      fg.d3Force("boundary",  forceRadialBoundary(BOUNDARY_R, 0.12));
    } else {
      // Remove eye-specific forces when leaving pupil mode
      fg.d3Force("radial-ci", null);
      fg.d3Force("radial-vp", null);

      if (activeCatRef.current) {
        // Focus: hub-and-spoke
        fg.d3Force("charge")?.strength((n: GraphNode) => n.type === "category" ? 0 : -140);
        fg.d3Force("link")?.distance(85).strength(0.55);
        fg.d3Force("boundary", forceRadialBoundary(BOUNDARY_R, 0.18));
      } else {
        // Constellation: pure repulsion
        fg.d3Force("charge")?.strength(-320);
        fg.d3Force("link")?.strength(0);
        fg.d3Force("boundary", forceRadialBoundary(BOUNDARY_R, 0.10));
      }
    }

    engineStoppedRef.current = false;
    fg.d3ReheatSimulation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData]);

  // ── Engine settled → zoom to fit ──────────────────────────────────────
  const handleEngineStop = useCallback(() => {
    if (!engineStoppedRef.current) {
      engineStoppedRef.current = true;
      const pad = activeCatRef.current ? 50
               : globeModeRef.current === "eye" ? 28
               : 24;
      fgRef.current?.zoomToFit(700, pad);
    }
  }, []);

  // ── Zoom controls ──────────────────────────────────────────────────────
  const handleZoom    = useCallback(({ k }: { k: number }) => { zoomRef.current = k; }, []);
  const zoomIn        = useCallback(() => fgRef.current?.zoom(zoomRef.current * 1.5, 300), []);
  const zoomOut       = useCallback(() => fgRef.current?.zoom(zoomRef.current / 1.5, 300), []);
  const zoomReset     = useCallback(() => fgRef.current?.zoomToFit(500, 40), []);

  // ── Pre-frame: dark atmosphere + pulsing globe ring ────────────────────
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

    const r    = BOUNDARY_R;
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

    // Eye mode: faint orbit rings to hint at the CI / VP radii
    if (globeModeRef.current === "eye") {
      [CI_R, VP_R].forEach((orbit) => {
        ctx.beginPath(); ctx.arc(0, 0, orbit, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(131,188,169,${(0.04 + pulse * 0.025).toFixed(3)})`;
        ctx.lineWidth   = 0.4;
        ctx.setLineDash([3, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }
  }, []);

  // ── Post-frame: paint page-bg over corners → circle mask ──────────────
  const handleRenderFramePost = useCallback((ctx: CanvasRenderingContext2D) => {
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const cr = Math.min(cw, ch) / 2 - 2;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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
    ctx.restore();
  }, []);

  // ── Node canvas renderer ───────────────────────────────────────────────
  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x   = node.x ?? 0;
      const y   = node.y ?? 0;
      const t   = (Date.now() - startTimeRef.current) / 1000;
      const isHov      = node.id === hoveredIdRef.current || node.id === sidebarHovRef.current;
      const isEyeMode  = globeModeRef.current === "eye";
      const isFocusMode = !!activeCatRef.current;

      // ════════════════════════════════════════════════════════════════
      // CHAMBER NODE — the pupil at the centre of the eye
      // ════════════════════════════════════════════════════════════════
      if (node.id === CHAMBER_ID) {
        const r     = 18;
        const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.35);

        // Three concentric iris rings — expanding outward like a heartbeat
        const rings = [
          { mult: 2.0, speed: 0.30, baseAlpha: 0.22 },
          { mult: 3.0, speed: 0.24, baseAlpha: 0.13 },
          { mult: 4.2, speed: 0.18, baseAlpha: 0.07 },
        ];
        rings.forEach(({ mult, speed, baseAlpha }) => {
          const p = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * speed);
          ctx.beginPath(); ctx.arc(x, y, r * mult, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(131,188,169,${(baseAlpha * p).toFixed(3)})`;
          ctx.lineWidth   = 0.7;
          ctx.stroke();
        });

        // Dark core gradient — deep navy like the pupil of an eye
        const core = ctx.createRadialGradient(x, y, 0, x, y, r);
        core.addColorStop(0,   "#1A3356");
        core.addColorStop(0.5, "#0E2040");
        core.addColorStop(1,   "#0C1B33");
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = core; ctx.fill();

        // Pulsing cambridge ring — the limbus of the eye
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(131,188,169,${(0.55 + pulse * 0.38).toFixed(3)})`;
        ctx.lineWidth   = 2.2;
        ctx.stroke();

        // Inner teal pupil glow
        const pupil = ctx.createRadialGradient(x, y, 0, x, y, r * 0.52);
        pupil.addColorStop(0, `rgba(131,188,169,${(0.50 + pulse * 0.28).toFixed(3)})`);
        pupil.addColorStop(1, "rgba(131,188,169,0)");
        ctx.beginPath(); ctx.arc(x, y, r * 0.52, 0, Math.PI * 2);
        ctx.fillStyle = pupil; ctx.fill();

        // Label — always visible
        const fs = Math.max(11 / globalScale, 1.4);
        drawLabelPill(ctx, "Medina Chamber", x, y + r + 5 / globalScale, fs,
          0.93, "rgba(255,255,255,0.96)", true);
        return;
      }

      // ════════════════════════════════════════════════════════════════
      // CATEGORY NODE — industry hub (industries mode only)
      // ════════════════════════════════════════════════════════════════
      if (node.type === "category") {
        const count      = catCounts.get(node.name) ?? 0;
        const isFocusHub = isFocusMode && activeCatRef.current === node.name;

        if (isFocusHub) {
          const r     = 15;
          const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.22);
          const neb   = ctx.createRadialGradient(x, y, r, x, y, r * 5);
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
          drawLabelPill(ctx, `${count} members`, x, y + r + (fs * 1.65 + 7) / globalScale,
            subFs, 0.70, `rgba(${C.catRgb},0.85)`);
          return;
        }

        // Constellation node (overview)
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

        const er = isHov ? r * 1.28 : r;
        ctx.beginPath(); ctx.arc(x, y, er, 0, Math.PI * 2);
        ctx.fillStyle = isHov ? C.ci : `rgba(${C.catRgb},0.88)`; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, er * 0.30, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.88)"; ctx.fill();

        const fs  = Math.max(10 / globalScale, 1.2);
        const lbl = node.name.length > 21 ? node.name.slice(0, 19) + "…" : node.name;
        drawLabelPill(ctx, lbl, x, y + er + 3.5 / globalScale, fs,
          isHov ? 0.92 : 0.74,
          isHov ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.82)", isHov);

        if (count > 0 && (globalScale > 0.6 || isHov)) {
          const cfs = Math.max(8.5 / globalScale, 1.0);
          drawLabelPill(ctx, `${count}`, x, y + er + (fs * 1.65 + 4) / globalScale,
            cfs, 0.60, `rgba(${C.catRgb},0.72)`);
        }
        return;
      }

      // ════════════════════════════════════════════════════════════════
      // MEMBER NODE — appears in both eye mode and focus mode
      // Eye mode:   small, compact — labels on hover only (many nodes)
      // Focus mode: full size — labels always visible (boomer-friendly)
      // ════════════════════════════════════════════════════════════════
      const baseR = isEyeMode
        ? (node.tier === "ci" ? 5 : 4)              // eye: compact orbit dots
        : (node.tier === "ci" ? 8.5 : node.tier === "vp" ? 6.5 : 5); // focus: full
      const r   = isHov ? baseR * 1.65 : baseR;
      const rgb = node.tier === "ci" ? C.ciRgb : node.tier === "vp" ? C.vpRgb : C.ciRgb;
      const col = node.tier === "ci" ? C.ci    : node.tier === "vp" ? C.vp    : C.standard;

      // Aura — full glow in focus mode; lightweight in eye mode
      if (!isEyeMode && (node.tier === "ci" || isHov)) {
        const phase = (node.x ?? 0) * 0.20 + (node.y ?? 0) * 0.13;
        const pulse = 0.38 + 0.28 * Math.sin(t * 1.9 + phase);
        const auraR = isHov ? r * 6.5 : r * 5;
        const grd   = ctx.createRadialGradient(x, y, r * 0.5, x, y, auraR);
        grd.addColorStop(0, `rgba(${rgb},${(pulse * (isHov ? 0.68 : 0.50)).toFixed(3)})`);
        grd.addColorStop(0.55, `rgba(${rgb},${(pulse * 0.10).toFixed(3)})`);
        grd.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(x, y, auraR, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
      } else if (!isEyeMode && node.tier === "vp") {
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5);
        grd.addColorStop(0, `rgba(${rgb},0.28)`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
      } else if (isEyeMode && isHov) {
        // Eye mode hover: a focused burst — not repeated 100+ times
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
        grd.addColorStop(0, `rgba(${rgb},0.55)`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(x, y, r * 5, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
      }

      // Core dot
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();

      // Subtle ring (focus mode CI, or any hover)
      if (!isEyeMode && (isHov || node.tier === "ci")) {
        ctx.beginPath(); ctx.arc(x, y, r + 1.8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb},${isHov ? 0.88 : 0.42})`;
        ctx.lineWidth   = 0.9; ctx.stroke();
      }
      if (isEyeMode && isHov) {
        ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb},0.80)`;
        ctx.lineWidth   = 0.8; ctx.stroke();
      }

      // Label:
      //   Focus mode → always visible (boomer UX: no zoom required)
      //   Eye mode   → hover only (too many nodes for simultaneous labels)
      if (!isEyeMode || isHov) {
        const fs   = Math.max(10.5 / globalScale, 1.4);
        const lbl  = node.name.length > 24 ? node.name.slice(0, 22) + "…" : node.name;
        const tcol = node.tier === "ci" ? `rgba(${C.ciRgb},0.96)`
                   : node.tier === "vp" ? `rgba(${C.vpRgb},0.96)`
                   : "rgba(255,255,255,0.83)";
        drawLabelPill(ctx, lbl, x, y + r + 2.5 / globalScale, fs,
          isHov ? 0.92 : 0.80, tcol, node.tier === "ci");
      }
    },
    [catCounts],
  );

  // ── Link colour — faint spokes in eye mode, standard in others ─────────
  const getLinkColor = useCallback(
    () => globeModeRef.current === "eye" ? "rgba(131,188,169,0.07)" : C.link,
    [],
  );

  // ── Node value (D3 collision radius proxy) ─────────────────────────────
  const getNodeVal = useCallback(
    (node: GraphNode) => {
      if (node.id === CHAMBER_ID) return 350;
      if (node.type === "category") {
        const count = catCounts.get(node.name) ?? 0;
        return activeCategory ? 220 : Math.max(12, 5 + count * 0.35);
      }
      if (globeMode === "eye") return node.tier === "ci" ? 7 : 5;
      if (node.tier === "ci") return 16;
      if (node.tier === "vp") return 10;
      return 6;
    },
    [catCounts, activeCategory, globeMode],
  );

  // ── Mode switching ─────────────────────────────────────────────────────
  const switchGlobeMode = useCallback((mode: "eye" | "industries") => {
    setGlobeMode(mode);
    setActiveCategory(null);
    setSearch("");
    engineStoppedRef.current = false;
  }, []);

  // ── Interactions ───────────────────────────────────────────────────────
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.id === CHAMBER_ID) return; // chamber is the source, not a destination
    if (node.type === "category") {
      setActiveCategory((prev) => (prev === node.name ? null : node.name));
      setSearch("");
      engineStoppedRef.current = false;
    } else if (node.type === "member") {
      setSelectedMember(node);
    }
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredId(node?.id ?? null);
    const canvas = containerRef.current?.querySelector("canvas") as HTMLElement | null;
    if (canvas) canvas.style.cursor = node && node.id !== CHAMBER_ID ? "pointer" : "default";
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect   = e.currentTarget.getBoundingClientRect();
    const dx     = e.clientX - rect.left  - rect.width  / 2;
    const dy     = e.clientY - rect.top   - rect.height / 2;
    const cr     = Math.min(rect.width, rect.height) / 2 - 2;
    const inside = Math.sqrt(dx * dx + dy * dy) < cr;
    if (inside !== mouseInCircleRef.current) {
      mouseInCircleRef.current = inside;
      setMouseInCircle(inside);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseInCircleRef.current = false;
    setMouseInCircle(false);
  }, []);

  const focusCategory = useCallback((cat: string) => {
    setActiveCategory(cat);
    setSearch("");
    engineStoppedRef.current = false;
  }, []);

  const clearFocus = useCallback(() => {
    setActiveCategory(null);
    setSearch("");
    engineStoppedRef.current = false;
  }, []);

  // ── Tier dot colour for sidebar ────────────────────────────────────────
  function tierDot(tier: string | undefined) {
    if (tier === "ci") return C.ci;
    if (tier === "vp") return C.vp;
    return "rgba(131,188,169,0.5)";
  }

  // ── Shared member-row renderer (used in eye mode + focus mode) ─────────
  function MemberRow({ node }: { node: GraphNode }) {
    const isHov = node.id === sidebarHovId;
    const dot   = tierDot(node.tier);
    const rgb   = node.tier === "ci" ? C.ciRgb : C.vpRgb;
    return (
      <button
        onClick={() => setSelectedMember(node)}
        onMouseEnter={() => setSidebarHovId(node.id)}
        onMouseLeave={() => setSidebarHovId(null)}
        style={{
          width: "100%", padding: "7px 16px",
          display: "flex", alignItems: "center", gap: 9,
          background: isHov ? "var(--bg-tertiary)" : "transparent",
          border: "none", cursor: "pointer", textAlign: "left",
          fontFamily: "inherit", transition: "background 120ms ease",
        }}
      >
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: dot, flexShrink: 0,
          boxShadow: node.tier !== "standard"
            ? `0 0 ${isHov ? 7 : 4}px rgba(${rgb},${isHov ? 0.75 : 0.40})`
            : undefined,
          transition: "box-shadow 120ms",
        }} />
        <span style={{
          flex: 1, fontSize: 12.5, color: "var(--text-primary)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {node.name}
        </span>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none"
          style={{ flexShrink: 0, opacity: isHov ? 0.5 : 0, transition: "opacity 120ms" }}>
          <path d="M3.5 2L7.5 5.5L3.5 9" stroke="var(--text-primary)"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    );
  }

  // ── Compute globe caption ──────────────────────────────────────────────
  const globeCaption =
    globeMode === "eye"
      ? `${eyeCIAll.length} Community Investors · ${eyeVPAll.length} Visibility Plus · click any to open`
      : activeCategory
        ? `${activeCategory} · ${focusMembers.length} members · click to open`
        : `Top ${Math.min(TOP_N, sortedCategories.length)} industries · click to explore`;

  // ── Search placeholder ─────────────────────────────────────────────────
  const searchPlaceholder =
    globeMode === "eye" ? "Search top members…"
    : activeCategory    ? "Search members…"
    :                     "Search industries…";

  return (
    <div
      className="flex select-none overflow-hidden rounded-2xl border border-border-primary"
      style={{
        height:    "86vh",
        minHeight: 560,
        boxShadow: "0 4px 40px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.8) inset",
      }}
    >
      {/* ════════════════════════════════════════════════════════════════
          SIDEBAR
          ════════════════════════════════════════════════════════════════ */}
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
              width: 7, height: 7, borderRadius: "50%",
              background: "#00B894",
              boxShadow:  "0 0 8px rgba(0,184,148,0.8)",
              flexShrink: 0,
            }} />
            <h2 style={{
              margin: 0, fontSize: 14, fontWeight: 700,
              color: "var(--text-primary)", letterSpacing: "-0.01em",
            }}>
              Member Network
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-tertiary)" }}>
            {members.length} members · {sortedCategories.length} industries
          </p>
        </div>

        {/* View tabs — Members (eye) / Industries */}
        <div style={{
          display: "flex", padding: "9px 12px", gap: 5,
          borderBottom: "1px solid var(--border-primary)",
          flexShrink: 0,
        }}>
          {GLOBE_TABS.map(({ mode, label }) => {
            const active = globeMode === mode;
            return (
              <button
                key={mode}
                onClick={() => switchGlobeMode(mode)}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 7,
                  background: active ? "var(--bg-primary)"  : "transparent",
                  border:     active ? "1px solid var(--border-primary)" : "1px solid transparent",
                  color:      active ? "var(--text-primary)" : "var(--text-tertiary)",
                  fontSize: 12, fontWeight: active ? 700 : 500,
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: active ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                  transition: "all 150ms ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ padding: "10px 14px 9px", flexShrink: 0 }}>
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
              placeholder={searchPlaceholder}
              style={{
                paddingLeft: 32, paddingRight: 10, paddingTop: 8, paddingBottom: 8,
                width: "100%", boxSizing: "border-box",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-primary)", borderRadius: 8,
                color: "var(--text-primary)", fontSize: 13, outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {/* Mode bar (industries / focus mode only) */}
        {globeMode === "industries" && (
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
                    padding: 0, fontFamily: "inherit",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M8 2.5L3.5 6.5L8 10.5" stroke="currentColor"
                      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  All industries
                </button>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  {focusMembers.length} members
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
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  {filteredCategories.length}
                </span>
              </>
            )}
          </div>
        )}

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: "auto", paddingTop: 4, paddingBottom: 4 }}>

          {/* ── EYE MODE: CI section + VP section ── */}
          {globeMode === "eye" && (
            <>
              {/* Community Investors */}
              {eyeCIFiltered.length > 0 && (
                <div style={{ padding: "8px 16px 5px" }}>
                  <span style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: C.ci,
                  }}>
                    <span style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: C.ci,
                      boxShadow: `0 0 5px rgba(${C.ciRgb},0.7)`,
                      flexShrink: 0,
                    }} />
                    Community Investors · {eyeCIFiltered.length}
                  </span>
                </div>
              )}
              {eyeCIFiltered.map((m) => <MemberRow key={m.id} node={m} />)}

              {/* Visibility Plus */}
              {eyeVPFiltered.length > 0 && (
                <div style={{ padding: `${eyeCIFiltered.length > 0 ? 14 : 8}px 16px 5px` }}>
                  <span style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: C.vp,
                  }}>
                    <span style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: C.vp,
                      boxShadow: `0 0 5px rgba(${C.vpRgb},0.6)`,
                      flexShrink: 0,
                    }} />
                    Visibility Plus · {eyeVPFiltered.length}
                  </span>
                </div>
              )}
              {eyeVPFiltered.map((m) => <MemberRow key={m.id} node={m} />)}

              {eyeCIFiltered.length === 0 && eyeVPFiltered.length === 0 && (
                <p style={{
                  padding: "20px 18px", fontSize: 12,
                  color: "var(--text-tertiary)", textAlign: "center",
                }}>
                  No members match
                </p>
              )}
            </>
          )}

          {/* ── INDUSTRIES FOCUS MODE: member list ── */}
          {globeMode === "industries" && activeCategory && (
            <>
              <div style={{
                margin: "6px 12px 6px", padding: "9px 12px", borderRadius: 8,
                background: "rgba(131,188,169,0.09)",
                border: "1px solid rgba(131,188,169,0.22)",
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
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMember(m)}
                    onMouseEnter={() => setSidebarHovId(m.id)}
                    onMouseLeave={() => setSidebarHovId(null)}
                    style={{
                      width: "100%", padding: "8px 16px",
                      display: "flex", alignItems: "center", gap: 10,
                      background: isHov ? "var(--bg-tertiary)" : "transparent",
                      border: "none", cursor: "pointer", textAlign: "left",
                      fontFamily: "inherit", transition: "background 120ms ease",
                    }}
                  >
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: tierDot(m.tier), flexShrink: 0,
                      boxShadow: m.tier !== "standard"
                        ? `0 0 5px ${tierDot(m.tier)}` : undefined,
                    }} />
                    <span style={{
                      flex: 1, fontSize: 13, color: "var(--text-primary)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {m.name}
                    </span>
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none"
                      style={{ flexShrink: 0, opacity: isHov ? 0.5 : 0, transition: "opacity 120ms" }}>
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
          )}

          {/* ── INDUSTRIES OVERVIEW: category list ── */}
          {globeMode === "industries" && !activeCategory && filteredCategories.map((cat) => {
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
                  width: "100%", padding: "7px 16px",
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: 8,
                  background: isHov ? "var(--bg-tertiary)" : "transparent",
                  border: "none", cursor: "pointer", textAlign: "left",
                  fontFamily: "inherit", transition: "background 120ms ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: inGlobe ? C.cat : "var(--border-primary)",
                    flexShrink: 0,
                    boxShadow: inGlobe && isHov ? "0 0 6px rgba(131,188,169,0.55)" : undefined,
                    transition: "box-shadow 120ms",
                  }} />
                  <span style={{
                    fontSize: 13, color: "var(--text-primary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {cat}
                  </span>
                </div>
                <span style={{
                  fontSize: 11,
                  color: isHov ? C.cat : "var(--text-tertiary)",
                  fontVariantNumeric: "tabular-nums",
                  flexShrink: 0, transition: "color 120ms",
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{
          padding: "11px 16px",
          borderTop: "1px solid var(--border-primary)",
          flexShrink: 0,
        }}>
          <p style={{
            margin: "0 0 7px", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.12em", color: "var(--text-tertiary)",
            textTransform: "uppercase",
          }}>
            Membership tier
          </p>
          {([
            { color: C.ci,  glow: C.ciRgb, label: "Community Investor" },
            { color: C.vp,  glow: C.vpRgb, label: "Visibility Plus" },
            { color: "rgba(131,188,169,0.5)", glow: null, label: "Member" },
          ] as const).map(({ color, glow, label }) => (
            <span key={label} style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 11, color: "var(--text-secondary)", marginBottom: 5,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: color, flexShrink: 0,
                boxShadow: glow ? `0 0 5px rgba(${glow},0.6)` : undefined,
              }} />
              {label}
            </span>
          ))}
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════
          GLOBE
          ════════════════════════════════════════════════════════════════ */}
      <div
        className="relative flex-1 overflow-hidden"
        style={{ background: "var(--bg-primary)" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
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
            linkWidth={globeMode === "eye" ? 0.3 : 0.45}
            linkOpacity={globeMode === "eye" ? 0.6 : 0.85}
            backgroundColor="rgba(0,0,0,0)"
            width={dimensions.width}
            height={dimensions.height}
            warmupTicks={90}
            cooldownTicks={160}
            cooldownTime={7000}
            d3AlphaDecay={0.038}
            d3VelocityDecay={0.44}
            minZoom={0.14}
            maxZoom={14}
            enableZoomInteraction={mouseInCircle}
            enablePanInteraction={true}
          />
        </div>

        {/* Globe caption */}
        <div className="absolute top-5 left-0 right-0 flex justify-center pointer-events-none z-10">
          <div style={{
            background:           "rgba(12,27,51,0.62)",
            backdropFilter:       "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border:               "1px solid rgba(131,188,169,0.14)",
            borderRadius:         20, padding: "5px 16px",
          }}>
            <p style={{
              margin: 0, fontSize: 10, letterSpacing: "0.13em", fontWeight: 700,
              color: "rgba(131,188,169,0.72)", textTransform: "uppercase", whiteSpace: "nowrap",
            }}>
              {globeCaption}
            </p>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-10 right-5 flex flex-col gap-2 z-10">
          {([
            { label: "+", fn: zoomIn,    title: "Zoom in" },
            { label: "−", fn: zoomOut,   title: "Zoom out" },
            { label: "⊡", fn: zoomReset, title: "Fit to screen" },
          ] as const).map(({ label, fn, title }) => (
            <button key={label} onClick={fn} title={title} style={{
              width: 34, height: 34,
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
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <p style={{
            margin: 0, fontSize: 9.5, letterSpacing: "0.1em", fontWeight: 600,
            color: "rgba(131,188,169,0.22)", textTransform: "uppercase", whiteSpace: "nowrap",
          }}>
            Scroll inside globe to zoom · drag to pan · click to open
          </p>
        </div>
      </div>

      {selectedMember && (
        <MemberModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </div>
  );
}
