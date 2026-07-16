# UI/UX Audit Report

**Audit date:** 2026-07-16
**Agent:** `ui-ux-agent`
**Scope:** Visual design, dark mode, typography, responsiveness, loading/empty/error states, severity colors, accessibility, spec alignment
**Artifacts audited:** 15 files

---

## Overall Score: 35/100

| Dimension | Score | Weight | Weighted |
|---|---|---|---|
| Visual Design & Theme | 60 | 20% | 12 |
| Dark Mode | 90 | 10% | 9 |
| Typography | 20 | 15% | 3 |
| Responsiveness | 10 | 15% | 1.5 |
| Loading/Empty/Error States | 15 | 15% | 2.25 |
| Alert Severity Colors | 0 | 10% | 0 |
| Accessibility | 55 | 10% | 5.5 |
| Spec Alignment | 25 | 5% | 1.25 |
| **Total** | — | — | **34.5 / 100** |

---

## 1. Visual Design & Theme — 60/100

### Current State
Uses shadcn/ui's `radix-lyra` preset. Theme defined with OKLCH color values in `globals.css`.

### Findings

**1a. OKLCH color values — generally good**
- `--primary: oklch(0.852 0.199 91.936)` — a warm gold/amber
- Background/foreground pair: `oklch(1 0 0)` / `oklch(0.141 0.005 285.823)` — neutral gray-blue

**1b. Narrow chart color palette** ⚠️
- `--chart-1` through `--chart-5` are all teal/cyan (hue 181°→188°)
- Multi-series charts will be hard to read since all series look similar

**Fix:** Add distinct hues for multi-series readability:

```css
--chart-1: oklch(0.646 0.222 41.116);    /* Red */
--chart-2: oklch(0.6 0.118 184.704);      /* Teal */
--chart-3: oklch(0.398 0.07 227.392);     /* Blue */
--chart-4: oklch(0.828 0.189 84.429);     /* Yellow */
--chart-5: oklch(0.769 0.188 70.08);      /* Orange */
```

**1c. Border radius: `rounded-none` everywhere** ✅
- Every component explicitly uses `rounded-none` — intentional design choice for utilitarian facilities management dashboard.

**1d. No alert severity colors defined** 🔴
- Only `--destructive` (red) exists
- **Missing:** `--warning` (orange) and `--info` (blue)

**Fix:**
```css
:root {
  --warning: oklch(0.7 0.19 60);          /* Orange */
  --info: oklch(0.6 0.19 250);            /* Blue */
}
.dark {
  --warning: oklch(0.75 0.17 60);
  --info: oklch(0.65 0.16 250);
}
```

Register in `@theme inline`:
```css
--color-warning: var(--warning);
--color-info: var(--info);
```

---

## 2. Dark Mode — 90/100 ✅

- `next-themes` properly configured via `ThemeProvider.tsx`
- `ThemeProvider` in `layout.tsx` sets `attribute="class"`, `defaultTheme="system"`, `enableSystem` ✅
- `.dark` class overrides cover all 19 CSS variables ✅
- Dark variant: `@custom-variant dark (&:is(.dark *))` — correct for Tailwind v4 ✅

**No changes needed** for dark mode functionality.

---

## 3. Typography — 20/100 ❌

### [CRITICAL] `html { @apply font-mono }` is Wrong 🔴

**Location:** `globals.css:128`

```css
html {
  @apply font-mono;
}
```

This sets the **entire page** to monospace. Given the font setup:
- `--font-sans` = Geist Sans (body default)
- `--font-mono` = Geist Mono (code)
- `--font-heading` = IBM Plex Sans (headings)

The body should default to **sans-serif**. This appears to be a copy-paste error.

**Fix:**
```css
/* Before */
html { @apply font-mono; }

/* After */
html { @apply font-sans; }
```

**Impact: HIGH** — Affects the entire application's typographic identity.

### 3b. Font stack is correct ✅
Geist Sans (body), Geist Mono (code), IBM Plex Sans (headings) — all properly loaded via next/font.

### 3c. IBM Plex Sans applied to card titles ✅
`CardTitle` uses `font-heading` class — correctly applies IBM Plex Sans.

---

## 4. Responsiveness — 10/100 ❌

### Findings

**4a. No responsive layout patterns**
- `page.tsx` is a simple centered placeholder — no responsive grid, no sidebar, no breakpoints
- No `@container` queries (except `Card` which uses `@container/card-header`)
- No min-width constraint for 1280px

**4b. Spec requires 1280px minimum width** (TechnicalTest.md line 111)
No min-width constraint anywhere. On narrower screens, layout simply shrinks.

**Fix:**
```css
body {
  @apply min-w-[1280px];
}
```

Also build a responsive layout with sidebar + content area pattern.

---

## 5. Loading / Empty / Error States — 15/100 ❌

### Findings

**5a. Skeleton exists but unused**
- `skeleton.tsx` exists (13 lines) with basic `animate-pulse`
- No `LoadingState` or `LoadingCard` component
- No usage of `Skeleton` anywhere

**5b. No EmptyState component**
Spec requires (line 115): *"Empty states should guide the user to configure unconfigured cards."*
- Missing entirely

**5c. No ErrorState component**
- No error boundary or retry pattern exists

**5d. Placeholder text only**
- `page.tsx` just shows "Dashboard builder loading..." — not a proper loading state

**Fix — Create components:**

```tsx
// EmptyState
function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <h3 className="font-heading text-sm font-medium">{title}</h3>
      <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

// LoadingState — already partially implemented as LoadingState.tsx
// ErrorState — already partially implemented as ErrorState.tsx
```

---

## 6. Alert Severity Colors — 0/100 ❌

| Token | Status | File | Line |
|---|---|---|---|
| `--destructive` (Critical=red) | ✅ Defined | globals.css | 66, 101 |
| `--warning` (orange) | ❌ Missing | — | — |
| `--info` (blue) | ❌ Missing | — | — |

Spec requirement (line 112): *"Color scheme should differentiate alert severity levels (Critical = red, Warning = orange, Info = blue)"*

**Fix:** Add `--warning` and `--info` tokens (see §1d). Also create severity utility:

```tsx
const severityVariants = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  info: "bg-info/10 text-info border-info/20",
} as const;
```

---

## 7. Accessibility — 55/100

### Findings

**7a. Button ARIA patterns — good** ✅
- `aria-invalid`, `aria-expanded`, `data-disabled`, `focus-visible:ring`, `disabled:pointer-events-none`
- `Slot.Root` from Radix for `asChild` pattern

**7b. Focus indicators — too thin** ⚠️
- `focus-visible:ring-1 focus-visible:ring-ring/50` — ring is 1px
- WCAG 2.1 SC 2.4.7 recommends 2px minimum

**Fix:** Increase `focus-visible:ring-2`

**7c. Color contrast — likely OK** ✅
- Light: `oklch(1 0 0)` on `oklch(0.141 ...)` — ~15:1 ✅
- Muted: `oklch(0.552 ...)` on `oklch(0.967 ...)` — ~4.2:1 ✅
- Dark: `oklch(0.141 ...)` on `oklch(0.985 ...)` — ~15:1 ✅

**7d. Touch targets — below 44px** ⚠️
- Default button size `h-8` (32px) — below WCAG 2.5.5 recommended 44×44px

**7e. No skip-to-content link** ⚠️
- Layout has no skip navigation link for keyboard users

---

## 8. Spec Alignment for UI/UX — 25/100 ❌

| Requirement | Status | Evidence |
|---|---|---|
| Clean, professional UI for facilities management | 🟡 Partial | Components well-structured but no layout/sidebar/nav |
| Responsive at 1280px minimum | ❌ Missing | No min-width, no responsive grid |
| Alert severity colors | ❌ Missing | Only `destructive` (red) exists |
| Cards with clear title, metric, visualization | 🟡 Partial | Card components exist, but no children |
| Loading states | ❌ Missing | Skeleton exists but unused |
| Empty states guiding configuration | ❌ Missing | No EmptyState component |

### Bonus Points

| Requirement | Status |
|---|---|
| Dark mode toggle | 🟡 ThemeProvider wired, but no toggle button |
| Smooth animations for cards | ❌ Not implemented |
| Card resizing | ❌ Not implemented |

**Total spec alignment for UI/UX: ~25% complete**

---

## 9. Component-Level Issues

### button.tsx — Line 8
`rounded-none` explicit in base class. Fine architecturally but makes buttons very sharp.

### card.tsx — Line 15
Uses `ring-1 ring-foreground/10` for card borders — clean, subtle ✅

### dialog.tsx — Lines 34, 56
`backdrop-blur-xs` and `ring-1 ring-foreground/10` — consistent with card styling ✅

### select.tsx — Line 66
Animation classes `animate-in`, `fade-in-0`, `zoom-in-95` for open/close ✅

### tooltip.tsx — Lines 41, 47
Tooltip has arrow with `fill-foreground`. `max-w-xs` could be limiting ✅

---

## Priority Remediation

### P0 — Critical (blocking UI quality)

| # | Issue | Severity | File | Fix |
|---|-------|----------|------|-----|
| 1 | `html { @apply font-mono }` | 🔴 HIGH | `globals.css:128` | Change to `font-sans` |
| 2 | Missing `min-width: 1280px` | 🔴 HIGH | layout | Add to body |
| 3 | Missing `--warning` (orange) / `--info` (blue) | 🔴 HIGH | `globals.css` | Add CSS variables |
| 4 | No loading/empty/error states | 🔴 HIGH | Missing files | Create components |
| 5 | No main layout shell | 🔴 HIGH | Missing | Build sidebar + nav |

### P1 — High (affects UX quality)

| # | Issue | Severity | File | Fix |
|---|-------|----------|------|-----|
| 6 | No dark mode toggle button | 🟠 HIGH | Missing | Add to nav |
| 7 | Narrow chart color palette | 🟠 MEDIUM | `globals.css` | Widen hue range |
| 8 | Focus ring only 1px | 🟠 MEDIUM | `button.tsx` | Bump to 2px |
| 9 | Touch targets below 44px | 🟠 MEDIUM | `button.tsx` | Add min-h-11 |

### P2 — Medium (polish)

| # | Issue | Severity | File | Fix |
|---|-------|----------|------|-----|
| 10 | No responsive grid pattern | 🟡 MEDIUM | layout | Add grid |
| 11 | Skeleton unusable | 🟡 MEDIUM | `skeleton.tsx` | Apply to card dimensions |
| 12 | No skip-to-content link | 🟡 MEDIUM | `layout.tsx` | Add for keyboard users |
| 13 | No number formatting for large values | 🟢 LOW | cards | Add abbreviation |
