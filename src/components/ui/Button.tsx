import Link from "next/link";
import type { LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center font-bold whitespace-nowrap " +
  "rounded-[var(--radius-md)] transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent hover:bg-accent-hover text-white",
  secondary: "bg-bg-tertiary hover:bg-border-primary text-text-primary",
  ghost: "border border-border-primary hover:border-text-tertiary text-text-primary",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-f13 py-f8 text-body-sm",
  md: "px-f21 py-f13 text-body-sm",
  lg: "px-f34 py-f21 text-body",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = ""
) {
  return [BASE, VARIANTS[variant], SIZES[size], extra].filter(Boolean).join(" ");
}

/* ─── <button> element ──────────────────────────────────────── */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClass(variant, size, className)}
      {...props}
    />
  );
}

/* ─── Next.js <Link> wrapper ────────────────────────────────── */

interface ButtonLinkProps extends Omit<LinkProps, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: React.ReactNode;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClass(variant, size, className)}
      {...props}
    />
  );
}

/* ─── External <a> wrapper ──────────────────────────────────── */

interface ButtonAProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function ButtonA({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonAProps) {
  return (
    <a
      className={buttonClass(variant, size, className)}
      {...props}
    />
  );
}
