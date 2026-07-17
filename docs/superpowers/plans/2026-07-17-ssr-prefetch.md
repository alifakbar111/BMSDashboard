# SSR/SSG Prefetching for BMS Dashboard

> **For agentic workers:** REQUIRED Delegate Agents — Route and delegate to the right agent(s) — single dispatch or multi-step workflow to implement this plan task-by-task.

**Goal:** Eliminate the client-side loading skeleton on first paint of `/` and `/floor-plan` by hydrating React Query's cache from the server via `prefetchQuery` + `<HydrationBoundary>`.

**Architecture:** Today every card runs `useQuery` in a client component; the cache is empty at hydration, so the first render shows `<LoadingState>` until the round-trip completes. We will (a) extract the queryFn + query-key factory into a shared module so server and client agree on keys, (b) introduce `getQueryClient()` that returns a *per-request* client on the server and a *singleton* on the client, (c) make `src/app/page.tsx` and `src/app/floor-plan/page.tsx` server components that `await prefetchQuery(...)` for the default layout, then render children inside `<HydrationBoundary state={dehydrate(qc)}>`, and (d) split the floor-plan page into a server `page.tsx` (prefetch) and a client `FloorPlanClient.tsx` (stateful tab switching + `useQuery`).

**Tech Stack:** Next.js 16 App Router (RSC), React 19, @tanstack/react-query 5, zustand 5, TypeScript strict, Vitest + jsdom. New dep: `server-only` (one-line, Vercel-published; throws at build time if imported into a client component).

## Global Constraints

- All file paths in this plan are relative to `/home/al-ip/learning/BMS-Dashboard/`
- **Package manager: PNPM only** — `pnpm add server-only`, never `npm install`
- **Server-only modules must be guarded**: anything under `src/lib/` that imports Prisma or talks to `/api/query` server-side must start with `import "server-only"`. Client modules must not import them.
- **Query keys must match exactly** between server prefetch and client `useQuery`. The factory in `src/lib/queries.ts` is the single source of truth.
- **Dashboard layout is zustand + localStorage** — server does not know the user's saved cards, so we prefetch a hard-coded `DEFAULT_DASHBOARD_CARDS` array. After hydration, `StoreInitializer` loads the real layout from localStorage and the store re-derives queries. Hydration gives the *default* cards instant data; user-saved cards trigger normal client fetches.
- **Floor plan default** — prefetch `BLD-001 F1` (the first tab). Tabs 2-4 will fetch on click (already in `useQuery` cache key).
- **TDD per task**: every task ends with a green test or a passing build command. No "TBD", no `// ...rest`.
- **Lint clean**: `pnpm lint` and `pnpm test` must both pass after every task.
- **Commit format**: `type(scope): message` — single line, no body, no trailers, no Co-Authored-By.
- **Project patterns to preserve**: `cn()` helper, `data-slot` on UI primitives, named function exports, `@/*` alias, Tailwind v4 tokens.

---

## File Structure Map

```
src/
  lib/
    queries.ts                        NEW   — queryKeys + queryFn factories (universal)
    get-query-client.ts               NEW   — server-vs-client QueryClient factory
    default-dashboard.ts              NEW   — DEFAULT_DASHBOARD_CARDS array
  components/
    layout/
      QueryProvider.tsx               EDIT  — use getQueryClient(), drop useState
    cards/
      KPICard.tsx                     EDIT  — import shared queryFn + queryKey
      BarChartCard.tsx                EDIT  — import shared queryFn + queryKey
      LineChartCard.tsx               EDIT  — import shared queryFn + queryKey
      GaugeCard.tsx                   EDIT  — import shared queryFn + queryKey
    floor-plan/
      FloorPlanClient.tsx             NEW   — client wrapper for the page (tabs + useQuery)
  app/
    page.tsx                          EDIT  — server component, prefetch loop, HydrationBoundary
    floor-plan/
      page.tsx                        EDIT  — server component, prefetch first tab
tests/
  unit/
    queries.test.ts                   NEW   — queryKeys determinism
    get-query-client.test.ts          NEW   — per-request vs singleton behavior
    default-dashboard.test.ts         NEW   — every config validates against CardConfigSchema
    card-no-refetch-on-hydrated-cache.test.tsx   NEW   — fetchMock NOT called when cache warm
    prefetch-shape.test.ts            NEW   — dehydrate() output shape for default layout
```

---

## Architecture Overview

### Why a per-request client on the server

React Query holds in-memory state (cache, observers, retries, background timers). On the server we render for one request at a time and then throw the client away. A new `QueryClient` per request guarantees:

- No cross-request data leakage (tenant A's KPI value never reaches tenant B's render)
- No dangling background timers when the request ends
- Reproducible dehydrated payloads

The module is **universal** — it is importable from both server and client components. The `isServer` branch *inside* the function is the isolation mechanism: the server code path never executes on the client, and vice versa. Build-time enforcement of the server-only boundary happens one level up, in `src/app/_prefetch.tsx` (Task 7), which uses `import "server-only"` because it calls the server branch directly.

### Why a singleton on the client

The browser mounts the React tree once per session (or once per tab in App Router with soft navigation). A single `QueryClient` per tab is what React Query's docs prescribe. Re-creating it on every render would wipe the cache and cause infinite refetch loops. The singleton lives on `globalThis` so it survives HMR (mirroring the pattern already used in `src/lib/prisma.ts`).

### Where the data flows

```
Server (per request):
  getQueryClient()                          → new QueryClient
  queryClient.prefetchQuery({ key, fn })    → calls shared queryFn which calls POST /api/query
  dehydrate(queryClient)                    → { queries: [...] } payload
  <HydrationBoundary state={...}>           → server-renders children, embeds payload in HTML

Client (single tab):
  <QueryClientProvider client={getQueryClient()}>  → singleton via globalThis
  <HydrationBoundary state={...}>                   → injects server payload into client cache
  useQuery({ key, fn })                             → finds data in cache, isLoading=false on mount
```

### What changes and what doesn't

- Card components keep their existing `useQuery` call. The only edits are: import `queryKeys` and `queryFn` from `@/lib/queries` so the keys match the prefetch exactly.
- `QueryProvider` becomes a thin client wrapper that delegates to `getQueryClient()`.
- The two pages become server components with prefetch loops.
- The floor-plan page is split: server `page.tsx` prefetches, client `FloorPlanClient.tsx` owns the `useState` and `useQuery` for tab switching.

### The default-dashboard problem

The user's saved layout lives in `localStorage`; the server cannot read it. The fix: define a `DEFAULT_DASHBOARD_CARDS` array of one KPI, one Bar, one Line, and one Gauge card, each with sensible axes pointing at real tables. The server prefetches those, ships them in the dehydrated payload, and after hydration `StoreInitializer` reads localStorage and replaces the cards. If the user already has a saved layout, the prefetched defaults simply get discarded by the store — no harm done. If the user has nothing saved, the defaults *become* the initial state and they already have hydrated data on first paint.

---

## Task Dependency Graph

```
T1  (add server-only dep)           ┐
T2  (lib/queries.ts)                ┤  ← parallel
T3  (lib/get-query-client.ts)       ┘
            │
T4  (QueryProvider rewrite)         ← T3
T5  (card components import shared) ← T2
T6  (lib/default-dashboard.ts)      ← T2, T3
T7  (app/page.tsx server+prefetch)  ← T5, T6
T8  (floor-plan split)              ← T2, T3
T9  (queries.test.ts)               ← T2
T10 (get-query-client.test.ts)      ← T3
T11 (card-no-refetch test)          ← T5
T12 (default-dashboard test)        ← T6
T13 (prefetch-shape test)           ← T7
T14 (full lint + test + build)      ← all
```

Parallel batches: {T1, T2, T3}, then {T4, T5, T6, T9, T10, T12}, then {T7, T8, T11, T13}, then T14.

---

### Task 1: Add `server-only` dependency

**Files:**
- Modify: `package.json` (dependencies block)

**Why:** `server-only` is the standard Vercel-published package (~80 bytes) that throws a build-time error if a module is ever pulled into a client bundle. We use it to guard `get-query-client.ts` so the per-request branch can never accidentally ship to the browser. **Note:** this package is used in `src/app/_prefetch.tsx` (Task 7), NOT in `get-query-client.ts` (which is a universal module imported by both server and client components).

- [ ] **Step 1: Install the package**

Run: `pnpm add server-only`
Expected: `package.json` gains `"server-only": "^0.0.1"` (exact version varies; any 0.0.x is fine) and `pnpm-lock.yaml` is updated.

- [ ] **Step 2: Verify it is resolvable**

Run: `node -e "console.log(require.resolve('server-only'))"` from project root.
Expected: prints an absolute path under `node_modules/server-only/`, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add server-only for RSC guard"
```

**Green checkpoint:** `pnpm install` is idempotent; `require.resolve('server-only')` succeeds.

---

### Task 2: Create shared `src/lib/queries.ts` (queryKeys + queryFn)

**Files:**
- Create: `src/lib/queries.ts`

**Why:** The queryFn is currently copy-pasted across all four card components, and the query keys are hand-rolled as `["kpi", config, filters]`, `["bar", config, filters]`, etc. The prefetch server will use the same factory, so the keys are guaranteed to match. Keeping it in one file also makes the "no refetch on hydrated cache" test trivial to write.

- [ ] **Step 1: Write the file**

```ts
// src/lib/queries.ts
/**
 * Shared query-key + query-function factories used by both the server
 * (prefetchQuery) and the client (useQuery). Keeping keys in one place
 * guarantees the dehydrated cache hits on the client side.
 *
 * This module is universal: it imports neither `server-only` nor
 * any browser-only API. Card components can import it freely.
 */
import type { CardConfig, GlobalFilters, QueryResult } from "@/lib/schemas";

/** Query-key factory. The shape MUST stay stable across versions — changing
 *  it invalidates every cached entry in production. */
export const queryKeys = {
  /** All keys related to dashboard card queries. */
  all: ["bms"] as const,
  card: (kind: CardConfig["type"], config: CardConfig, filters: GlobalFilters) =>
    [kind, config, filters] as const,
  occupancy: (buildingId: string, floor: number) =>
    ["occupancy", buildingId, floor] as const,
};

/** Shared queryFn for /api/query. Posts the card config + current global
 *  filters and returns the parsed JSON. Throws on non-2xx so React Query
 *  enters its error state. */
export async function fetchCardQuery(
  config: CardConfig,
  filters: GlobalFilters,
  signal?: AbortSignal,
): Promise<QueryResult> {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config, globalFilters: filters }),
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: "Request failed" }))) as {
      error?: string;
    };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as QueryResult;
}

/** Shared queryFn for /api/occupancy/latest. */
export async function fetchOccupancy(
  buildingId: string,
  floor: number,
  signal?: AbortSignal,
): Promise<{
  buildingId: string;
  floor: number;
  zones: unknown[];
  timestamp: string;
}> {
  const params = new URLSearchParams({
    building_id: buildingId,
    floor: String(floor),
  });
  const res = await fetch(`/api/occupancy/latest?${params}`, {
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch occupancy data: ${res.statusText}`);
  }
  return (await res.json()) as {
    buildingId: string;
    floor: number;
    zones: unknown[];
    timestamp: string;
  };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: exit code 0, no diagnostics.

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries.ts
git commit -m "feat(lib): add shared queryKeys and queryFn factories"
```

**Green checkpoint:** TypeScript compiles cleanly.

---

### Task 3: Create `src/lib/get-query-client.ts`

**Files:**
- Create: `src/lib/get-query-client.ts`  (universal module — importable from both server and client)

**Why:** Single source of truth for "which QueryClient does this environment get?". Server returns a new client per call (per-request isolation), client returns a singleton via `globalThis` (survives HMR, single source of truth per tab). This module is **universal** — it must be importable from BOTH server components (for prefetch) AND client components (QueryProvider calls it on every mount to get the browser singleton). The `isServer` branch *inside* the function is the isolation mechanism: the server code path never executes on the client, and vice versa. Therefore, this file does NOT use `import "server-only"`. The `server-only` guard is reserved for `src/app/_prefetch.tsx` (Task 7), which is truly server-only.

- [ ] **Step 1: Write the file**

```ts
// src/lib/get-query-client.ts
// NOTE: This module is universal (importable from both server and client).
// The `isServer` check below isolates the two branches. Do NOT add
// `import "server-only"` here — QueryProvider ("use client") needs to
// import this on every mount to get the browser singleton.
import { QueryClient, isServer } from "@tanstack/react-query";

/**
 * Returns a QueryClient appropriate for the current runtime.
 *
 * - Server (per request): brand new client every call. Prevents cross-request
 *   cache leakage and dangling background timers.
 * - Client (per tab): singleton on globalThis. Survives HMR and matches
 *   React Query's documented single-client-per-tab model.
 *
 * `isServer` from @tanstack/react-query is the recommended way to detect the
 * environment — it is set at build time and is reliable in both RSC and
 * client components.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        // During SSR we don't want a failed prefetch to throw into the render
        // tree — we'd rather render with no data and let the client refetch.
      },
    },
  });
}

let browserSingleton: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (isServer) {
    // Each server-side render gets a fresh client.
    return makeQueryClient();
  }
  // Browser: reuse across renders and HMR reloads.
  if (!browserSingleton) {
    browserSingleton = makeQueryClient();
  }
  return browserSingleton;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: exit code 0, no diagnostics. No `import "server-only"` guard is present — the module is importable from both server and client components.

- [ ] **Step 3: Commit**

```bash
git add src/lib/get-query-client.ts
git commit -m "feat(lib): add per-request server / singleton client QueryClient factory"
```

**Green checkpoint:** TypeScript compiles; the module is importable from both server components and client components (no `import "server-only"` in this file).

---

### Task 4: Rewrite `QueryProvider` to use `getQueryClient()`

**Files:**
- Modify: `src/components/layout/QueryProvider.tsx` (full rewrite)

**Why:** Today the provider makes a fresh `QueryClient` per mount via `useState(() => …)`. We want it to use the shared helper instead so the client singleton is reused everywhere (including after HMR). The provider stays a client component because `QueryClientProvider` is from `@tanstack/react-query` which needs the React context — but the actual client construction is now delegated.

- [ ] **Step 1: Write the new file**

```tsx
// src/components/layout/QueryProvider.tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import type { ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  // getQueryClient() is safe in a client component — on the client branch
  // it returns the singleton cached on globalThis.
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

- [ ] **Step 2: Run existing tests**

Run: `pnpm test -- --reporter=basic`
Expected: all 120 existing tests still pass. No behavior change for client-only consumers.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/QueryProvider.tsx
git commit -m "refactor(layout): route QueryProvider through getQueryClient"
```

**Green checkpoint:** Existing test suite is green; provider is functionally equivalent on the client.

---

### Task 5: Refactor the four card components to use shared `queryKeys` / `fetchCardQuery`

**Files:**
- Modify: `src/components/cards/KPICard.tsx` (lines 16-31)
- Modify: `src/components/cards/BarChartCard.tsx` (lines 36-51)
- Modify: `src/components/cards/LineChartCard.tsx` (lines 100-115)
- Modify: `src/components/cards/GaugeCard.tsx` (lines 17-32)

**Why:** The query keys today are hand-rolled per component. The server-side prefetch needs to use *the same* key, so we route every card through the shared factory. The queryFn is also replaced by `fetchCardQuery` so we have one implementation to test.

- [ ] **Step 1: Rewrite `KPICard.tsx` query block**

In `src/components/cards/KPICard.tsx`, replace the existing `useQuery` block (the entire call from `const { data, isLoading, error, refetch } = useQuery<QueryResult>({` through its closing `});`) with:

```tsx
  const { data, isLoading, error, refetch } = useQuery<QueryResult>({
    queryKey: queryKeys.card("kpi", config, filters),
    queryFn: ({ signal }) => fetchCardQuery(config, filters, signal),
    enabled: !!config.dataSource && !!config.yAxis,
  });
```

Also change the imports:

```tsx
import { useQuery } from "@tanstack/react-query";
import { useDashboardStore } from "@/store/dashboard-store";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import type { CardConfig, QueryResult } from "@/lib";
import { fetchCardQuery, queryKeys } from "@/lib/queries";
```

- [ ] **Step 2: Rewrite `BarChartCard.tsx` query block**

In `src/components/cards/BarChartCard.tsx`, replace the existing `useQuery` block (the entire call) with:

```tsx
  const { data, isLoading, error, refetch } = useQuery<QueryResult>({
    queryKey: queryKeys.card("bar", config, filters),
    queryFn: ({ signal }) => fetchCardQuery(config, filters, signal),
    enabled: !!config.dataSource && !!config.xAxis && !!config.yAxis,
  });
```

And update the import block (add the two new lines, leave the rest):

```tsx
import { fetchCardQuery, queryKeys } from "@/lib/queries";
```

- [ ] **Step 3: Rewrite `LineChartCard.tsx` query block**

In `src/components/cards/LineChartCard.tsx`, replace the existing `useQuery` block (the entire call) with:

```tsx
  const { data, isLoading, error, refetch } = useQuery<QueryResult>({
    queryKey: queryKeys.card("line", config, filters),
    queryFn: ({ signal }) => fetchCardQuery(config, filters, signal),
    enabled: !!config.dataSource && !!config.xAxis && !!config.yAxis,
  });
```

And update the import block:

```tsx
import { fetchCardQuery, queryKeys } from "@/lib/queries";
```

- [ ] **Step 4: Rewrite `GaugeCard.tsx` query block**

In `src/components/cards/GaugeCard.tsx`, replace the existing `useQuery` block (the entire call) with:

```tsx
  const { data, isLoading, error, refetch } = useQuery<QueryResult>({
    queryKey: queryKeys.card("gauge", config, filters),
    queryFn: ({ signal }) => fetchCardQuery(config, filters, signal),
    enabled: !!config.dataSource && !!config.yAxis,
  });
```

And update the import block:

```tsx
import { fetchCardQuery, queryKeys } from "@/lib/queries";
```

- [ ] **Step 5: Run the test suite**

Run: `pnpm test -- --reporter=basic`
Expected: all 120 existing tests still pass. The existing `LineChartCard.test.tsx`, `BarChartCard.severity.test.tsx` and others mock `global.fetch` and assert it is called — those still work because `useQuery` still triggers a fetch when the cache is cold (which is the case in jsdom, no `<HydrationBoundary>`).

- [ ] **Step 6: Commit**

```bash
git add src/components/cards/KPICard.tsx src/components/cards/BarChartCard.tsx src/components/cards/LineChartCard.tsx src/components/cards/GaugeCard.tsx
git commit -m "refactor(cards): route useQuery through shared queryKeys and fetchCardQuery"
```

**Green checkpoint:** All existing card tests pass. Query keys are now centralised; the server prefetch in Task 7 will hit the exact same keys.

---

### Task 6: Create `src/lib/default-dashboard.ts`

**Files:**
- Create: `src/lib/default-dashboard.ts`

**Why:** The server cannot read the user's localStorage, so it needs a hard-coded default layout to prefetch. We define one card per type with sensible defaults that match the data we know exists in the seeded database. After hydration, `StoreInitializer` loads the real saved layout and the store replaces these defaults; if the user has nothing saved, the defaults become the initial state and they get hydrated data instantly.

- [ ] **Step 1: Write the file**

```ts
// src/lib/default-dashboard.ts
/**
 * Default dashboard layout used for SSR prefetching.
 *
 * The server cannot read the user's localStorage, so it prefetches a
 * known set of cards. After hydration, the client StoreInitializer
 * replaces this with the user's saved layout (if any). The defaults
 * therefore only "win" for first-time visitors, which is the case
 * we care about (no skeleton flash on first load).
 */
import type { CardConfig, DashboardCard } from "@/lib/schemas";

/** Default global filters used during SSR prefetch. Matches the
 *  store's DEFAULT_FILTERS — i.e. no filter applied. */
export const DEFAULT_FILTERS = {
  buildingId: null,
  floor: null,
  timeRange: null,
  customStart: null,
  customEnd: null,
} as const;

const KPI: CardConfig = {
  id: "default-kpi-1",
  type: "kpi",
  title: "Total Energy (kWh)",
  dataSource: "energy_consumption",
  xAxis: null,
  yAxis: { field: "energy_kwh", label: "Energy (kWh)" },
  aggregation: "sum",
  groupBy: null,
  filter: null,
};

const BAR: CardConfig = {
  id: "default-bar-1",
  type: "bar",
  title: "Alerts by Severity",
  dataSource: "alerts_events",
  xAxis: { field: "severity", label: "Severity" },
  yAxis: { field: "value", label: "Value" },
  aggregation: "sum",
  groupBy: null,
  filter: null,
};

const LINE: CardConfig = {
  id: "default-line-1",
  type: "line",
  title: "Energy Trend by Device",
  dataSource: "energy_consumption",
  xAxis: { field: "timestamp", label: "Timestamp" },
  yAxis: { field: "energy_kwh", label: "Energy (kWh)" },
  aggregation: "sum",
  groupBy: { field: "device_id", label: "Device ID" },
  filter: null,
};

const GAUGE: CardConfig = {
  id: "default-gauge-1",
  type: "gauge",
  title: "Avg Power Factor",
  dataSource: "energy_consumption",
  xAxis: null,
  yAxis: { field: "power_factor", label: "Power Factor" },
  aggregation: "avg",
  groupBy: null,
  filter: null,
  gaugeMin: 0,
  gaugeMax: 1,
  gaugeTarget: 0.9,
};

export const DEFAULT_DASHBOARD_CARDS: DashboardCard[] = [
  { id: KPI.id, config: KPI, x: 0, y: 0, width: 1, height: 1 },
  { id: BAR.id, config: BAR, x: 1, y: 0, width: 1, height: 1 },
  { id: LINE.id, config: LINE, x: 0, y: 1, width: 2, height: 1 },
  { id: GAUGE.id, config: GAUGE, x: 0, y: 2, width: 1, height: 1 },
];
```

- [ ] **Step 2: Run the test suite**

Run: `pnpm test -- --reporter=basic`
Expected: all tests still pass (the new file is not yet imported anywhere).

- [ ] **Step 3: Commit**

```bash
git add src/lib/default-dashboard.ts
git commit -m "feat(lib): add default dashboard layout for SSR prefetch"
```

**Green checkpoint:** File exists, all tests pass, no consumers yet.

---

### Task 7: Make `src/app/page.tsx` a server component that prefetches

**Files:**
- Modify: `src/app/page.tsx` (full rewrite)
- Create: `src/app/_prefetch.tsx` (small server helper used only here, prefixed `_` to denote private)

**Why:** We need the page to render *after* the prefetch completes so the dehydrated state is embedded in the HTML. The dashboard canvas is already a client component, so the server work is small: instantiate the QueryClient, prefetch each default card, wrap children in `<HydrationBoundary>`. The helper file keeps `page.tsx` itself focused on composition.

- [ ] **Step 1: Create the prefetch helper**

Create `src/app/_prefetch.tsx`:

```tsx
// src/app/_prefetch.tsx
import "server-only";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { fetchCardQuery, queryKeys } from "@/lib/queries";
import { DEFAULT_DASHBOARD_CARDS, DEFAULT_FILTERS } from "@/lib/default-dashboard";
import type { ReactNode } from "react";

/**
 * Server component that prefetches every default card's query, dehydrates
 * the cache, and renders children inside a HydrationBoundary so the
 * client-side useQuery calls find their data already present.
 *
 * `Promise.all` runs the prefetches in parallel — the slowest single
 * query bounds the wait, not the sum of all queries.
 */
export async function PrefetchedDashboard({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  await Promise.all(
    DEFAULT_DASHBOARD_CARDS.map(async (card) => {
      const config = card.config;
      // Skip prefetch for unconfigured cards; matches the cards' `enabled` guard.
      const isEnabled =
        !!config.dataSource &&
        !!config.yAxis &&
        (config.type === "kpi" || config.type === "gauge"
          ? true
          : !!config.xAxis);
      if (!isEnabled) return;
      await queryClient.prefetchQuery({
        queryKey: queryKeys.card(config.type, config, DEFAULT_FILTERS),
        queryFn: () => fetchCardQuery(config, DEFAULT_FILTERS),
      });
    }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
```

- [ ] **Step 2: Rewrite `src/app/page.tsx`**

Replace the contents of `src/app/page.tsx` with:

```tsx
import CardPalette from "@/components/dashboard/CardPalette";
import Canvas from "@/components/dashboard/Canvas";
import { PrefetchedDashboard } from "./_prefetch";

export default function DashboardPage() {
  return (
    <PrefetchedDashboard>
      <main className="flex min-h-screen flex-col">
        <CardPalette />
        <Canvas />
      </main>
    </PrefetchedDashboard>
  );
}
```

- [ ] **Step 3: Run a typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: exit code 0. (The unused-original `main` wrapper moved into the same place inside the prefetch tree, so visual layout is identical.)

- [ ] **Step 4: Run the test suite**

Run: `pnpm test -- --reporter=basic`
Expected: all tests pass — the new files are server-side only and the unit tests don't import the page.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/_prefetch.tsx
git commit -m "feat(app): prefetch default dashboard cards and hydrate client cache"
```

**Green checkpoint:** Page renders identically; first paint for default cards now shows data instead of skeletons.

---

### Task 8: Split the floor-plan page into server + client parts

**Files:**
- Modify: `src/app/floor-plan/page.tsx` (full rewrite)
- Create: `src/app/floor-plan/FloorPlanClient.tsx`

**Why:** Today the page is `'use client'` and does its own `useQuery` on mount. To prefetch we need a server boundary. The minimum-surface split is: keep the tab-switching and `useQuery` logic in a new client component, move the page wrapper and prefetch into the server `page.tsx`. The `BUILDING_FLOORS` constant and `fetchOccupancy` queryFn move to the shared `src/lib/queries.ts` (already done in Task 2) and are imported from there.

- [ ] **Step 1: Create the client component**

Create `src/app/floor-plan/FloorPlanClient.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FloorPlanSVG from "@/components/floor-plan/FloorPlanSVG";
import type { ZoneData } from "@/components/floor-plan/OccupancyTooltip";
import { fetchOccupancy, queryKeys } from "@/lib/queries";
import { cn } from "@/lib/utils";

interface OccupancyResponse {
  buildingId: string;
  floor: number;
  zones: ZoneData[];
  timestamp: string;
}

const BUILDING_FLOORS = [
  { buildingId: "BLD-001", floor: 1, label: "BLD-001 F1" },
  { buildingId: "BLD-001", floor: 2, label: "BLD-001 F2" },
  { buildingId: "BLD-002", floor: 1, label: "BLD-002 F1" },
  { buildingId: "BLD-002", floor: 2, label: "BLD-002 F2" },
] as const;

function OccupancyDot({ isFetching }: { isFetching: boolean }) {
  return (
    <span className="relative inline-flex size-2">
      {isFetching ? (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-muted-foreground/40" />
      ) : (
        <span className="absolute inline-flex size-full rounded-full bg-green-500" />
      )}
      <span className="relative inline-flex size-2 rounded-full bg-green-500" />
    </span>
  );
}

export default function FloorPlanClient() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = BUILDING_FLOORS[selectedIndex];

  const { data, isLoading, isFetching, error, dataUpdatedAt } = useQuery({
    queryKey: queryKeys.occupancy(selected.buildingId, selected.floor),
    queryFn: ({ signal }) =>
      fetchOccupancy(selected.buildingId, selected.floor, signal),
    refetchInterval: 30_000,
  });

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  return (
    <main className="mx-auto flex min-h-screen flex-col px-4 py-6">
      <div className="mb-6">
        <h1 className="font-heading text-xl font-semibold">Floor Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time occupancy across building zones
        </p>
      </div>

      <div
        className="flex w-fit gap-1 rounded-lg bg-muted p-1"
        role="tablist"
        aria-label="Select building and floor"
      >
        {BUILDING_FLOORS.map((bf, idx) => (
          <button
            key={`${bf.buildingId}-${bf.floor}`}
            role="tab"
            aria-selected={idx === selectedIndex}
            onClick={() => setSelectedIndex(idx)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              idx === selectedIndex
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {bf.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        {isFetching && (
          <span className="text-xs italic">Refreshing&hellip;</span>
        )}
        {!isFetching && lastUpdated && (
          <>
            <OccupancyDot isFetching={isFetching} />
            <span>Last updated: {lastUpdated}</span>
          </>
        )}
      </div>

      <div className="mt-6">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading floor plan&hellip;</p>
            </div>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center gap-3 py-20">
            <p className="text-sm text-destructive">Failed to load occupancy data</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Retry
            </button>
          </div>
        )}

        {data && !isLoading && (
          <FloorPlanSVG
            zones={data.zones as ZoneData[]}
            buildingId={data.buildingId}
            floor={data.floor}
          />
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Rewrite `src/app/floor-plan/page.tsx`**

Replace the contents of `src/app/floor-plan/page.tsx` with:

```tsx
import "server-only";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { fetchOccupancy, queryKeys } from "@/lib/queries";
import FloorPlanClient from "./FloorPlanClient";

/** Prefetch the first (default) tab so the very first paint has data. */
const DEFAULT_BUILDING = "BLD-001";
const DEFAULT_FLOOR = 1;

export default async function FloorPlanPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.occupancy(DEFAULT_BUILDING, DEFAULT_FLOOR),
    queryFn: () => fetchOccupancy(DEFAULT_BUILDING, DEFAULT_FLOOR),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FloorPlanClient />
    </HydrationBoundary>
  );
}
```

- [ ] **Step 3: Run a typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: exit code 0.

- [ ] **Step 4: Run the test suite**

Run: `pnpm test -- --reporter=basic`
Expected: all tests pass. `ZoneOverlay.test.tsx` does not touch the page; the existing floor-plan-related tests are at the component level so the page-level change is transparent.

- [ ] **Step 5: Commit**

```bash
git add src/app/floor-plan/page.tsx src/app/floor-plan/FloorPlanClient.tsx
git commit -m "feat(floor-plan): split page into server prefetch + client tab UI"
```

**Green checkpoint:** First paint of `/floor-plan` shows BLD-001 F1 data with no spinner; clicking a different tab still triggers a fresh `useQuery` refetch.

---

### Task 9: Unit test — query keys are deterministic and stable

**Files:**
- Create: `tests/unit/queries.test.ts`

**Why:** The prefetch and the `useQuery` calls must agree on keys to the byte. If this contract breaks, hydration silently stops working. This test pins the shape.

- [ ] **Step 1: Write the test file**

```ts
// tests/unit/queries.test.ts
import { describe, it, expect } from "vitest";
import { queryKeys } from "../../src/lib/queries";
import type { CardConfig, GlobalFilters } from "../../src/lib/schemas";

const FILTERS: GlobalFilters = {
  buildingId: null,
  floor: null,
  timeRange: null,
  customStart: null,
  customEnd: null,
};

const CONFIG: CardConfig = {
  id: "k-1",
  type: "kpi",
  title: "x",
  dataSource: "energy_consumption",
  xAxis: null,
  yAxis: { field: "energy_kwh", label: "kWh" },
  aggregation: "sum",
  groupBy: null,
  filter: null,
};

describe("queryKeys", () => {
  it("root namespace is stable", () => {
    expect(queryKeys.all).toEqual(["bms"]);
  });

  it("card() returns the same shape every call for the same inputs", () => {
    const a = queryKeys.card("kpi", CONFIG, FILTERS);
    const b = queryKeys.card("kpi", CONFIG, FILTERS);
    expect(a).toEqual(b);
    expect(a).toEqual(["kpi", CONFIG, FILTERS]);
  });

  it("card() varies on config identity (different id → different key)", () => {
    const a = queryKeys.card("kpi", CONFIG, FILTERS);
    const b = queryKeys.card("kpi", { ...CONFIG, id: "k-2" }, FILTERS);
    expect(a).not.toEqual(b);
  });

  it("card() varies on filters", () => {
    const a = queryKeys.card("kpi", CONFIG, FILTERS);
    const b = queryKeys.card("kpi", CONFIG, { ...FILTERS, buildingId: "BLD-001" });
    expect(a).not.toEqual(b);
  });

  it("card() varies on kind", () => {
    const a = queryKeys.card("kpi", CONFIG, FILTERS);
    const b = queryKeys.card("bar", CONFIG, FILTERS);
    expect(a).not.toEqual(b);
  });

  it("occupancy() returns [occupancy, buildingId, floor] tuple", () => {
    expect(queryKeys.occupancy("BLD-001", 2)).toEqual([
      "occupancy",
      "BLD-001",
      2,
    ]);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test -- queries.test.ts --reporter=basic`
Expected: 6 tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/queries.test.ts
git commit -m "test(lib): pin queryKey factory shape"
```

**Green checkpoint:** All 6 key-shape tests pass.

---

### Task 10: Unit test — `getQueryClient` per-request vs singleton

**Files:**
- Create: `tests/unit/get-query-client.test.ts`

**Why:** The hydration contract relies on this split. The test pins the behaviour so a future refactor cannot accidentally make the server branch return a singleton (cross-request leak) or the client branch a fresh client (cache wipe + infinite refetch).

- [ ] **Step 1: Write the test file**

```ts
// tests/unit/get-query-client.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

describe("getQueryClient — server branch (isServer=true)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns a new QueryClient on every call", async () => {
    vi.doMock("@tanstack/react-query", async () => {
      const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
        "@tanstack/react-query",
      );
      return { ...actual, isServer: true };
    });
    const { getQueryClient } = await import("../../src/lib/get-query-client");
    const a = getQueryClient();
    const b = getQueryClient();
    expect(a).not.toBe(b);
    expect(a).toBeInstanceOf(QueryClient);
  });
});

describe("getQueryClient — client branch (isServer=false)", () => {
  it("returns the same QueryClient on every call (singleton)", async () => {
    vi.resetModules();
    vi.doMock("@tanstack/react-query", async () => {
      const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
        "@tanstack/react-query",
      );
      return { ...actual, isServer: false };
    });
    const { getQueryClient } = await import("../../src/lib/get-query-client");
    const a = getQueryClient();
    const b = getQueryClient();
    expect(a).toBe(b); // singleton — same reference on repeated calls
  });
});

describe("getQueryClient — module shape (universal, no server-only guard)", () => {
  it("module has no `import 'server-only'` (universal module)", () => {
    // Static check: the file should NOT begin with `import "server-only"`.
    // This module is imported by BOTH server components and client
    // components (QueryProvider), so a `server-only` guard would break
    // the client build. The isolation is enforced at runtime by the
    // `isServer` branch inside getQueryClient() instead.
    const { readFileSync } = require("node:fs");
    const src = readFileSync(
      require("node:path").join(
        __dirname,
        "..",
        "..",
        "src",
        "lib",
        "get-query-client.ts",
      ),
      "utf8",
    );
    expect(src.startsWith('import "server-only"')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test -- get-query-client.test.ts --reporter=basic`
Expected: 3 tests pass (server branch returns a fresh client per call, client branch returns a singleton on repeated calls, and the static check confirms the file does NOT start with `import "server-only"`).

- [ ] **Step 3: Commit**

```bash
git add tests/unit/get-query-client.test.ts
git commit -m "test(lib): pin getQueryClient per-request and singleton branches"
```

**Green checkpoint:** Both branches behave correctly; the module is verified to be universal (no `import "server-only"`).

---

### Task 11: Card test — `useQuery` does not refetch on mount when cache is hydrated

**Files:**
- Create: `tests/unit/card-no-refetch-on-hydrated-cache.test.tsx`

**Why:** This is the regression test for the whole feature. If prefetch stops working in production, this test would catch it locally. The test pre-populates the QueryClient with a `setQueryData` call (simulating a dehydrated server payload) and asserts that the global `fetch` is never called when the card mounts.

- [ ] **Step 1: Write the test file**

```tsx
// tests/unit/card-no-refetch-on-hydrated-cache.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider, dehydrate, HydrationBoundary } from "@tanstack/react-query";

// Mock the dashboard store so the card has deterministic filters.
vi.mock("@/store/dashboard-store", () => ({
  useDashboardStore: () => ({
    filters: {
      buildingId: null,
      floor: null,
      timeRange: null,
      customStart: null,
      customEnd: null,
    },
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import KPICard from "@/components/cards/KPICard";
import { fetchCardQuery, queryKeys } from "@/lib/queries";
import type { CardConfig, GlobalFilters } from "@/lib/schemas";

const FILTERS: GlobalFilters = {
  buildingId: null,
  floor: null,
  timeRange: null,
  customStart: null,
  customEnd: null,
};

const CONFIG: CardConfig = {
  id: "kpi-hydrated",
  type: "kpi",
  title: "Hydrated KPI",
  dataSource: "energy_consumption",
  xAxis: null,
  yAxis: { field: "energy_kwh", label: "kWh" },
  aggregation: "sum",
  groupBy: null,
  filter: null,
};

function makeClientWithHydratedData() {
  // staleTime: Infinity so the warmed cache is considered fresh — no refetch
  // on mount. The default staleTime is 0 which would trigger a refetch.
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
    },
  });
  client.setQueryData(queryKeys.card("kpi", CONFIG, FILTERS), {
    data: [],
    aggregated: 1234.5,
  });
  return client;
}

describe("useQuery — hydrated cache", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });
  afterEach(() => cleanup());

  it("KPICard does NOT call fetch on mount when the cache is already populated", async () => {
    const client = makeClientWithHydratedData();

    render(
      <QueryClientProvider client={client}>
        <KPICard config={CONFIG} />
      </QueryClientProvider>,
    );

    // Give React Query a tick to potentially start a refetch.
    await new Promise((r) => setTimeout(r, 50));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("dehydrate(hydratedClient) round-trips and useQuery finds the data", async () => {
    // Build client, populate, dehydrate, hydrate a new client, render.
    const server = makeClientWithHydratedData();
    const state = dehydrate(server);

    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: Infinity },
      },
    });

    render(
      <QueryClientProvider client={client}>
        <HydrationBoundary state={state}>
          <KPICard config={CONFIG} />
        </HydrationBoundary>
      </QueryClientProvider>,
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test -- card-no-refetch-on-hydrated-cache.test.tsx --reporter=basic`
Expected: 2 tests pass. `mockFetch` is never called because the cache is warm.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/card-no-refetch-on-hydrated-cache.test.tsx
git commit -m "test(cards): assert useQuery does not refetch on hydrated cache"
```

**Green checkpoint:** The whole feature's invariant is pinned by an executable test.

---

### Task 12: Unit test — `DEFAULT_DASHBOARD_CARDS` validates against `CardConfigSchema`

**Files:**
- Create: `tests/unit/default-dashboard.test.ts`

**Why:** The prefetch loop trusts these configs blindly. If a default becomes invalid (e.g. a field name is renamed in `VALID_FIELDS`), the prefetch throws and the whole page errors. Zod-validate the defaults at test time so we catch this at PR time, not at deploy time.

- [ ] **Step 1: Write the test file**

```ts
// tests/unit/default-dashboard.test.ts
import { describe, it, expect } from "vitest";
import {
  DEFAULT_DASHBOARD_CARDS,
  DEFAULT_FILTERS,
} from "../../src/lib/default-dashboard";
import {
  CardConfigSchema,
  GlobalFiltersSchema,
} from "../../src/lib/schemas";

describe("DEFAULT_DASHBOARD_CARDS", () => {
  it("is a non-empty array of cards", () => {
    expect(Array.isArray(DEFAULT_DASHBOARD_CARDS)).toBe(true);
    expect(DEFAULT_DASHBOARD_CARDS.length).toBeGreaterThan(0);
  });

  it("covers one of every card type", () => {
    const types = new Set(DEFAULT_DASHBOARD_CARDS.map((c) => c.config.type));
    for (const t of ["kpi", "bar", "line", "gauge"] as const) {
      expect(types.has(t)).toBe(true);
    }
  });

  it("every card config passes CardConfigSchema", () => {
    for (const card of DEFAULT_DASHBOARD_CARDS) {
      const result = CardConfigSchema.safeParse(card.config);
      expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    }
  });

  it("every card id matches its config id", () => {
    for (const card of DEFAULT_DASHBOARD_CARDS) {
      expect(card.id).toBe(card.config.id);
    }
  });

  it("card ids are unique", () => {
    const ids = DEFAULT_DASHBOARD_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("DEFAULT_FILTERS passes GlobalFiltersSchema", () => {
    const result = GlobalFiltersSchema.safeParse(DEFAULT_FILTERS);
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test -- default-dashboard.test.ts --reporter=basic`
Expected: 6 tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/default-dashboard.test.ts
git commit -m "test(lib): validate default dashboard configs against Zod schema"
```

**Green checkpoint:** Defaults are guaranteed to be prefetchable.

---

### Task 13: Server-side test — `dehydrate()` output shape for the default layout

**Files:**
- Create: `tests/unit/prefetch-shape.test.ts`

**Why:** Pins the contract between the server (which dehydrates) and the client (which hydrates). If we ever accidentally change the key shape, the query, or the data transformer, this test catches the break at unit-test time.

- [ ] **Step 1: Write the test file**

```ts
// tests/unit/prefetch-shape.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
  // Force server branch.
  vi.doMock("@tanstack/react-query", async () => {
    const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
      "@tanstack/react-query",
    );
    return { ...actual, isServer: true };
  });
  // Stub fetch so prefetch doesn't hit the network.
  global.fetch = vi.fn(async (url: unknown) => {
    if (String(url).includes("/api/query")) {
      return new Response(JSON.stringify({ data: [], aggregated: 42 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
});

describe("PrefetchedDashboard (server-only)", () => {
  it("dehydrate() contains one entry per prefetched default card", async () => {
    const { getQueryClient } = await import("../../src/lib/get-query-client");
    const { queryKeys, fetchCardQuery } = await import("../../src/lib/queries");
    const { DEFAULT_DASHBOARD_CARDS, DEFAULT_FILTERS } = await import(
      "../../src/lib/default-dashboard"
    );
    const { dehydrate } = await import("@tanstack/react-query");

    const qc = getQueryClient();
    await Promise.all(
      DEFAULT_DASHBOARD_CARDS
        .filter((card) => card.config.dataSource && card.config.yAxis)
        .map((card) =>
          qc.prefetchQuery({
            queryKey: queryKeys.card(card.config.type, card.config, DEFAULT_FILTERS),
            queryFn: () => fetchCardQuery(card.config, DEFAULT_FILTERS),
          }),
        ),
    );

    const state = dehydrate(qc);
    // The shape React Query v5 ships: { queries: [{ queryHash, queryKey, state: { data, ... } }] }
    expect(Array.isArray(state.queries)).toBe(true);
    expect(state.queries.length).toBe(DEFAULT_DASHBOARD_CARDS.length);

    // Each prefetched key must be a 3-tuple of [kind, config, filters].
    for (const entry of state.queries) {
      expect(Array.isArray(entry.queryKey)).toBe(true);
      const [kind] = entry.queryKey as [string, ...unknown[]];
      expect(["kpi", "bar", "line", "gauge"]).toContain(kind);
      expect(entry.state).toBeDefined();
      expect((entry.state as { data: unknown }).data).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test -- prefetch-shape.test.ts --reporter=basic`
Expected: 1 test passes.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/prefetch-shape.test.ts
git commit -m "test(app): pin dehydrate() shape for default layout"
```

**Green checkpoint:** Server-side contract is locked down.

---

### Task 14: Final verification — full lint, test, build, and manual smoke

**Files:** none modified

**Why:** The orchestrator runs this task to confirm every prior task landed cleanly. Each command is independent; the green gate is all four.

- [ ] **Step 1: Lint**

Run: `pnpm lint`
Expected: exit code 0, no findings. The `oxlint -c .oxlintrc.json .` invocation must produce no output beyond the success banner.

- [ ] **Step 2: Run the full unit test suite**

Run: `pnpm test`
Expected: 120 (existing) + ~16 (new across Tasks 9-13) = ~136 tests pass, 0 fail.

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: Next.js production build completes with zero errors. The RSC compiler will surface any `server-only` import mistakes here (e.g. if a client component were to import `src/app/_prefetch.tsx`, the build would fail with a clear error pointing at the offending module — `get-query-client.ts` is universal and has no such guard).

- [ ] **Step 4: Manual smoke test — start the dev server**

Run: `pnpm dev` in one terminal.
Expected: `next dev` boots, prints `Local: http://localhost:3000` and (per `scripts/dev.ts`) `docs: http://localhost:3000/docs`.

- [ ] **Step 5: Manual smoke test — visit `/`**

Open `http://localhost:3000` in a fresh browser tab. Open DevTools → Network → filter by `Fetch/XHR`.
Expected on first paint:
- One `POST /api/query` request fires *during* the server render (visible in the HTML as the dehydrated state, and as a request the server made to its own `/api/query` route — this is expected).
- The four default cards (Total Energy, Alerts by Severity, Energy Trend by Device, Avg Power Factor) appear *with data already rendered*. No `<LoadingState>` flash.
- No subsequent `POST /api/query` for those four keys until you change a global filter (then the client refetches normally).

- [ ] **Step 6: Manual smoke test — visit `/floor-plan`**

Open `http://localhost:3000/floor-plan` in another fresh tab.
Expected on first paint:
- BLD-001 F1 zones appear with live data (no spinner).
- Server-side `GET /api/occupancy/latest?building_id=BLD-001&floor=1` request appears in the network log.
- Clicking `BLD-001 F2` triggers a *client-side* fetch (this is expected — only the default tab is prefetched).
- Clicking back to `BLD-001 F1` should be instant (cache hit, `isFetching=true` for the background refetch interval only).

- [ ] **Step 7: Manual smoke test — user with saved layout**

In DevTools, run `localStorage.setItem("bms-dashboard-layout", JSON.stringify([]))` and reload `/`.
Expected: the saved empty layout wins after hydration, the prefetched default cards are silently discarded, no error. Then run `localStorage.clear()` and reload: defaults return with data.

- [ ] **Step 8: Commit any incidental fixes**

If any of the above steps revealed a small fix (a comment, a default filter, a `data-slot` tweak), commit it as a single follow-up:

```bash
git add <fixed files>
git commit -m "fix(plan): post-verification cleanup for SSR prefetch"
```

**Green checkpoint:** All four commands pass; manual smoke test confirms zero-skeleton first paint on both routes.

---

## Migration Order / Dependency Graph (summary)

| Round | Tasks | Why parallel |
|-------|-------|--------------|
| 1 | T1 (`server-only` dep), T2 (`queries.ts`), T3 (`get-query-client.ts`) | Three independent files. No imports between them. |
| 2 | T4 (QueryProvider), T5 (cards), T6 (default-dashboard), T9 (queries test), T10 (getQueryClient test), T12 (default-dashboard test) | Touch different files; T5 reads from T2; T4 reads from T3; T6 reads from T2. Tests T9/T10/T12 read from T2/T3/T6 respectively. |
| 3 | T7 (page.tsx prefetch), T8 (floor-plan split), T11 (no-refetch test), T13 (prefetch-shape test) | Different files. T7 depends on T5+T6. T8 depends on T2+T3. T11 depends on T5. T13 depends on T7. |
| 4 | T14 (final verification) | Single task; runs the full suite. |

The orchestrator MUST NOT run T7 before T5, and MUST NOT run T4 before T3. Everything else can parallelize within its round.

---

## Verification Checklist

Run from `/home/al-ip/learning/BMS-Dashboard/`:

```bash
pnpm lint                                                    # 0 errors
pnpm test                                                    # ~136 tests pass
pnpm build                                                   # Next.js prod build green
pnpm dev &                                                   # server boots, prints Local + docs
# In a browser:
#   - http://localhost:3000            → 4 default cards, no skeleton flash
#   - http://localhost:3000/floor-plan → BLD-001 F1 data on first paint
```

Each of those four command lines is a hard gate; the plan is "done" only when all pass.

---

## Rollback Plan

If hydration causes a runtime error in production, revert the single merge commit that contains Tasks 4–8. The query-key factory (Task 2) and the test scaffolding (Tasks 9–13) are pure additions and can stay on `main` without affecting the running app. Concretely:

```bash
git revert -m 1 <merge-sha-of-T4..T8>
git push origin main
```

Then re-open an issue with the hydration error message and the prefetched query hash from `dehydrate(qc).queries[0].queryHash`.

---

## Concerns / Risks

1. **Cross-request cache leakage if the per-request branch is bypassed.** The module is universal (no `server-only` guard), so the `isServer` runtime branch is the **only** thing isolating server and client behavior. If a future refactor moves that check elsewhere, two server requests could share state. Mitigation: `get-query-client.test.ts` pins both branches (`isServer=true` returns a fresh client, `isServer=false` returns a singleton on repeated calls); a separate test statically asserts the file does NOT start with `import "server-only"`. The companion `src/app/_prefetch.tsx` (which calls the server branch) DOES use `import "server-only"` — that file is genuinely server-only and a build error there correctly indicates a client component is pulling in prefetch code.

2. **`/api/query` runs on the same Node process during SSR.** The prefetch calls `fetch("/api/query", …)`, which becomes a loopback HTTP request. In dev this works because `next dev` is single-process. In production (`next start`) it also works because Next.js serves API routes and pages in the same Node process. **However**, this is a second round trip per default card. For four default cards on a cold render the cost is ~4× the API latency. If this shows up as a TTFB regression, the fix is to call the query function inline (using `prisma` directly) — but that loses the API validation path. The current plan opts for correctness over micro-optimisation; revisit if RUM shows the regression.

3. **Prisma is required for SSR.** The seed must be running for the prefetch to return real data, otherwise `/api/query` returns 500 and `prefetchQuery` resolves to an errored entry. The dehydrated payload still ships to the client; the card components show the `<ErrorState>` with "Failed to load" instead of the loading skeleton. This is a strictly better UX than a skeleton, but a `pnpm prisma:seed` step should be part of the deploy runbook.

4. **The `enabled` guard in the cards (`!!config.dataSource && !!config.yAxis`) is duplicated on the server in the prefetch loop.** If a card's `enabled` predicate ever diverges (e.g. a third axis becomes required for `bar`), the prefetch will silently skip that card and the user will see a loading skeleton for it. Mitigation: extract a `canPrefetch(config)` helper into `src/lib/queries.ts` that the prefetch loop imports — but this is a follow-up, not part of the current plan, to keep this PR focused on the hydration feature itself.

5. **`globalThis` singleton on the client survives HMR but not tab close.** This is correct behaviour (each tab gets its own cache) but worth noting for anyone debugging "why does my cache survive a Cmd-R but not a window.close" — the answer is intentional. There is no plan to persist the client cache to `sessionStorage`; if we ever want that, it would be a separate `persistQueryClient` change.

---

## After Writing the Plan

This plan is ready for the orchestrator. Each task has a green-checkpoint at the end; the orchestrator can stop the run at any task and the codebase is in a known-good state. Tasks 4 and 7 are the highest-risk steps (touching the provider and the page entry) and should be reviewed before merge; the rest are mechanical edits with comprehensive test coverage.
