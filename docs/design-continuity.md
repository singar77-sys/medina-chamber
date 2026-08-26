# The Band Book — section-background continuity system

Approved by Mark 2026-08-25 ("run p1+p2"). Every page is a stack of bands; this
is the texture vocabulary, the order, and the rules. The homepage is the canon.
Interactive reference (live swatches): the "Band Book" artifact from the
2026-08-25 session.

## Vocabulary — texture ↔ job

| # | Texture | Implementation | Job |
|---|---------|----------------|-----|
| T1 | Hero photo | inline hero or `PageHero`, `opacity-[0.33]` | Opens every page. Exactly one; its image never repeats below. |
| T2 | Ghost photo + card | `opacity-[0.18]` under `bg-bg-secondary/75` card | The closer — terminal CTA band. `rule-top`, always. |
| T3 | Ghost photo band | `opacity-[0.10]` over `bg-secondary`, `border-y` | Mid-page storytelling depth. Opaque cards only. |
| T4 | Sigil | `<VesicaPiscisWatermark className="tp-vesica" />` | The page's core-substance band. Exactly one per page. `rule-top`. |
| T5 | Dots | `<HalftoneField />` (`.halftone-field`) | Utility & browsing grids — perks, archives, photo strips. (Directory browse tried dots, then honeycomb, then settled on shader + flashlight — Mark 2026-08-26.) |
| T6 | Honeycomb | `.tp-honeycomb` in a `relative isolate` section | Community & proof bands — pillars, Harris Poll. Keep rare. |
| T7 | Flashlight | `<MouseGradient>` cursor glow | Interactive strips only (home stats, contact quick-routes). No further spread. |
| T8 | Shader | `BrandShaderBackgroundLazy` | Member-testimony band (home) + directory browse band with flashlight (Mark 2026-08-26). Two instances max — treat as spent. |
| T9 | Gradient scrim | oxford washes over full photo | Flagship heroes only: homepage + medina-means-business (gazebo). |
| T0 | Plain | `bg-primary`, or `bg-secondary` + `border-y` | Breathing room. Required between any two photo bands. |

Blur-blobs (`bg-cambridge/10 … blur-3xl`) are **card accents**, never section
textures.

## The opacity ladder (never a fourth value)

- `0.33` — hero backdrop, once, at the top
- `0.18` — CTA ghost, **always** paired with a `/75` translucent card
- `0.10` — mid-page band ghost, **never** with a `/75` card

## The interior-page template

1. **OPEN** — hero photo @0.33, no separator
2. **SUBSTANCE** — sigil band, `rule-top`
3. **DEPTH** — ghost @0.10 over bg-secondary, `border-y`
4. **UTILITY** (optional) — dots (grids/archives) or honeycomb (proof)
5. **REST** (optional) — plain bg-primary; required if 3 and 6 would touch
6. **CLOSE** — ghost @0.18 + card/75, `rule-top`

Standing rules folded in (from 2026-08-03, unchanged): photo bands alternate
with non-photo bands; never a ghost photo on the first section after a hero;
one hero, one sigil, one CTA per page.

Flagship exceptions: homepage and /medina-means-business carry the extended
vocabulary (gazebo + scrim, flashlight, shader/blobs) on the same ladder.
/membership/first-30-days keeps its card-stack "workbook" character (its first
card is anchored with a rule-top wrapper).

## History

- 2026-08-25: system codified from a 3-agent audit (38 pages, 100+ sections;
  ladder found already unbroken across 62 interior sections). P1 bug fixes +
  P2 adoption applied in the same commit as this document.
- Prior art: docs/layout-formula.md (rhythm section updated to point here),
  the 2026-08-03 alternation rule, the 2026-08-24 card-over-ghost amendment
  (0.18 + /75).
