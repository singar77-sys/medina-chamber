/**
 * HalftoneField — a dot-gradient section backdrop.
 *
 * A fine lattice of dots masked into a soft diagonal fade (dense at the
 * bottom-left, dissolving toward the top-right) whose opacity breathes in
 * and out. Purely decorative texture for breaking up the negative space in
 * sections that have no ghosted photo behind them.
 *
 * Usage: drop it in as the first child of a `relative overflow-hidden`
 * section and give the real content wrapper `relative` so it stacks above.
 * The dot color and opacity band are theme-aware and the breath respects
 * prefers-reduced-motion — see `.halftone-field` in globals.css.
 */
interface Props {
  className?: string;
}

export function HalftoneField({ className = "" }: Props) {
  return (
    <div
      className={`halftone-field ${className}`}
      aria-hidden="true"
      role="presentation"
    />
  );
}
