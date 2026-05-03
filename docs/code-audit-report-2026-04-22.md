# Medina Chamber Site Code Audit

Date: 2026-04-22

## Scope

- Repository audited: `C:\Users\Mark\Documents\Hunter Systems\medina-chamber\medina-chamber-site`
- Request: scan the code for errors affecting desktop and mobile, do not fix, create a report
- Checks run:
  - `npm run lint`
  - `npm run build`
  - targeted code review of layout, navigation, overlays, chat, modal, animation, and global CSS

## Executive Summary

- `npm run build` passes.
- `npm run lint` fails with 87 problems total: 41 errors and 46 warnings.
- The highest-risk issues are in interactive UI code used on both desktop and mobile:
  - broken font preloads in the root layout
  - React purity / render-stability violations in event, ambience, particle, and icebreaker code
  - synchronous state updates inside effects across several interactive components
  - accessibility issues in overlay and modal interactions
  - a dead footer "Back to top" link
- A meaningful portion of the lint noise also comes from non-runtime files in `public/images/chamber events/*.jsx` and maintenance scripts. Those do not look like core site runtime, but they still fail lint today.

## Findings

### 1. Broken font preloads in the root layout

Severity: High

Why it matters:
- The site preloads two `.woff2` files that do not exist in `public/fonts`.
- On desktop and mobile this creates wasted preload requests and defeats the intended font-performance optimization for first paint / LCP.

Evidence:
- `src/app/layout.tsx:45-58` preloads:
  - `/fonts/bn-bergen-bold.woff2`
  - `/fonts/bn-bergen-regular.woff2`
- Actual files present in `public/fonts`:
  - `BNBergen-Bold.otf`
  - `BNBergen-Light.otf`
  - `BNBergen.otf`
  - `Mistrully.ttf`

### 2. Event detail pages create a component during render

Severity: High

Why it matters:
- `getEventGraphicRenderer(event)` returns a component that is then rendered as `<Graphic />` inside the page render.
- ESLint flags this as `react-hooks/static-components`.
- This can lead to unstable child identity and state resets on re-render for event pages.

Evidence:
- `src/app/events/[slug]/page.tsx:97`
- `src/app/events/[slug]/page.tsx:151-155`

### 3. Impure rendering in animated UI paths

Severity: High

Why it matters:
- Several client components call `Math.random()` directly in render or mutate refs during render.
- These patterns are now lint-blocking and can create unstable UI output, especially in animation-heavy surfaces.
- Cross-device impact is broad because these are visual/interactive features that run on both desktop and mobile.

Evidence:
- `src/app/icebreaker/IcebreakerClient.tsx:13-18`
  - `Math.random()` used while rendering shard geometry
- `src/components/weather/MedinaAmbience.tsx:260-267`
  - lightning flash delays generated with `Math.random()` inside render memo path
- `src/components/holographic/ParticleField.tsx:41-42`
  - ref updated during render: `intensityRef.current = intensity`

### 4. Multiple components synchronously set state inside effects

Severity: Medium-High

Why it matters:
- The app has several effect bodies that immediately call `setState`.
- ESLint flags these as `react-hooks/set-state-in-effect`.
- These are not guaranteed runtime crashes, but they increase the risk of cascading renders, animation jitter, and harder-to-debug behavior in interactive UI.

Evidence:
- `src/components/ThemeProvider.tsx:53-61`
- `src/components/CommandPalette.tsx:346-349`
- `src/components/CommandPalette.tsx:388-402`
- `src/components/ChatWidget.tsx:373-375`
- `src/components/Header.tsx:253-264`
- `src/hooks/usePortalAudio.ts:33-37`
- `src/lib/useVisitState.ts:71` (from lint output)

### 5. Overlay and modal accessibility issues

Severity: Medium-High

Why it matters:
- Some overlays rely on clickable `div` containers instead of fully interactive semantics.
- This mostly hurts keyboard and assistive-tech flows, but it also tends to produce inconsistent behavior across desktop and mobile input modes.

Evidence:
- `src/components/CommandPalette.tsx:475-484`
  - backdrop and panel use click handlers on non-interactive containers
- `src/components/RentalSpaceCards.tsx:191-203`
  - modal scrim and inner wrapper use click handlers on non-interactive containers

Related lint categories:
- `jsx-a11y/click-events-have-key-events`
- `jsx-a11y/no-noninteractive-element-interactions`
- `jsx-a11y/no-static-element-interactions`

### 6. Footer "Back to top" link is dead

Severity: Medium

Why it matters:
- The footer links to `#top`, but no `id="top"` target exists in the audited `src/**/*.tsx` files.
- On desktop and mobile, users can activate the control without getting the expected result.

Evidence:
- `src/components/Footer.tsx:215-217`
- Search found `href="#top"` but no matching `id="top"`

### 7. Mobile tap targets are undersized in a few places

Severity: Medium

Why it matters:
- A few controls fall below the common 44x44 mobile touch-target guideline.
- These are more likely to feel frustrating on phones than on desktop.

Evidence:
- `src/components/Header.tsx:576-579`
  - mobile hamburger uses `w-10 h-10` (40x40)
- `src/app/globals.css:1369-1374`
  - `.ftr-social` is `36px` by `36px`
- `src/app/globals.css:1769-1777`
  - `.rsc-modal__close` is `36px` by `36px`
- `src/components/ChatWidget.tsx:585-593`
  - send button uses `w-10 h-10` (40x40)

### 8. Lint-blocking content issues in non-core runtime files

Severity: Medium

Why it matters:
- A large share of the lint failures come from JSX files under `public/images/chamber events/` plus some scripts.
- These may be design-source or archival files rather than production runtime, but they still fail the repo lint check and will block a stricter CI pipeline.

Evidence:
- `public/images/chamber events/finals.jsx`
- `public/images/chamber events/graphics.jsx`
- repeated `react/no-unescaped-entities`
- repeated `@next/next/no-img-element`
- unused variable warnings in several scripts under `scripts/`

### 9. Additional lower-severity lint findings worth tracking

Severity: Low-Medium

Examples:
- `src/app/membership/savings/page.tsx:97`
  - unescaped apostrophe in JSX content
- `src/components/ChatWidget.tsx:262`
  - unnecessary dependency in `useCallback`
- `src/app/events/[slug]/page.tsx:293`
  - `prefer-const`

These are not the main UX risks, but they contribute to the current failed lint state.

## Desktop / Mobile Notes

### Desktop

- No hard production build failures were found for desktop.
- The largest desktop risks are code-quality and accessibility based:
  - unstable render patterns in interactive surfaces
  - overlay/modal semantics
  - dead footer anchor

### Mobile

- No obvious global reflow catastrophe was found in the static review.
- The main mobile-specific concerns are:
  - undersized touch targets
  - fixed-position overlay/chat controls competing for limited viewport height
  - interactive effect code that may be more fragile on lower-powered devices

## What Passed

- `npm run build` completed successfully on 2026-04-22.
- Route generation completed without TypeScript build failure.
- Global CSS includes several explicit mobile-safe patterns already:
  - `overflow-x: clip`
  - safe-area handling in the full-screen ChamberBot portal
  - responsive modal/grid work in rental-space styling

## Recommended Priority Order For Follow-Up

1. Fix the broken font preload paths in `src/app/layout.tsx`.
2. Resolve lint-blocking React purity / render-stability issues:
   - `events/[slug]`
   - `IcebreakerClient`
   - `MedinaAmbience`
   - `ParticleField`
3. Resolve effect-driven state update warnings in the shared interactive components:
   - `ThemeProvider`
   - `CommandPalette`
   - `ChatWidget`
   - `Header`
   - `usePortalAudio`
4. Fix accessibility issues in command palette and rental-space modal interactions.
5. Repair the footer back-to-top behavior and review undersized tap targets for mobile.
6. Decide whether the JSX files under `public/images/chamber events/` should be linted at all.

## Bottom Line

The site is buildable, but it is not in a clean audit state. The biggest gaps are not classic compile failures; they are UI integrity, accessibility, and interaction-quality issues that affect both desktop and mobile, with mobile taking the larger ergonomics hit.
