"use client";

import { useEffect, useRef } from "react";

/**
 * BrandShaderBackground — a subtle, always-flowing WebGL fragment
 * shader used as an ambient background. Designed specifically for the
 * Partners & Sponsors section, but reusable anywhere that wants a
 * brand-tinted "liquid-chrome" wallpaper.
 *
 * What it does:
 *   • Three soft gradient blobs slowly orbit the canvas (2 on a time
 *     curve, 1 tracking the cursor with inertia).
 *   • Color palette shifts with the site's light/dark theme by watching
 *     `data-theme` on <html>. Light → cream + cambridge mint. Dark →
 *     oxford blue + cambridge.
 *   • Mouse-tracked blob picks up a small coquelicot warmth so the
 *     viewer gets a quiet reward for hovering.
 *   • Pauses rendering when offscreen (IntersectionObserver) and when
 *     the tab is hidden. Honors prefers-reduced-motion by rendering a
 *     single static frame.
 *
 * Zero dependencies. Renders a <canvas> absolutely-positioned inside
 * its containing section. The section must be `position: relative` and
 * typically `overflow: hidden`. The canvas is `pointer-events: none`.
 */

interface Props {
  className?: string;
}

const VERT = /* glsl */ `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// Three smooth radial blobs + light value-noise ripple. Mixes four
// brand colors based on the theme uniform (0 = dark, 1 = light).
const FRAG = /* glsl */ `
  precision mediump float;

  uniform vec2  u_resolution;
  uniform vec2  u_mouse;   // normalized, 0..1
  uniform float u_time;    // seconds since mount
  uniform float u_theme;   // 0 dark, 1 light

  // Cheap deterministic hash + value noise for a gentle ripple.
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float aspect = u_resolution.x / u_resolution.y;
    vec2 uvA = uv * vec2(aspect, 1.0);
    vec2 mouseA = vec2(u_mouse.x * aspect, u_mouse.y);

    float t = u_time * 0.12;

    // Two drifting centers, independent lissajous curves.
    vec2 c1 = vec2(
      0.28 * aspect + 0.22 * aspect * sin(t * 0.9 + 1.2),
      0.38 + 0.14 * cos(t * 0.7)
    );
    vec2 c2 = vec2(
      0.78 * aspect + 0.18 * aspect * cos(t * 0.6 + 2.3),
      0.66 + 0.16 * sin(t * 0.8 + 0.5)
    );
    // Third center tracks the mouse (already eased on the JS side).
    vec2 c3 = mouseA;

    float w1 = smoothstep(0.75, 0.0, length(uvA - c1));
    float w2 = smoothstep(0.65, 0.0, length(uvA - c2));
    float w3 = smoothstep(0.38, 0.0, length(uvA - c3));

    // Gentle ripple breaks up the gradient banding.
    float ripple = (noise(uv * 2.6 + t * 0.35) - 0.5) * 0.035;

    // Brand palette (sRGB floats).
    vec3 oxford     = vec3(0.047, 0.106, 0.200);   // #0C1B33
    vec3 cambridge  = vec3(0.514, 0.737, 0.663);   // #83BCA9
    vec3 coquelicot = vec3(1.000, 0.251, 0.000);   // #FF4000
    vec3 cream      = vec3(0.976, 0.957, 0.925);   // warm paper

    // Dark base = near-black oxford, light base = near-cream with a
    // breath of cambridge so it isn't flat white.
    vec3 baseDark  = oxford * 0.85;
    vec3 baseLight = mix(cream, cambridge, 0.04);
    vec3 base = mix(baseDark, baseLight, u_theme);

    // Primary wash, cambridge-weighted in both themes, but a touch
    // more saturated on dark to keep the glow readable.
    vec3 wash = mix(
      mix(oxford, cambridge, 0.55),
      mix(cream,  cambridge, 0.35),
      u_theme
    );

    // Secondary wash, a cooler blue-ish sibling for depth.
    vec3 wash2 = mix(
      mix(oxford, cambridge, 0.25) + vec3(0.00, 0.03, 0.08),
      mix(cream,  cambridge, 0.15) + vec3(0.02, 0.04, 0.08),
      u_theme
    );

    // Mouse blob, tiny kiss of coquelicot, stays subtle.
    vec3 spark = mix(
      mix(oxford, coquelicot, 0.55),
      mix(cream,  coquelicot, 0.35),
      u_theme
    );

    vec3 color = base;
    color = mix(color, wash,  w1 * 0.55);
    color = mix(color, wash2, w2 * 0.45);
    color = mix(color, spark, w3 * 0.30);
    color += ripple;

    gl_FragColor = vec4(color, 1.0);
  }
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function linkProgram(gl: WebGLRenderingContext) {
  const v = compile(gl, gl.VERTEX_SHADER, VERT);
  const f = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!v || !f) return null;
  const p = gl.createProgram();
  if (!p) return null;
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    gl.deleteProgram(p);
    return null;
  }
  return p;
}

export function BrandShaderBackground({ className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
    }) as WebGLRenderingContext | null;
    if (!gl) return;

    const program = linkProgram(gl);
    if (!program) return;
    gl.useProgram(program);

    // Single full-screen triangle (more efficient than a quad).
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_resolution");
    const uMouse = gl.getUniformLocation(program, "u_mouse");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uTheme = gl.getUniformLocation(program, "u_theme");

    // Mouse state — eased toward target each frame.
    let mouseTX = 0.5;
    let mouseTY = 0.5;
    let mouseCX = 0.5;
    let mouseCY = 0.5;

    // Theme state — eased so swapping light/dark doesn't snap.
    const readTheme = () =>
      document.documentElement.getAttribute("data-theme") === "dark" ? 0 : 1;
    let themeTarget = readTheme();
    let themeCurrent = themeTarget;

    // Reduced-motion check — render one static frame and stop.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(2, Math.floor(rect.width * dpr));
      const h = Math.max(2, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseTX = (e.clientX - rect.left) / rect.width;
      mouseTY = 1.0 - (e.clientY - rect.top) / rect.height; // GL origin bottom-left
    };
    // Track pointer at the window level so the reactive blob follows
    // even when the cursor is hovering the tiles on top of us.
    window.addEventListener("pointermove", onMove, { passive: true });

    // Pause rendering when the section scrolls offscreen.
    let inView = true;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) inView = e.isIntersecting;
      },
      { rootMargin: "64px" },
    );
    io.observe(canvas);

    const onVisibility = () => {
      // No manual wake needed; the RAF loop checks document.hidden.
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Watch for theme swaps — the chamber site toggles the attribute
    // on <html>, and we want the shader to follow without a reload.
    const themeObserver = new MutationObserver(() => {
      themeTarget = readTheme();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      if (!document.hidden && inView) {
        resize();

        // Ease mouse + theme.
        mouseCX += (mouseTX - mouseCX) * 0.06;
        mouseCY += (mouseTY - mouseCY) * 0.06;
        themeCurrent += (themeTarget - themeCurrent) * 0.08;

        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform2f(uMouse, mouseCX, mouseCY);
        gl.uniform1f(uTime, (now - start) / 1000);
        gl.uniform1f(uTheme, themeCurrent);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      if (!reduce) raf = requestAnimationFrame(tick);
    };

    // Render one frame immediately so there's no flash of empty canvas.
    resize();
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform2f(uMouse, 0.5, 0.5);
    gl.uniform1f(uTime, 0);
    gl.uniform1f(uTheme, themeCurrent);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!reduce) raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      themeObserver.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
    />
  );
}
