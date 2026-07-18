# Tasks

## Active

## Waiting On

## Someday

## Done

### 2026-07-17 — Full Audit Remediation (Round 1-6)

- [x] ~~**Task 1: Fix `.gitignore` to allow `.env.example`** — infra-agent (P0)~~
- [x] ~~**Task 2: Copy DATA_DICTIONARY.md to `data/`** — infra-agent (P0)~~
- [x] ~~**Task 3: Remove unused dependencies** — code-review-agent (P1)~~
- [x] ~~**Task 4: Add Occupancy index for `/api/occupancy/latest`** — infra-agent (P2)~~
- [x] ~~**Task 5: Fix error leakage in POST /api/query** — security-auditor-agent (P0)~~
- [x] ~~**Task 6: Add security headers to next.config.ts** — security-auditor-agent (P1)~~
- [x] ~~**Task 7: Add CSRF + body size limits** — security-auditor-agent (P1)~~
- [x] ~~**Task 8: Zod schema field allowlisting + date validation** — backend-agent (P1)~~
- [x] ~~**Task 9: Use Zod for occupancy params** — backend-agent (P1)~~
- [x] ~~**Task 10: mapFieldName throw on unknown** — backend-agent (P2)~~
- [x] ~~**Task 11: Fix `groupBy` unused in query route** — backend-agent (P0, functional bug)~~
- [x] ~~**Task 12: Fix `config.dataSource!` non-null assertion crash risk** — backend-agent (P1)~~
- [x] ~~**Task 13: Eliminate dual type system — delete `types.ts`, re-export from `schemas.ts`** — code-review-agent (P1)~~
- [x] ~~**Task 14: Type-safe Prisma model access** — backend-agent (P2)~~
- [x] ~~**Task 15: Extract shared DB config utility** — infra-agent (P2)~~
- [x] ~~**Task 16: Fix test imports to use `@/` alias** — code-review-agent (P2)~~
- [x] ~~**Task 17: Fix unused import in OpenAPI generation script** — code-review-agent (P2)~~
- [x] ~~**Task 18: Fix skip-to-content target focus** — ui-ux-agent (P0, a11y)~~
- [x] ~~**Task 19: Fix docs page dark mode** — ui-ux-agent (P1)~~
- [x] ~~**Task 20: Fix input/select focus rings** — ui-ux-agent (P1, a11y)~~
- [x] ~~**Task 21: Fix ThemeToggle hydration state** — ui-ux-agent (P1)~~
- [x] ~~**Task 22: Fix LoadingState Math.random() for deterministic widths** — ui-ux-agent (P2)~~
- [x] ~~**Task 23: Fix main page disabled button** — ui-ux-agent (P2)~~
- [x] ~~**Task 24: Add ARIA landmarks** — ui-ux-agent (P2, a11y)~~
- [x] ~~**Task 25: Create SeverityBadge component** — ui-ux-agent (P2)~~
- [x] ~~**Task 26: Add Zod schema tests** — testing-agent (P0)~~
- [x] ~~**Task 27: Add API handler integration tests** — testing-agent (P0)~~
- [x] ~~**Task 28: Add seed mapper tests** — testing-agent (P1)~~
- [x] ~~**Task 29: Add `buildQuery` missing branch tests** — testing-agent (P2)~~
- [x] ~~**Task 30: Add CI pipeline** — testing-agent (P2)~~
- [x] ~~**Task 31: Add `cn()` utility tests** — testing-agent (P3)~~
- [x] ~~**Task 32: Create initial Prisma migration** — infra-agent (P1)~~
- [x] ~~**Task 33: Update AGENTS.md path reference** — document-writer-agent (P3)~~

### 2026-07-17 — Phase 4 Frontend Build

- [x] ~~**Task 10: Zustand Dashboard Store** — frontend-agent~~
- [x] ~~**Task 11: DnD Canvas + CardPalette + DashboardCard** — frontend-agent~~
- [x] ~~**Task 12: CardConfigModal dynamic axis selection** — frontend-agent~~
- [x] ~~**Task 13: KPI Card + UI primitives** — frontend-agent~~
- [x] ~~**Task 14: BarChartCard** — frontend-agent~~
- [x] ~~**Task 15: LineChartCard with real-time clock** — frontend-agent~~
- [x] ~~**Task 16: GaugeCard SVG** — frontend-agent~~
- [x] ~~**Task 17: GlobalFilters component** — frontend-agent~~
- [x] ~~**Task 18: Navbar + StoreInitializer + layout wiring** — frontend-agent~~
- [x] ~~**Task 19: Floor Plan page with SVG overlays** — frontend-agent~~

### 2026-07-17 — Phase 5 Polish (PR #4)

Branch: `phase/5-polish`. Final UX polish + documentation pass (plan Task 23 + remaining spec gaps).

- [x] ~~**Severity color tokens** — `--color-severity-critical/-warning/-info` in `globals.css` :root, wired through Tailwind theme (`e26bfe2`, `9a7c5d3`)~~
- [x] ~~**Canonical severity colors** — applied critical/warning/info palette across dashboard components (`b73b37f`)~~
- [x] ~~**fadeIn keyframe animation** — opacity 0→1 + translateY 8px→0, applied on card add/remove (`e26bfe2`, `166d85e`)~~
- [x] ~~**`@media print` styles** — hide nav/filters/palette, reset min-width, `break-inside: avoid` on cards (`e26bfe2`)~~
- [x] ~~**Seed timestamps anchored to "now"** — relative offsets so UI renders live data (`4e889b2`, `0da6b9f`)~~
- [x] ~~**`alerts_events` API severity mapping** — `c974620`, `ed5bf1e`~~
- [x] ~~**ARCHITECTURE.md** — grounded in actual implementation, ~120 lines, covers state mgmt, data flow, DnD, dynamic axis, schema, SVG floor plan, security, testing, design decisions (`be234c8`)~~
- [x] ~~**Merge PR #4** — `f49cb02`~~

### 2026-07-17 — SSR Prefetch (PR #5)

Branch: `feature/ssr-prefetch`. Eliminates first-paint waterfall by prefetching default cards' data on the server.

- [x] ~~**`src/app/_prefetch.tsx`** — server component that prefetches every default card's query in parallel, dehydrates the React Query cache, and renders children inside `HydrationBoundary`~~
- [x] ~~**`force-dynamic` on root page** — avoids build hangs from static-render attempts (`fd93dd4`)~~
- [x] ~~**Non-fatal prefetch failures** — log + skip so a bad query doesn't break the page (`3950a51`)~~
- [x] ~~**Pinned query key shape + `fetchCardQuery` contract test** — (`389e4a8`)~~
- [x] ~~**Cleanup: remove useless spread in `fetchOccupancy` + unused interface** — (`a3ece82`)~~
- [x] ~~**Merge PR #5** — `b07b3a1`~~

### 2026-07-18 — Gauge ApexCharts Refactor (PR #6)

Branch: `feature/gauge-apexcharts`. Replaced custom SVG `radialBar` gauge with ApexCharts `radialBar` + needle.

- [x] ~~**ApexCharts deps** — added `apexcharts` + `react-apexcharts` (`e71500e`)~~
- [x] ~~**Gauge plan docs** — plan + test-count baselines aligned to current `main` (`80dc5f0`, `170826c`)~~
- [x] ~~**`computeGaugeFractions` helper** — range mapping (min/max/target) → 0–100, with `max===min` guard and clamp (`32a7cdf`)~~
- [x] ~~**ApexCharts `radialBar` swap** — pointer gauge, 60% hollow, gradient track, target annotation, label formatter (`c26456f`)~~
- [x] ~~**Needle shape + discrete color bands** — `shape: 'needle'`, green/yellow/red at 30/70 thresholds (`47c8033`)~~
- [x] ~~**Test: bump gauge chart spy `waitFor` to 5s for CI** — (`317123b`)~~
- [x] ~~**Plan update for needle shape + bands** — (`f83d392`)~~
- [x] ~~**Merge PR #6** — `35811b9`~~
- [x] ~~**Tests after refactor:** 166 passing across 27 test files (up from 120 / 18)~~
