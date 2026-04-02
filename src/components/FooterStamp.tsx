"use client";

import Image from "next/image";
import { useTheme } from "./ThemeProvider";

/**
 * Tiny client wrapper — only exists so the Footer itself
 * can be a server component (zero JS for 22 links + contact info).
 */
export function FooterStamp() {
  const { theme } = useTheme();

  const src =
    theme === "dark"
      ? "/images/logos/stamp-white.png"
      : "/images/logos/stamp-blue.png";

  return (
    <Image
      src={src}
      alt="Medina Chamber seal"
      width={80}
      height={80}
      className="mb-4 opacity-80"
    />
  );
}
