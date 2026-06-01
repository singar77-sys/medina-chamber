# Design System Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all 12 design system gaps found in the June 2026 audit: missing `--shadow-cambridge` token, unlinked `--radius-xl`, no form base styles, `font-semibold` without a 600-weight font file, no reusable Button component, inconsistent CTA sizing across pages, admin/portal pages that bypass the design system entirely, prose pages using default Tailwind spacing, and an incomplete design spec page.

**Architecture:** Token additions to `globals.css` are done first (Task 1) since all other tasks depend on them. The Button component (Task 2) is next so call-site updates in Tasks 3–4 can import it. The font-semibold sweep (Task 5), prose spacing (Task 6), and admin cleanup (Task 7) are independent and can run in any order after Task 1. The design spec update (Task 8) is last — it documents the finished system.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4 CSS-first config (`@theme inline`), TypeScript. BN Bergen has three weights only: 300 (Light), 400 (Regular), 700 (Bold). There is **no 600-weight file** in `public/fonts/` — `font-semibold` synthesizes or snaps to Bold incorrectly.

---

## File Map

| File | Action | Reason |
|---|---|---|
| `src/app/globals.css` | Modify | Add `--shadow-cambridge` token, bridge to Tailwind, add form base styles |
| `src/components/ui/Button.tsx` | **Create** | Reusable Button/ButtonLink/ButtonA with variant + size props |
| `src/app/membership/join/page.tsx` | Modify | Adopt Button component; hero CTA was `px-8 py-4 text-body` (non-standard lg) |
| `src/app/about/board/page.tsx` | Modify | Adopt Button component; CTA section |
| `src/app/events/[slug]/page.tsx` | Modify | Adopt Button component; sidebar register CTA |
| `src/components/Header.tsx` | Modify | Adopt Button component; desktop CTA and mobile CTAs |
| `src/app/events/page.tsx` | Modify | Replace inline `rgba` hover shadows with `hover:shadow-cambridge` |
| `src/app/page.tsx` | Modify | Replace inline `rgba` hover shadows with `hover:shadow-cambridge` |
| `src/app/news/page.tsx` | Modify | Replace inline `rgba` hover shadows with `hover:shadow-cambridge` |
| `src/app/about/contact/page.tsx` | Modify | Replace inline `rgba` hover shadows with `hover:shadow-cambridge` |
| `src/app/news/blog/page.tsx` | Modify | Replace `text-cambridge` on dates (renders as accent in light mode) |
| `src/app/terms/page.tsx` | Modify | Replace Tailwind default spacing with Fibonacci tokens |
| `src/app/accessibility/page.tsx` | Modify | Replace Tailwind default spacing with Fibonacci tokens |
| `src/app/admin/login/page.tsx` | Modify | Replace hardcoded hex + Tailwind gray-* with design tokens |
| `src/app/admin/(dashboard)/page.tsx` | Modify | Replace hardcoded hex + gray-* with design tokens |
| `src/app/portal/page.tsx` | Modify | Replace hardcoded hex + system-ui font with design tokens |
| `src/app/portal/layout.tsx` | Modify | Remove hardcoded background and system-ui font override |
| `src/app/design/page.tsx` | Modify | Add form demo, spacing scale, shadow-cambridge, Button component demo |

---

## Task 1: globals.css — Token additions

**Files:**
- Modify: `src/app/globals.css`

This task has three independent insertions: the `--shadow-cambridge` token, its Tailwind bridge, and form element base styles.

- [ ] **Step 1: Add `--shadow-cambridge` to `:root`**

In the `:root` block, after the line `--shadow-lg: 0 12px 32px rgba(12, 27, 51, 0.12);` (around line 117), add:

```css
  --shadow-cambridge: 0 12px 40px rgba(131, 188, 169, 0.12);
```

- [ ] **Step 2: Add `--shadow-cambridge` to `[data-theme="dark"]`**

In the `[data-theme="dark"]` block, after `--shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.4);`, add:

```css
  --shadow-cambridge: 0 12px 40px rgba(131, 188, 169, 0.18);
```

Dark mode gets a slightly stronger tint (`0.18` vs `0.12`) because the cambridge color reads better against deep backgrounds.

- [ ] **Step 3: Bridge `--shadow-cambridge` and `--radius-xl` to `@theme inline`**

In the `@theme inline` block, after the last spacing entry (`--spacing-f233: 14.5625rem;`), add:

```css
  /* Shadow + radius extensions — bridged so shadow-cambridge and
     rounded-[var(--radius-xl)] resolve correctly in Tailwind utilities. */
  --shadow-cambridge: var(--shadow-cambridge);
```

Note: `--radius-xl` is already defined in `:root` (line ~210). The existing codebase pattern uses `rounded-[var(--radius-xl)]` syntax directly — this works without a Tailwind bridge. No action needed; the audit item is addressed by documenting the pattern in Task 8.

- [ ] **Step 4: Add form element base styles to `@layer base`**

Directly after the closing `}` of the existing `@layer base` block (which ends around line 509 after the `.text-overline` definition), add:

```css
  /* Form element base styles — reset browser defaults to use design tokens.
     Individual component focus overrides (e.g. focus:border-cambridge in
     ApplicationForm) still work — Tailwind utilities beat @layer base. */
  input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="file"]),
  select,
  textarea {
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-sm);
    background-color: var(--bg-primary);
    color: var(--text-primary);
    font-family: var(--font-sans);
    font-size: 1rem;
    line-height: 1.5;
    transition: border-color 200ms ease, background-color 200ms ease;
  }

  input:not([type="checkbox"]):not([type="radio"]):focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: var(--cambridge);
  }

  input:disabled,
  select:disabled,
  textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ::placeholder {
    color: var(--text-tertiary);
    opacity: 1;
  }
```

- [ ] **Step 5: Verify in browser**

Run `pnpm dev` (or `npm run dev`) from `medina-chamber-site/`. Navigate to `/membership/join` — the application form inputs should now render with the brand border color instead of browser default blue focus rings. Light/dark mode toggle should show the inputs adapting. No visual regressions on public pages.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "design: add --shadow-cambridge token, form base styles to @layer base"
```

---

## Task 2: Create Button component

**Files:**
- Create: `src/components/ui/Button.tsx`

No 600-weight BN Bergen file exists, so the component uses `font-bold` (700) only.

- [ ] **Step 1: Create `src/components/ui/Button.tsx`**

```tsx
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
  ghost:
    "border border-border-primary hover:border-text-tertiary text-text-primary",
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd medina-chamber-site && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors for the new file.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Button.tsx
git commit -m "design: add Button/ButtonLink/ButtonA component with variant+size API"
```

---

## Task 3: Adopt Button component — key page CTAs

**Files:**
- Modify: `src/app/membership/join/page.tsx`
- Modify: `src/app/about/board/page.tsx`
- Modify: `src/app/events/[slug]/page.tsx`
- Modify: `src/components/Header.tsx`

The goal is to replace the 4+ inconsistent inline button patterns with the component. Do one file at a time so regressions are easy to spot.

### 3a — `membership/join/page.tsx`

- [ ] **Step 1: Update imports**

At the top of `src/app/membership/join/page.tsx`, add:
```tsx
import { ButtonLink, ButtonA } from "@/components/ui/Button";
```

- [ ] **Step 2: Replace hero CTAs**

Find the hero section buttons (around line 105–129):
```tsx
<a
  href="#apply"
  className="
    inline-flex items-center px-8 py-4
    bg-accent hover:bg-accent-hover
    text-white font-bold text-body
    rounded-[var(--radius-md)]
    transition-colors
  "
>
  Start Your Application →
</a>
<Link
  href="/membership/pricing"
  className="
    inline-flex items-center px-6 py-4
    bg-bg-tertiary hover:bg-border-primary
    text-text-primary font-bold text-body-sm
    rounded-[var(--radius-md)]
    transition-colors
  "
>
  View Pricing
</Link>
```

Replace with:
```tsx
<ButtonA href="#apply" size="lg">
  Start Your Application →
</ButtonA>
<ButtonLink href="/membership/pricing" variant="secondary" size="lg">
  View Pricing
</ButtonLink>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/membership/join/page.tsx
git commit -m "design: adopt Button component on join page hero CTAs"
```

### 3b — `about/board/page.tsx`

- [ ] **Step 1: Update imports**

```tsx
import { ButtonLink } from "@/components/ui/Button";
```

- [ ] **Step 2: Replace CTA section buttons** (around lines 184–205)

Find:
```tsx
<Link
  href="/about/contact"
  className="
    block w-full text-center py-f13 px-f21
    bg-accent hover:bg-accent-hover
    text-white font-bold text-body-sm
    rounded-[var(--radius-md)]
    transition-colors
  "
>
  Get in Touch →
</Link>
<Link
  href="/about/ambassadors"
  className="
    block w-full text-center py-f13 px-f21
    border border-border-primary hover:border-text-tertiary
    text-text-primary font-bold text-body-sm
    rounded-[var(--radius-md)]
    transition-colors
  "
>
  Meet the Ambassadors
</Link>
```

Replace with:
```tsx
<ButtonLink href="/about/contact" size="md" className="w-full justify-center">
  Get in Touch →
</ButtonLink>
<ButtonLink href="/about/ambassadors" variant="ghost" size="md" className="w-full justify-center">
  Meet the Ambassadors
</ButtonLink>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/about/board/page.tsx
git commit -m "design: adopt Button component on board page CTAs"
```

### 3c — `events/[slug]/page.tsx`

- [ ] **Step 1: Update imports**

```tsx
import { ButtonA, ButtonLink } from "@/components/ui/Button";
```

- [ ] **Step 2: Replace sidebar register button** (around lines 261–275)

Find:
```tsx
<a
  href={event.registerUrl}
  target="_blank"
  rel="noopener noreferrer"
  className="
    block w-full text-center py-3 px-6
    bg-accent hover:bg-accent-hover
    text-white font-bold text-body-sm
    rounded-[var(--radius-md)]
    transition-colors
  "
>
  Register Now →
</a>
```

Replace with:
```tsx
<ButtonA
  href={event.registerUrl}
  target="_blank"
  rel="noopener noreferrer"
  size="md"
  className="w-full justify-center"
>
  Register Now →
</ButtonA>
```

- [ ] **Step 3: Replace "← All Events" ghost button** (around lines 286–297)

Find:
```tsx
<Link
  href="/events"
  className="
    flex items-center justify-center gap-2 w-full py-3 px-6
    border border-border-secondary hover:border-border-primary
    text-text-primary font-bold text-body-sm
    rounded-[var(--radius-md)]
    transition-colors
  "
>
  ← All Events
</Link>
```

Replace with:
```tsx
<ButtonLink href="/events" variant="ghost" size="md" className="w-full justify-center gap-2">
  ← All Events
</ButtonLink>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/events/[slug]/page.tsx
git commit -m "design: adopt Button component on event detail page"
```

### 3d — `Header.tsx`

- [ ] **Step 1: Update imports** (add to the existing import block at top)

```tsx
import { ButtonLink, ButtonA } from "@/components/ui/Button";
```

- [ ] **Step 2: Replace desktop CTA** (around line 610–621)

Find:
```tsx
<Link
  href={ctaLink.href}
  className="
    hidden xl:flex items-center px-f13 py-f8
    whitespace-nowrap
    bg-accent hover:bg-accent-hover
    text-white font-bold text-body-sm
    rounded-[var(--radius-md)]
    transition-colors
  "
>
  {ctaLink.label} →
</Link>
```

Replace with:
```tsx
<ButtonLink
  href={ctaLink.href}
  size="sm"
  className="hidden xl:flex"
>
  {ctaLink.label} →
</ButtonLink>
```

- [ ] **Step 3: Replace mobile Member Login button** (around lines 322–335)

Find:
```tsx
<a
  href={memberLogin.href}
  target="_blank"
  rel="noopener noreferrer"
  className="
    flex items-center justify-center w-full py-3 px-6
    bg-emerald hover:bg-emerald/90
    text-white font-bold text-body-sm
    rounded-[var(--radius-md)]
    transition-colors
  "
  onClick={onClose}
>
  {memberLogin.label}
</a>
```

Replace with (ghost variant — Member Login should not be a filled CTA competing with Join Now):
```tsx
<ButtonA
  href={memberLogin.href}
  target="_blank"
  rel="noopener noreferrer"
  variant="ghost"
  size="md"
  className="w-full justify-center"
  onClick={onClose}
>
  {memberLogin.label}
</ButtonA>
```

- [ ] **Step 4: Replace mobile Join CTA** (around lines 430–442)

Find:
```tsx
<Link
  href={ctaLink.href}
  className="
    flex items-center justify-center w-full py-3.5 px-6
    bg-accent hover:bg-accent-hover
    text-white font-bold text-body-sm
    rounded-[var(--radius-md)]
    transition-colors
  "
  onClick={onClose}
>
  {ctaLink.label} →
</Link>
```

Replace with:
```tsx
<ButtonLink
  href={ctaLink.href}
  size="md"
  className="w-full justify-center"
  onClick={onClose}
>
  {ctaLink.label} →
</ButtonLink>
```

- [ ] **Step 5: Verify in browser**

Navigate the site, open mobile menu, check all CTAs. The "Member Login" button should now be ghost-styled (not filled emerald), making "Join Now" the only filled primary action in the header. Both themes should look correct.

- [ ] **Step 6: Commit**

```bash
git add src/components/Header.tsx
git commit -m "design: adopt Button component in Header; fix mobile member login to ghost variant"
```

---

## Task 4: Replace inline cambridge shadow strings

**Files:**
- Modify: `src/app/events/page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/news/page.tsx`
- Modify: `src/app/about/contact/page.tsx`

The string `hover:shadow-[0_12px_40px_rgba(131,188,169,0.12)]` is copy-pasted in 4 places. After Task 1 adds `--shadow-cambridge` to `@theme inline`, the Tailwind utility `shadow-cambridge` is available.

Also fix the weaker variant `hover:shadow-[0_8px_32px_rgba(131,188,169,0.10)]` — replace with `hover:shadow-cambridge` (close enough; the token value is the canonical one).

- [ ] **Step 1: `events/page.tsx`**

```bash
# In medina-chamber-site/
grep -n "shadow-\[0_" src/app/events/page.tsx
```

Replace every match of `hover:shadow-[0_12px_40px_rgba(131,188,169,0.12)]` and `hover:shadow-[0_8px_32px_rgba(131,188,169,0.10)]` with `hover:shadow-cambridge`.

Also replace `hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)]` with `hover:shadow-[var(--shadow-md)]`.

- [ ] **Step 2: `page.tsx` (home)**

```bash
grep -n "shadow-\[0_" src/app/page.tsx
```

Same replacements as Step 1.

- [ ] **Step 3: `news/page.tsx`**

```bash
grep -n "shadow-\[0_" src/app/news/page.tsx
```

Same replacements.

- [ ] **Step 4: `about/contact/page.tsx`**

```bash
grep -n "shadow-\[0_" src/app/about/contact/page.tsx
```

Same replacements.

- [ ] **Step 5: Verify no remaining inline rgba shadows on public pages**

```bash
grep -rn "shadow-\[0_.*rgba(131" src/app --include="*.tsx" | grep -v admin | grep -v portal
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/app/events/page.tsx src/app/page.tsx src/app/news/page.tsx src/app/about/contact/page.tsx
git commit -m "design: replace inline rgba hover shadows with shadow-cambridge token"
```

---

## Task 5: font-semibold → font-bold sweep (public pages)

**Files:**
- Multiple files in `src/app/` and `src/components/` (admin/portal excluded — handled in Task 7)

BN Bergen has no 600-weight file. `font-semibold` will either synthesize badly or be identical to bold. Replace with `font-bold` in all public-facing code.

- [ ] **Step 1: Find all occurrences outside admin/portal**

```bash
grep -rn "font-semibold" src/ --include="*.tsx" | grep -v "src/app/admin" | grep -v "src/app/portal"
```

Note every file path and line number.

- [ ] **Step 2: Replace in each file**

For each file found, replace `font-semibold` with `font-bold`. The exact files will vary; common locations are `events/[slug]/page.tsx`, `about/board/page.tsx`, and component files. Example sed command:

```bash
# Run from medina-chamber-site/
grep -rln "font-semibold" src/ --include="*.tsx" | \
  grep -v "src/app/admin" | grep -v "src/app/portal" | \
  xargs sed -i 's/font-semibold/font-bold/g'
```

- [ ] **Step 3: Verify**

```bash
grep -rn "font-semibold" src/ --include="*.tsx" | grep -v "src/app/admin" | grep -v "src/app/portal"
```

Expected: no output.

- [ ] **Step 4: Visual check**

Reload `/about/board` and `/events/[slug]` — text that was `font-semibold` should look identical or slightly bolder. No layout shift expected since BN Bergen 600 was never loaded.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "design: replace font-semibold with font-bold (no 600-weight BN Bergen file exists)"
```

---

## Task 6: Prose page Fibonacci spacing

**Files:**
- Modify: `src/app/terms/page.tsx`
- Modify: `src/app/accessibility/page.tsx`

These pages use default Tailwind spacing (`py-16`, `py-24`, `mb-4`, `mt-6`, `gap-6`) instead of Fibonacci tokens. The mapping to use:

| Tailwind default | Fibonacci equivalent | Rationale |
|---|---|---|
| `py-16` (4rem/64px) | `py-f55` (3.4375rem/55px) | Closest Fibonacci below 64px |
| `py-24` (6rem/96px) | `py-f89` (5.5625rem/89px) | Closest match |
| `mb-10` (2.5rem/40px) | `mb-f34` (2.125rem/34px) | Closest match |
| `mb-4` (1rem/16px) | `mb-f13` (0.8125rem/13px) | Closest match |
| `mt-6` (1.5rem/24px) | `mt-f21` (1.3125rem/21px) | Closest match |
| `mt-3` (0.75rem/12px) | `mt-f8` (0.5rem/8px) | Close enough |
| `mt-16` (4rem/64px) | `mt-f55` | Match above |
| `pt-8` (2rem/32px) | `pt-f34` | Close enough |
| `gap-6` (1.5rem/24px) | `gap-f21` | Closest match |
| `mb-6` (1.5rem/24px) | `mb-f21` | Closest match |

### 6a — `terms/page.tsx`

- [ ] **Step 1: Apply spacing replacements**

Open `src/app/terms/page.tsx`. The outer article uses `py-16 lg:py-24`. Apply:

```tsx
// Before
<article className="mx-auto max-w-3xl px-6 lg:px-8 py-16 lg:py-24">
  <header className="mb-10">
    <p className="text-overline text-cambridge mb-4">Legal</p>
    ...
    <p className="text-body-lg text-text-secondary mt-6">

// After
<article className="mx-auto max-w-3xl px-6 lg:px-8 py-f55 lg:py-f89">
  <header className="mb-f34">
    <p className="text-overline text-cambridge mb-f13">Legal</p>
    ...
    <p className="text-body-lg text-text-secondary mt-f21">
```

For section headings, the `mb-4` before each `<h2>` and `mt-3`/body spacing:
```tsx
// Before
<h2 className="text-h2 mb-4">
<p className="text-body text-text-secondary mt-3">

// After
<h2 className="text-h2 mb-f13">
<p className="text-body text-text-secondary mt-f8">
```

For the footer rule at the bottom:
```tsx
// Before
<footer className="mt-16 pt-8 border-t border-border-secondary flex gap-6">

// After
<footer className="mt-f55 pt-f34 border-t border-border-secondary flex gap-f21">
```

- [ ] **Step 2: Commit**

```bash
git add src/app/terms/page.tsx
git commit -m "design: align terms page spacing to Fibonacci scale"
```

### 6b — `accessibility/page.tsx`

- [ ] **Step 1: Audit and replace**

```bash
grep -n "py-\|px-\|mt-\|mb-\|pt-\|pb-\|gap-\|space-y-" src/app/accessibility/page.tsx | grep -v "f[0-9]"
```

Replace each Tailwind default found using the same mapping table above.

- [ ] **Step 2: Commit**

```bash
git add src/app/accessibility/page.tsx
git commit -m "design: align accessibility page spacing to Fibonacci scale"
```

---

## Task 7: Admin + portal — design token adoption

**Files:**
- Modify: `src/app/admin/login/page.tsx`
- Modify: `src/app/admin/(dashboard)/page.tsx`
- Modify: `src/app/portal/page.tsx`
- Modify: `src/app/portal/layout.tsx`

These files use hardcoded hex values, Tailwind gray-* utilities, and in one case override the brand font entirely. The replacements are mechanical.

### Replacement reference table

| Hardcoded value | Token replacement |
|---|---|
| `style={{ background: "#0C1B33" }}` | `className="bg-oxford"` |
| `style={{ color: "#83BCA9" }}` | `className="text-cambridge"` |
| `style={{ color: "#475569" }}` | `className="text-text-tertiary"` |
| `text-gray-900` | `text-text-primary` |
| `text-gray-700` | `text-text-secondary` |
| `text-gray-500` | `text-text-tertiary` |
| `text-gray-400` | `text-text-tertiary` |
| `border-gray-200`, `border-gray-300` | `border-border-secondary` |
| `bg-white` | `bg-bg-primary` |
| `rounded-2xl` | `rounded-[var(--radius-lg)]` |
| `rounded-lg` | `rounded-[var(--radius-md)]` |
| `rounded-xl` | `rounded-[var(--radius-lg)]` |
| `shadow-2xl` | `shadow-[var(--shadow-lg)]` |
| `focus:ring-[#83BCA9]` | `focus:ring-cambridge` |
| `text-sm` (standalone) | `text-body-sm` |
| `text-xs` (standalone) | `text-caption` |
| `text-lg` (standalone) | `text-h4` |
| `fontFamily: "system-ui, -apple-system, sans-serif"` | remove (global already applies BN Bergen) |
| `background: "#f8fafc"` | `bg-bg-secondary` (via className) |

**Note on status badge colors in `portal/dashboard/page.tsx`:** The green/blue/yellow/red status mapping uses semantic colors outside the brand palette (active = green, lapsed = red, etc.). These are intentionally semantic and it's acceptable to keep them hardcoded. Do NOT convert these to brand tokens. Only replace the hardcoded instances of `#0C1B33`, `#83BCA9`, and `rgba(255,255,255,.08)`.

### 7a — `admin/login/page.tsx`

- [ ] **Step 1: Rewrite using tokens**

The entire page is ~105 lines. Replace it:

```tsx
import { redirect } from "next/navigation";
import Image from "next/image";
import { cookies } from "next/headers";

export const metadata = { title: "Admin Login" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already logged in — skip to dashboard
  const cookieStore = await cookies();
  if (cookieStore.get("admin_session")) redirect("/admin");

  const { error } = await searchParams;

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-oxford px-4"
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-f34">
          <Image
            src="/images/logos/logo-full-white.png"
            alt="Medina Chamber"
            width={160}
            height={48}
            className="h-12 w-auto mb-f13"
          />
          <p className="text-cambridge text-body-sm">Admin Console</p>
        </div>

        {/* Card */}
        <div className="bg-bg-primary rounded-[var(--radius-lg)] p-f34 shadow-[var(--shadow-lg)]">
          <h2 className="text-h4 text-text-primary">Sign in</h2>
          <p className="text-text-tertiary text-body-sm mt-f3">
            Use your admin password to continue.
          </p>

          <form method="POST" action="/api/admin/auth" className="mt-f21 space-y-f13">
            <div>
              <label
                htmlFor="password"
                className="block text-body-sm font-bold text-text-primary mb-f5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="
                  w-full px-f13 py-f8
                  bg-bg-secondary border border-border-primary
                  rounded-[var(--radius-sm)]
                  text-body-sm text-text-primary
                  focus:outline-none focus:border-cambridge
                  focus-visible:ring-2 focus-visible:ring-cambridge/40
                  transition-colors
                  disabled:opacity-50
                "
              />
            </div>

            {error && (
              <p className="text-body-sm text-red-600 bg-red-50 px-f13 py-f8 rounded-[var(--radius-sm)] border border-red-200">
                {error === "invalid" ? "Incorrect password." : "Something went wrong."}
              </p>
            )}

            <button
              type="submit"
              className="
                w-full py-f13 text-body-sm font-bold text-white
                bg-accent hover:bg-accent-hover
                rounded-[var(--radius-md)]
                transition-colors disabled:opacity-40
              "
            >
              Sign in
            </button>
          </form>
        </div>

        <p className="text-center text-caption text-text-tertiary mt-f21">
          Medina Chamber Admin · For authorized users only
        </p>
      </div>
    </div>
  );
}
```

**Important:** Check how the existing login form actually submits (it may use a client component with `useState` for the password field, not a server action form POST). Read the original file's form logic before replacing. Preserve whatever auth mechanism is in place — only swap the visual layer.

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/login/page.tsx
git commit -m "design: admin login page uses design tokens instead of hardcoded hex"
```

### 7b — `admin/(dashboard)/page.tsx`

- [ ] **Step 1: Replace hardcoded values using the table above**

This file has approximately 165 lines. Key replacements:

```tsx
// hardcoded hex in style props
style={{ background: "#83BCA9", ... }}  →  className="bg-cambridge ..."
hover:text-[#0C1B33]  →  hover:text-oxford
text-[#83BCA9]        →  text-cambridge

// gray utilities
text-gray-500  →  text-text-tertiary
text-gray-400  →  text-text-tertiary
text-gray-700  →  text-text-secondary
border-gray-200  →  border-border-secondary
bg-white  →  bg-bg-primary
rounded-xl  →  rounded-[var(--radius-lg)]

// semantic status colors — KEEP THESE AS-IS
{ background: "#d1fae5", color: "#065f46" }  // active = green, intentional
{ background: "#f1f5f9", color: "#64748b" }  // inactive = slate, intentional
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/admin/(dashboard)/page.tsx"
git commit -m "design: admin dashboard uses design tokens; keep semantic status colors"
```

### 7c — `portal/page.tsx` + `portal/layout.tsx`

- [ ] **Step 1: `portal/layout.tsx`**

The layout has:
```tsx
style={{ background: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif" }}
```

Replace with:
```tsx
className="bg-bg-secondary"
```

Remove the `fontFamily` entirely — the global `body` rule in `globals.css` applies BN Bergen to the portal too.

- [ ] **Step 2: `portal/page.tsx` — replace inline style props**

```tsx
style={{ background: "#0C1B33" }}        →  className="bg-oxford"
style={{ color: "#83BCA9" }}             →  className="text-cambridge"
style={{ background: "#f0faf6" }}        →  className="bg-surface-cambridge"
style={{ color: "#475569" }}             →  className="text-text-tertiary"
style={{ "--tw-ring-color": "#83BCA9" }} →  className="focus:ring-cambridge"
style={{ background: "#0C1B33" }}        →  className="bg-oxford"
```

Convert `style={{ background: ... }}` on the submit button to a Tailwind `className`:
```tsx
// Before
<button style={{ background: "#0C1B33" }} className="w-full py-2.5 ...">

// After
<button className="w-full py-f13 bg-oxford text-white ...">
```

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/page.tsx src/app/portal/layout.tsx
git commit -m "design: portal pages use design tokens; remove system-ui font override"
```

---

## Task 8: Update design spec page (`/design`)

**Files:**
- Modify: `src/app/design/page.tsx`

Add sections for: Button component, form elements, shadow-cambridge, spacing scale. These were missing from the spec page per the audit.

- [ ] **Step 1: Add Button import**

```tsx
import { Button, ButtonLink, ButtonA } from "@/components/ui/Button";
```

- [ ] **Step 2: Replace the inline button demos with the Button component**

Find the existing "Buttons" subsection (around line 229) and replace the three raw `<button>` elements:

```tsx
<div>
  <h3 className="text-h4 mb-f13">Buttons</h3>
  <div className="flex flex-wrap gap-f13">
    <Button size="lg">Join Now →</Button>
    <Button variant="secondary" size="lg">Learn More</Button>
    <Button variant="ghost" size="lg">View Events</Button>
    <Button size="md">Medium Primary</Button>
    <Button variant="ghost" size="sm">Small Ghost</Button>
  </div>
  <div className="mt-f13 space-y-f8">
    <p className="text-caption">
      <code>variant</code>: primary · secondary · ghost
    </p>
    <p className="text-caption">
      <code>size</code>: sm (header) · md (standard) · lg (hero/page CTAs)
    </p>
    <p className="text-caption">
      Components: <code>Button</code> (button el) ·{" "}
      <code>ButtonLink</code> (Next Link) · <code>ButtonA</code> (anchor)
    </p>
  </div>
</div>
```

- [ ] **Step 3: Add form elements section**

After the "Elevation & Radius" subsection, add a new "Form Elements" section:

```tsx
{/* Form Elements */}
<section>
  <h2 className="text-overline text-cambridge mb-f21">Form Elements</h2>
  <div className="max-w-md space-y-f13">
    <div>
      <label className="block text-body-sm font-bold text-text-primary mb-f5">
        Text input (default)
      </label>
      <input
        type="text"
        placeholder="Placeholder text"
        className="
          w-full px-f13 py-f8
          bg-bg-secondary border border-border-primary
          rounded-[var(--radius-sm)]
          text-body-sm text-text-primary
          focus:outline-none focus:border-cambridge
          focus-visible:ring-2 focus-visible:ring-cambridge/40
          transition-colors
        "
      />
    </div>
    <div>
      <label className="block text-body-sm font-bold text-text-primary mb-f5">
        Select
      </label>
      <select
        className="
          w-full px-f13 py-f8
          bg-bg-secondary border border-border-primary
          rounded-[var(--radius-sm)]
          text-body-sm text-text-primary
          focus:outline-none focus:border-cambridge
          focus-visible:ring-2 focus-visible:ring-cambridge/40
          transition-colors
        "
      >
        <option value="">Select an option…</option>
        <option>Option A</option>
        <option>Option B</option>
      </select>
    </div>
    <div>
      <label className="block text-body-sm font-bold text-text-primary mb-f5">
        Textarea
      </label>
      <textarea
        rows={3}
        placeholder="Your message…"
        className="
          w-full px-f13 py-f8
          bg-bg-secondary border border-border-primary
          rounded-[var(--radius-sm)]
          text-body-sm text-text-primary
          focus:outline-none focus:border-cambridge
          focus-visible:ring-2 focus-visible:ring-cambridge/40
          transition-colors resize-none
        "
      />
    </div>
    <div>
      <label className="block text-body-sm font-bold text-text-primary mb-f5">
        Error state
      </label>
      <input
        type="email"
        defaultValue="notanemail"
        className="
          w-full px-f13 py-f8
          bg-bg-secondary border border-red-400
          rounded-[var(--radius-sm)]
          text-body-sm text-text-primary
          focus:outline-none focus:border-red-500
          transition-colors
        "
      />
      <p className="text-caption text-red-600 mt-f5">
        Please enter a valid email address.
      </p>
    </div>
  </div>
  <p className="text-caption mt-f21 text-text-tertiary max-w-md">
    Base form styles live in <code>@layer base</code> in globals.css.
    Component-level focus overrides (focus:border-cambridge, focus-visible:ring-*)
    are applied per-field and take precedence over the base layer.
  </p>
</section>
```

- [ ] **Step 4: Add shadow-cambridge to the Elevation section**

In the existing shadow demo (around line 316), add a fourth swatch:

```tsx
{ label: "shadow-cambridge", shadow: "var(--shadow-cambridge)" },
```

- [ ] **Step 5: Add Fibonacci spacing scale section**

After the "Stack" section at the bottom, add:

```tsx
{/* Spacing Scale */}
<section className="pb-8">
  <h2 className="text-overline text-cambridge mb-f21">Fibonacci Spacing Scale</h2>
  <p className="text-body text-text-secondary mb-f21 max-w-2xl">
    Every spatial value is a Fibonacci ordinal. Use as Tailwind utilities:{" "}
    <code>py-f89</code>, <code>gap-f34</code>, <code>mt-f21</code>, etc.
  </p>
  <div className="space-y-f8">
    {[
      { token: "f3",   px: "3px",   rem: "0.1875rem" },
      { token: "f5",   px: "5px",   rem: "0.3125rem" },
      { token: "f8",   px: "8px",   rem: "0.5rem" },
      { token: "f13",  px: "13px",  rem: "0.8125rem" },
      { token: "f21",  px: "21px",  rem: "1.3125rem" },
      { token: "f34",  px: "34px",  rem: "2.125rem" },
      { token: "f55",  px: "55px",  rem: "3.4375rem" },
      { token: "f89",  px: "89px",  rem: "5.5625rem" },
      { token: "f144", px: "144px", rem: "9rem" },
      { token: "f233", px: "233px", rem: "14.5625rem" },
    ].map(({ token, px, rem }) => (
      <div key={token} className="flex items-center gap-f21">
        <code className="text-caption w-16 shrink-0">{token}</code>
        <div
          className="h-4 bg-cambridge/40 rounded-sm shrink-0"
          style={{ width: px }}
        />
        <span className="text-caption text-text-tertiary">
          {px} / {rem}
        </span>
      </div>
    ))}
  </div>
</section>
```

- [ ] **Step 6: Commit**

```bash
git add src/app/design/page.tsx
git commit -m "design: update spec page — add Button demos, form elements, shadow-cambridge, spacing scale"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `--shadow-cambridge` token — Task 1
- [x] Form element base styles — Task 1
- [x] Button component — Task 2
- [x] CTA inconsistency / 4+ button sizes — Task 3
- [x] `font-semibold` without 600-weight — Task 5
- [x] Prose page Fibonacci spacing — Task 6
- [x] Admin/portal token adoption — Task 7
- [x] Design spec page updates — Task 8
- [x] `--radius-xl` — documented in Task 1 and Task 8 (use `rounded-[var(--radius-xl)]` syntax, no Tailwind bridge needed)
- [x] cambridge → accent in light mode: blog date labels — Task 4 includes `news/blog/page.tsx` shadow fixes; the `text-cambridge` on dates is a related issue. **Gap:** the plan doesn't explicitly fix `text-cambridge` on blog post date labels. Add note: on `src/app/news/blog/page.tsx` lines 94-96 and 138-140, replace `text-caption text-cambridge font-bold uppercase tracking-wider` with `text-caption text-text-tertiary font-bold uppercase tracking-wider` on date/author metadata (dates should read as muted tertiary, not accent orange in light mode).

**Placeholder scan:** No TBDs, all steps have concrete code.

**Type consistency:** `ButtonVariant`, `ButtonSize`, `buttonClass()` — names are consistent across Button.tsx and call sites.

---

## Execution Options

Plan saved. Two options:

**1. Subagent-Driven (recommended)** — dispatch one fresh subagent per task, review between each, fast iteration and rollback.

**2. Inline Execution** — execute tasks sequentially in this session using the executing-plans skill, with checkpoints between tasks.

Which approach?
