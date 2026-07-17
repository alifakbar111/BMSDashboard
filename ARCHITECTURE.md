# Architecture Brief

## Overview

BMS Dashboard is a Next.js 16 App Router monolith that visualizes four building-management data domains — energy consumption, HVAC performance, occupancy, and alert events — through an interactive drag-and-drop card builder. All backend logic lives in Next.js Route Handlers under `src/app/api/`; the database is SQL Server 2022 (run via Docker Compose) accessed exclusively through Prisma 7 with the `@prisma/adapter-mssql` driver adapter. The frontend uses Zustand for client state (card layout + global filters), @tanstack/react-query for server state (card data), dnd-kit for the sortable canvas, and Recharts for chart rendering. There is no separate backend service or client-side CSV parsing — every byte of data flows through the API.

## State Management

Two complementary state layers keep client and server state cleanly separated:

- **Zustand — `useDashboardStore`** (`src/store/dashboard-store.ts`). Holds `cards[]` (the dashboard layout — each `DashboardCard` wraps a `CardConfig` plus width/height) and `filters` (the `GlobalFilters` object: `buildingId`, `floor`, `timeRange`, `customStart`, `customEnd`). Every mutating action (`addCard`, `removeCard`, `updateCardConfig`, `duplicateCard`, `resizeCard`, `reorderCards`, `setCards`) calls `saveToStorage()`, which persists `cards` to `localStorage` under the `bms-dashboard-layout` key. `setFilters` does **not** persist — filters are ephemeral session state.
- **Hydration** — `StoreInitializer` (`src/components/layout/StoreInitializer.tsx`) mounts as a client component and calls `loadFromStorage()` in a `useEffect`, repopulating `cards` after hydration to avoid SSR/localStorage mismatches. Parsing errors and private-browsing failures are swallowed.
- **React Query — server state** (`QueryProvider`, `src/components/layout/QueryProvider.tsx`). A single `QueryClient` is created via `useState` (stable across renders) with `staleTime: 30_000` and `retry: 1`. Each card component issues its own `useQuery` whose `queryKey` embeds both the full `CardConfig` and the live `filters` object (`queryKey: ["bar", config, filters]`). When a global filter changes, the `filters` reference updates, the query key changes, and React Query automatically refetches — no manual `useEffect` wiring is needed. Queries are `enabled` only once the required axes are set, so partially-configured cards don't fire requests.

## Data Flow: SQL Server → Card Rendering

```
CSV files (TechnicalTest/data/)
  │  prisma/seed.ts  (csv-parse, createMany)
  ▼
SQL Server 2022  ←  PrismaClient singleton (src/lib/prisma.ts)
  │                  @prisma/adapter-mssql driver adapter
  ▼
POST /api/query  (src/app/api/query/route.ts)
  │  1. QueryRequestBodySchema.safeParse()  — Zod validation
  │  2. buildQuery(config, globalFilters)  — query-builder.ts
  │     • buildWhereClause()  → Prisma `where`
  │     • mapFieldName()      → snake_case → camelCase, throws on unknown
  │     • select / orderBy / groupBy derived from card type + axes
  │  3. prismaModels[modelName].groupBy(...) or .findMany(...)
  │  4. KPI/Gauge → aggregate() server-side, return { data, aggregated }
  │     Bar/Line  → return raw rows (Bar groups, Line orders by x-axis asc)
  ▼
Card component  (useQuery → fetch POST /api/query)
  │  LoadingState / ErrorState / EmptyState guards
  ▼
Recharts (Bar/Line) or SVG gauge (Gauge) or numeric display (KPI)
```

- **KPI / Gauge** — the route runs server-side aggregation. `processQueryResult()` extracts numeric values from each row, applies `aggregate()` (sum/avg/min/max/count), rounds to 2 dp, and returns `{ data, aggregated }`. The card renders `aggregated` as a single value (KPI) or drives the SVG arc (Gauge).
- **Bar** — `buildQuery` adds the X-axis to `groupBy` so the route issues a Prisma `groupBy` with the configured aggregation (`_sum`/`_avg`/…). The nested Prisma result (e.g. `{ _sum: { energyKwh: 83.3 }, deviceType: "HVAC" }`) is flattened into `{ deviceType: "HVAC", energyKwh: 83.3 }` before returning. Recharts renders client-side.
- **Line** — X-axis is added to `orderBy` (asc) and `groupBy`; an optional series `groupBy` field adds a second grouping dimension. Rows are returned raw and rendered by Recharts, with a real-time clock `ReferenceLine` overlay.

## Drag-and-Drop

Implemented with `@dnd-kit/core` + `@dnd-kit/sortable` in `Canvas.tsx`:

- `DndContext` wraps the grid with `closestCenter` collision detection and two sensors — `PointerSensor` (8px activation distance to avoid hijacking clicks) and `KeyboardSensor` (for a11y, using `sortableKeyboardCoordinates`).
- `SortableContext` uses `verticalListSortingStrategy` over the `cardIds` array.
- Each `DashboardCard` calls `useSortable({ id: card.id })`, which supplies drag-handle listeners, transform styles, and transition classes. Cards sit in a responsive CSS grid (`grid-cols-1 md:grid-cols-2` with `auto-rows`).
- On `onDragEnd`, `handleDragEnd` resolves old/new indices from the `cardIds` memo and calls `reorderCards(oldIndex, newIndex)`. The store splices the array and persists to `localStorage` immediately.

## Dynamic Axis Binding

`CardConfigModal` (`src/components/dashboard/CardConfigModal.tsx`) is the configuration surface:

1. User opens the modal for a card and selects a **Data Source** from the four table names. Selecting a new source resets axis selections.
2. A `useEffect` fires `fetch("/api/columns?source=<table>")`, which returns the static `ColumnInfo[]` (column name, data type, `is_numeric`) defined in `columns/route.ts`. The modal splits these into numeric vs string lists.
3. Dropdowns are populated: **X-Axis** (all columns), **Y-Axis** (numeric only), **Aggregation** (sum/avg/min/max/count), **Group-By** (string columns, Line only), **Gauge params** (min/max/target, Gauge only), and an optional **Filter** (field/operator/value).
4. On Save, `updateCardConfig(id, partialConfig)` merges into the store, persists, and the card re-renders. Because `config` is now part of the React Query `queryKey`, the new configuration triggers an automatic refetch.

## Database Schema

Four Prisma models in `prisma/schema.prisma`, one per data domain:

| Model | `@@map` table | Indexed columns |
|-------|---------------|-----------------|
| `EnergyConsumption` | `energy_consumption` | `(buildingId, floor, zone, timestamp)`, `deviceId`, `timestamp` |
| `HvacPerformance` | `hvac_performance` | `(buildingId, floor, zone, timestamp)`, `unitId`, `timestamp` |
| `Occupancy` | `occupancy` | `(buildingId, floor, zone, timestamp)`, `(buildingId, floor, timestamp)`, `timestamp` |
| `AlertsEvent` | `alerts_events` | `(buildingId, floor, zone, timestamp)`, `severity`, `category`, `status`, `deviceId`, `timestamp` |

Field-level `@map("snake_case")` directives map camelCase Prisma fields to the snake_case SQL Server columns seeded from CSV. Optional fields (`deviceId?`, `resolvedAt?`, `acknowledgedBy?`) use nullable types. `prisma/seed.ts` reads CSVs with `csv-parse` (RFC 4180 compliant) and batch-inserts via `createMany` inside transactions.

The `PrismaClient` singleton (`src/lib/prisma.ts`) uses `@prisma/adapter-mssql`: connection config is parsed from `DATABASE_URL` by `parseConnectionUrl()` (`src/lib/db-config.ts`), the `PrismaMssql` adapter is passed to `new PrismaClient({ adapter, log })`, and the instance is cached on `globalThis` to survive Next.js HMR. Query logging is enabled in development. The generated client output is `src/generated/prisma/` (gitignored).

## SVG Floor Plan

The floor plan page (`src/app/floor-plan/page.tsx`) renders a static building/floor selector and fetches occupancy via React Query:

- `useQuery` with `queryKey: ["occupancy", buildingId, floor]` and `refetchInterval: 30_000` provides 30-second auto-refresh. A live status dot and "last updated" timestamp reflect `isFetching`/`dataUpdatedAt`.
- `GET /api/occupancy/latest?building_id=&floor=` returns the latest reading per zone (`getLatestPerZone` deduplicates by max timestamp).
- `FloorPlanSVG` renders a 600×420 viewBox with three predefined zone rectangles (`Zone-A` open workspace, `Zone-B` meeting rooms, `Zone-C` server room), a building outline, divider wall, and an in-SVG color legend.
- `ZoneOverlay` colors each zone by `occupancyRatePercent`: **green ≤40%**, **amber 40–75%**, **red >75%**. Data older than one hour (or absent) renders **gray with a diagonal hatch pattern** and a "NO DATA" badge, so stale zones are visually distinct from genuinely low-occupancy ones.
- Hover tooltips use a React-rendered `OccupancyTooltip` positioned via `pageX`/`pageY` from the mouse event (rendered outside the SVG for clean positioning).

## Security

- **Input validation** — all three API routes validate with Zod schemas (`src/lib/schemas.ts`): `QueryRequestBodySchema` (card config + global filters), `OccupancyQueryParamsSchema` (building_id + coerced floor int), and the columns route throws on unknown sources. `CardConfig`/`FilterConfig` fields are restricted to an allowlist (`VALID_FIELDS`), so arbitrary column names are never accepted.
- **No raw SQL** — every query goes through Prisma's `findMany`/`groupBy`. `mapFieldName()` translates snake_case CSV names to camelCase Prisma fields via a per-table map and **throws** on unknown fields, preventing injection through untrusted input.
- **HTTP hardening** — `next.config.ts` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and a `Content-Security-Policy` on all routes. The query route enforces CSRF origin checking and a 100 KB body size limit.
- **Error handling** — API error responses return generic messages ("Failed to execute query"); internals are only logged server-side, not leaked to clients.

## Testing

Vitest with jsdom is the test runner (120 tests across 18 files). Coverage spans:

- **Unit — business logic:** `aggregation.test.ts`, `query-builder.test.ts` (where/select/orderBy/groupBy + `mapFieldName` throw), `schemas.test.ts` (Zod validation accept/reject), `dashboard-store.test.ts` (19 tests covering card CRUD, filters, export/import, persistence), `utils.test.ts` (`cn()`).
- **Unit — components:** `GlobalFilters.test.tsx`, `LineChartCard.test.tsx`, `LineChartCard.tooltip.test.tsx`, `ThemeToggle.test.tsx`, `ZoneOverlay.test.tsx` (color thresholds + stale hatch + tooltip firing on no-data).
- **Integration — API routes:** `api-columns.test.ts` / `.integration.test.ts`, `api-occupancy.test.ts` / `.integration.test.ts`, `api-query.test.ts` (covering grouped bar aggregation, KPI aggregation, filters, and error paths against a stubbed Prisma).
- **Seed/prisma:** mapper tests for the seed script.

A GitHub Actions CI pipeline (`pnpm lint && pnpm test && pnpm build`) gates every push.

## Key Design Decisions

1. **No client-side CSV parsing** — per the spec, all data is fetched from backend API; the seed script is the only place CSVs are read.
2. **Static column metadata** — `GET /api/columns` returns a hardcoded `TABLE_COLUMNS` map rather than querying `INFORMATION_SCHEMA`. This avoids a DB round-trip per modal open, keeps the contract explicit, and simplifies testing.
3. **Zustand over Redux** — minimal API, first-class TypeScript, no boilerplate; sufficient for a single-page layout store with localStorage mirroring.
4. **Fair-grid layout with dnd-kit sortable** — a responsive CSS grid plus `verticalListSortingStrategy` reorders cards by array index rather than absolute pixel coordinates. Simpler than free-form DnD and guarantees consistent sizing.
5. **Custom SVG gauge** — a ~200-line SVG arc component (`GaugeSvg`) with value/target/min/max markers avoids pulling in a heavy gauge library for a single card type.
6. **Server-side aggregation for KPI/Gauge** — reduces payload to a single number; Bar/Line return rows because Recharts needs the series data client-side.
7. **Dual severity color systems** — CSS custom properties `--warning`/`--info` (theme tokens) and `--color-severity-critical/-warning/-info` (spec colors, red/orange/blue) coexist; the `SeverityBadge` component consumes the latter.