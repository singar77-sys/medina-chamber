/**
 * GraphicFrame — scales a fixed-size graphic (1200×630 / 1080×1080 /
 * 1080×1920) to a target display width while preserving the design-
 * intent pixel dimensions inside. Uses CSS transform scale so every
 * inner px value stays faithful to the design file.
 *
 * The surrounding <div> gets width/height in display units (what the
 * layout sees). The inner <div> gets the real canvas dimensions and is
 * scaled down via transform. Everything inside the graphic component
 * can assume it's rendering at full resolution.
 */

import type { ReactNode } from "react";
import { GRAPHIC_DIMS, type GraphicMode } from "./shared";

export function GraphicFrame({
  mode,
  displayWidth,
  className,
  children,
}: {
  mode: GraphicMode;
  displayWidth: number;
  className?: string;
  children: ReactNode;
}) {
  const { w, h } = GRAPHIC_DIMS[mode];
  const scale = displayWidth / w;
  const displayHeight = h * scale;

  return (
    <div
      className={className}
      style={{
        width: displayWidth,
        height: displayHeight,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          width: w,
          height: h,
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
