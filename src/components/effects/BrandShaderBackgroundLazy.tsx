"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

/**
 * BrandShaderBackgroundLazy — client gate + lazy loader for the WebGL
 * liquid-chrome backdrop. Lets MemberVoice (a Server Component) drop the
 * shader in without pulling its WebGL code into the server/critical path.
 *
 * The shader is decorative only, so we skip it entirely — no chunk fetch,
 * no <canvas> — when it isn't worth the GPU/JS cost:
 *   • Mobile viewports (< 768px): phones pay the most for a full-screen
 *     animated shader and benefit the least from a background flourish.
 *   • prefers-reduced-motion: reduce: respect the user's motion setting.
 *
 * On qualifying viewports it lazy-loads the shader (ssr: false — it's
 * WebGL, no server render) after mount. Re-evaluates on resize/motion
 * changes so a desktop→mobile resize (or DevTools toggle) tears it down.
 */

const BrandShaderBackground = dynamic(
  () =>
    import("@/components/effects/BrandShaderBackground").then(
      (m) => m.BrandShaderBackground,
    ),
  { ssr: false },
);

const MOBILE_MAX = "(max-width: 767px)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

interface Props {
  className?: string;
}

export function BrandShaderBackgroundLazy({ className }: Props) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia(MOBILE_MAX);
    const reduce = window.matchMedia(REDUCED_MOTION);

    const evaluate = () => setEnabled(!mobile.matches && !reduce.matches);
    evaluate();

    mobile.addEventListener("change", evaluate);
    reduce.addEventListener("change", evaluate);
    return () => {
      mobile.removeEventListener("change", evaluate);
      reduce.removeEventListener("change", evaluate);
    };
  }, []);

  if (!enabled) return null;
  return <BrandShaderBackground className={className} />;
}
