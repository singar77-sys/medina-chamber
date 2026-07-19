"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { GRAPHIC_DIMS, type GraphicMode } from "./shared";

/**
 * Responsive graphic scaler. Fills its container's width,
 * maintains the graphic's design aspect ratio, and CSS-transform-scales
 * the fixed-px interior to match. Use this when the graphic needs to
 * live inside a responsive card / grid cell whose width isn't known at
 * build time.
 *
 * Client-only because it uses ResizeObserver + useLayoutEffect to
 * measure and update. The graphic children it wraps can still be
 * server-rendered; only the frame is client.
 */
export function FluidGraphicFrame({
  mode,
  children,
  className,
}: {
  mode: GraphicMode;
  children: ReactNode;
  className?: string;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const { w: designW, h: designH } = GRAPHIC_DIMS[mode];

  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => {
      const cw = el.offsetWidth;
      if (cw > 0) setScale(cw / designW);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [designW]);

  return (
    <div
      ref={outerRef}
      className={className}
      style={{
        width: "100%",
        aspectRatio: `${designW} / ${designH}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: designW,
          height: designH,
          position: "absolute",
          top: 0,
          left: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
