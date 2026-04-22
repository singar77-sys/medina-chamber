# Layout Formula + Human Element Proposal

Status: **proposal only** — Mark picks direction, then we implement.

---

## The "missing human element" on the home page

The page is architecturally clean but everyone on it is abstract. There's
a landmark photo (gazebo), a placeholder testimonial with no real name,
stats, and CTAs. Nobody's face. Nobody's story. That's what's missing.

Three concrete options, ordered by lift:

### Option A — Fix MemberVoice (lowest lift, highest ROI)

`MemberVoice.tsx` already has a `⚠️ placeholder` warning in its own
comments. The structure (pull quote + attribution) is solid; the content
is fake. Replace it with a real attributed member:

- A photo of the member (headshot, 80×80 rounded, or 160×160 portrait)
- Their actual quote, attributed by name + business name + year joined
- Optional: their tier badge (Visibility Plus / Community Investor)

This is one component swap. The section already has the right visual weight
— it just needs real people in it.

### Option B — "Meet the people behind the Chamber" band

A small 2-column strip (after the Three Pillars or before the Join CTA)
with Jaclyn and Stephanie — the two names already in the system prompt,
the ones visitors will actually email. Format:

```
[photo]  Jaclyn Ringstmeier
         Executive Director
         jaclyn@medinaohchamber.com
         "If you're wondering whether the chamber is right for your
          business, call me — that's what I'm here for."

[photo]  Stephanie Mueller
         Membership & Events
         stephanie@medinaohchamber.com
         "I know every member by name. Joining starts with a conversation."
```

This is a new section (~40 lines of JSX). No new data source needed —
just photos from the chamber and the quotes approved by Jaclyn/Stephanie.

### Option C — Rotating Member Spotlight

A featured-member card (sidebar or full-width band) that cycles through
3–5 real members with:
- Headshot or business logo
- 1-sentence story ("We've been a member 12 years. The Safety Council
  alone saved us $8k last year.")
- Link to their directory profile

This is the most work: needs a data source (add a `spotlights` array to
`src/data/` or use Sanity), a carousel/rotation component, and real
member photos/quotes collected from members. Medium lift.

---

## Layout formula for remaining pages

Based on the home page's section rhythm, here's the reusable pattern:

### Section anatomy

```
<section class="[band-class] py-20 lg:py-28">
  <div class="mx-auto max-w-7xl px-6 lg:px-8">
    <FadeIn>
      <!-- Overline: small caps, cambridge, tracking-widest, mb-2/3 -->
      <p class="text-overline text-cambridge mb-3">Section Category</p>

      <!-- H2: the primary statement -->
      <h2 class="text-h2">The real headline.</h2>

      <!-- Body: 1-2 sentences, body-lg, text-secondary, mt-4 -->
      <p class="text-body-lg text-text-secondary mt-4">Supporting detail.</p>

      <!-- Content grid / cards -->
      <div class="mt-10 lg:mt-14 grid ...">...</div>

      <!-- CTA -->
      <div class="mt-8">
        <Link class="...accent-button...">Primary action →</Link>
      </div>
    </FadeIn>
  </div>
</section>
```

### Band alternation

Pages should alternate between three band types to prevent visual fatigue:

| Type | Classes | Use for |
|------|---------|---------|
| Default | (no bg class) | Primary content sections |
| Secondary band | `bg-bg-secondary border-y border-border-secondary` | Stats, tools, secondary info |
| Ghosted photo | `relative overflow-hidden` + `<Image opacity-[0.05]>` | CTAs, hero adjacents |

Don't use secondary band twice in a row. Default → Secondary → Default → CTA ghost is the home page's actual rhythm.

### Typographic scale

| Element | Class | Notes |
|---------|-------|-------|
| Overline | `text-overline text-cambridge tracking-widest` | Always before H2 |
| Page title | `text-display` | Hero / page hero only |
| Section heading | `text-h2` | One per section |
| Card heading | `text-h4` | Card titles |
| Body lead | `text-body-lg text-text-secondary` | Section subtext |
| Body | `text-body` | Default paragraph |
| Caption | `text-caption text-text-tertiary` | Metadata, labels |

### Spacing rhythm

- Section vertical: `py-20 lg:py-28`
- Between overline and H2: `mb-2` or `mb-3`
- Between H2 and body: `mt-4`
- Between body and grid/cards: `mt-10 lg:mt-14`
- Between cards: `gap-4` (tight) or `gap-8` (airy)

### Hero pattern for inner pages

Inner pages don't need an 85vh full-bleed hero. The established pattern
for them is a compact page-header band:

```
<!-- Compact hero: ~40vh, same structure but pb-14 instead of pb-24 -->
<section class="relative min-h-[40vh] flex items-end overflow-hidden">
  <Image src="[relevant-photo]" fill class="object-cover" />
  <div class="absolute inset-0 bg-gradient-to-t from-oxford via-oxford/60 to-oxford/15" />
  <div class="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 pb-14 pt-28 w-full">
    <p class="text-overline text-cambridge mb-3">Section</p>
    <h1 class="text-display text-white">Page Title</h1>
  </div>
</section>
```

---

## Recommendation

Do Option A (fix MemberVoice with real attribution + photo) now — it's
the lowest-lift, highest-impact change and removes the placeholder warning
that's been sitting in the code. Then decide whether Option B (staff strip)
belongs on the home page or the About page.

Option C (member spotlight) is better as a dedicated `/membership/directory`
page feature than a homepage element.
