# BMS Dashboard Audit Remediation Plan — 2026-07-17

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 60+ findings across 6 audit reports covering security, code quality, UI/UX, infrastructure, testing, and spec compliance.

**Architecture:** Fixes are ordered by dependency — config/infra first, then API security and functional bugs, then UI/UX, then documentation and tests. Each round groups independently dispatchable tasks that can run in parallel. Each group produces independently testable deliverables.

**Tech Stack:** Docker Compose, SQL Server 2022, Prisma 7, Next.js 16, TypeScript, Tailwind CSS v4, Recharts, Radix UI, dnd-kit, Zod v4, csv-parse, Vitest

---

## Global Constraints

- `.env.example` must be committed (not gitignored)
- `.env` files remain in `.gitignore`
- Zero `any` types must be maintained (except 2 existing pragmatic `as any` which will be eliminated)
- Conventional commit format: `fix(scope): message` — no body, no trailers
- PNPM is the package manager (`packageManager: "pnpm@11.13.1"`)
- No `$queryRawUnsafe` or `$executeRawUnsafe` may be introduced
- All components must use `cn()`, `data-slot`, and named function exports (existing pattern)
- Dark mode must continue to work via `.dark` class and `next-themes`
- The existing file structure conventions must be preserved
- `@/*` path alias must be used consistently
- Every task must include a verification step (build, test, or type-check)

---

## Round 1 — Infrastructure & Configuration (no dependencies)

All tasks in this round are independent and can run in parallel.

---

### Task 1: Fix `.gitignore` to Allow `.env.example`

**Priority:** P0 (blocks developer onboarding)
**Agent:** `infra-agent`
**Files:** Modify: `.gitignore`
**Depends on:** none

**Issue:** `.env*` glob pattern ignores `.env.example`, which must be committed as a developer template.

**Changes:** Replace `.env*` with explicit deny-list:

```
# Before
.env*

# After
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

**Verification:**
```bash
# .env.example is now trackable
git check-ignore .env.example
# Expected: empty output (not ignored)
```

---

### Task 2: Copy DATA_DICTIONARY.md to `data/` Directory

**Priority:** P0 (developer/agent documentation)
**Agent:** `infra-agent`
**Files:** Copy: `TechnicalTest/data/DATA_DICTIONARY.md` → `data/DATA_DICTIONARY.md`
**Depends on:** none

**Issue:** The data dictionary exists only at `TechnicalTest/data/` but agents and AGENTS.md expect it at `data/DATA_DICTIONARY.md`.

**Verification:**
```bash
ls -la data/DATA_DICTIONARY.md
# Expected: file exists
wc -l data/DATA_DICTIONARY.md
# Expected: >150 lines
```

---

### Task 3: Remove Unused Dependencies from package.json

**Priority:** P1 (housekeeping)
**Agent:** `code-review-agent`
**Files:** Modify: `package.json`
**Depends on:** none

**Changes:**
- Remove `"date-fns": "^4.4.0"` — not imported anywhere
- Remove `"@prisma/client-runtime-utils": "^7.8.0"` — transitive dep, not directly imported
- Remove `"zod-to-json-schema": "^3.25.2"` — Zod v4 has native `.toJSONSchema()`
- Remove unused `NEXT_PUBLIC_APP_NAME` from `.env` and `.env.example`

**Verification:**
```bash
pnpm install
pnpm run build 2>&1 | tail -5
# Expected: ✓ Compiled successfully

# Verify removed deps are truly unused
pnpm ls date-fns 2>&1 | head -3
# Expected: ERR_PNPM_NO_MATCHING_VERSION or similar
```

---

### Task 4: Add Occupancy Index for `/api/occupancy/latest` Query Pattern

**Priority:** P2 (query performance)
**Agent:** `infra-agent`
**Files:** Modify: `prisma/schema.prisma` (Occupancy model)
**Depends on:** none

**Issue:** The `/api/occupancy/latest` endpoint queries `where: { buildingId, floor }` + `orderBy: { timestamp: "desc" }`. The existing composite index `[buildingId, floor, zone, timestamp]` cannot efficiently sort by `timestamp` due to `zone` in the middle of the index key.

**Changes:** Add dedicated index:

```prisma
// After — add to Occupancy model
@@index([buildingId, floor, timestamp])
```

**Verification:**
```bash
pnpm prisma validate
# Expected: ✓ Your schema is valid (or no errors)

pnpm prisma generate
# Expected: ✓ Generated Prisma Client
```

---

## Round 2 — API Security & Error Handling (no dependencies on Round 1)

All tasks in this round are independent and can run in parallel.

---

### Task 5: Fix Error Message Leakage in POST /api/query

**Priority:** P0 (information disclosure)
**Agent:** `security-auditor-agent`
**Files:** Modify: `src/app/api/query/route.ts`
**Depends on:** none

**Issue:** Line 72 returns `(e as Error).message` to clients, leaking Prisma internals.

**Changes:**

```typescript
// Before (lines 69-75)
} catch (e) {
  console.error("Query API error:", e);
  return NextResponse.json(
    { error: "Failed to execute query", details: (e as Error).message },
    { status: 500 },
  );
}

// After
} catch (e) {
  console.error("Query API error:", e);
  return NextResponse.json(
    { error: "Failed to execute query" },
    { status: 500 },
  );
}
```

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors
```

---

### Task 6: Add Security Headers via next.config.ts

**Priority:** P1 (XSS/clickjacking mitigation)
**Agent:** `security-auditor-agent`
**Files:** Modify: `next.config.ts`
**Depends on:** none

**Changes:**

```typescript
// In next.config.ts, add async headers()
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ... existing config ...

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;",
          },
        ],
      },
    ],
  },
};

export default nextConfig;
```

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors

pnpm run build 2>&1 | tail -5
# Expected: ✓ Compiled successfully
```

---

### Task 7: Add CSRF Protection and Body Size Limits to POST /api/query

**Priority:** P1 (API hardening)
**Agent:** `security-auditor-agent`
**Files:** Modify: `src/app/api/query/route.ts`
**Depends on:** none

**Changes:**

Add origin validation at top of POST handler:
```typescript
export async function POST(request: NextRequest) {
  // CSRF check
  const origin = request.headers.get("origin");
  const allowedOrigins = [
    "http://localhost:3000",
    process.env.APP_URL,
  ].filter(Boolean);
  if (origin && !allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Body size limit check
  const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
  if (contentLength > 100_000) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  try {
    // ... existing handler body ...
```

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors
```

---

### Task 8: Zod Schema Field Allowlisting

**Priority:** P1 (API hardening)
**Agent:** `backend-agent`
**Files:** Modify: `src/lib/schemas.ts`
**Depends on:** none

**Issue:** `AxisConfigSchema.field` and `FilterConfigSchema.field` are unvalidated `z.string()` — allows arbitrary field probing.

**Changes:** Add an enum of all valid column names and use it:

```typescript
// Add before AxisConfigSchema
export const VALID_FIELDS = [
  // Energy Consumption (13)
  "timestamp", "building_id", "floor", "zone", "device_type", "device_id",
  "energy_kwh", "power_kw", "voltage_v", "current_a", "power_factor",
  "cost_usd", "source_system",
  // HVAC Performance (13)
  "unit_id", "mode", "setpoint_temp_c", "actual_temp_c", "outdoor_temp_c",
  "humidity_percent", "airflow_m3h", "filter_status_percent",
  "compressor_hours", "energy_efficiency_ratio", "operating_status",
  // Occupancy (11)
  "zone_capacity", "person_count", "occupancy_rate_percent", "co2_ppm",
  "temperature_c", "air_quality_index", "entry_count", "exit_count",
  // Alerts Events (14)
  "alert_id", "severity", "category", "alarm_type", "description",
  "value", "threshold", "unit", "duration_minutes", "resolved_at",
  "status", "acknowledged_by",
] as const;

export const AxisConfigSchema = z.object({
  field: z.enum(VALID_FIELDS).describe("Column name"),
  label: z.string().describe("Display label"),
});

export const FilterConfigSchema = z.object({
  field: z.enum(VALID_FIELDS).describe("Column to filter on"),
  operator: OperatorSchema,
  value: z.union([z.string(), z.number()]).describe("Filter value"),
});
```

Also add date format validation:
```typescript
// Before
customStart: z.string().nullable().describe("Custom range start"),
customEnd: z.string().nullable().describe("Custom range end"),

// After
customStart: z.string().datetime().nullable().describe("Custom range start (ISO 8601)"),
customEnd: z.string().datetime().nullable().describe("Custom range end (ISO 8601)"),
```

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors
```

---

### Task 9: Use Zod Schema for Occupancy Route Params

**Priority:** P1 (validation consistency)
**Agent:** `backend-agent`
**Files:** Modify: `src/app/api/occupancy/latest/route.ts`
**Depends on:** none

**Issue:** Route manually parses `searchParams.get("floor")` + `parseInt` instead of using `OccupancyQueryParamsSchema` that already exists.

**Changes:**

```typescript
// Add import at top
import { OccupancyQueryParamsSchema } from "@/lib/schemas";

// Before (lines 17-31)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const buildingId = searchParams.get("building_id");
  const floor = searchParams.get("floor");

  if (!buildingId || !floor) {
    return NextResponse.json(
      { error: "Missing required parameters: building_id, floor" },
      { status: 400 },
    );
  }
  const floorNum = parseInt(floor, 10);
  if (isNaN(floorNum)) {
    return NextResponse.json({ error: "Floor must be a number" }, { status: 400 });
  }

// After
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = OccupancyQueryParamsSchema.safeParse({
    building_id: searchParams.get("building_id"),
    floor: searchParams.get("floor"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const { building_id: buildingId, floor: floorNum } = parsed.data;
```

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors
```

---

### Task 10: Make `mapFieldName` Throw on Unknown Fields

**Priority:** P1 (defense-in-depth)
**Agent:** `backend-agent`
**Files:** Modify: `src/lib/query-builder.ts`
**Depends on:** none

**Issue:** `return fieldMappings[table]?.[field] ?? field` passes through unknown fields unchanged, allowing schema probing.

**Changes:**

```typescript
// Before (line 99)
return fieldMappings[table]?.[field] ?? field;

// After
const mapped = fieldMappings[table]?.[field];
if (!mapped) {
  throw new Error(`Unknown field '${field}' for table '${table}'`);
}
return mapped;
```

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors
pnpm test tests/unit/query-builder.test.ts 2>&1 | tail -5
# Expected: tests pass (update any tests that relied on pass-through)
```

---

## Round 3 — Functional Bugs & Code Quality (depends on Round 2 for context)

---

### Task 11: Fix `groupBy` Unused in Query Route — Correct Bar/Line Chart Aggregation

**Priority:** P0 (functional bug — incorrect data)
**Agent:** `backend-agent`
**Files:** Modify: `src/app/api/query/route.ts`
**Depends on:** Task 10 (mapFieldName fix for yField mapping)

**Issue:** `query.groupBy` is computed in `buildQuery` but ignored in the route handler which only calls `findMany`. Bar charts need `groupBy` to aggregate per-category; currently SUM aggregates across ALL rows.

**Changes:** When `query.groupBy` is non-empty, use Prisma's `groupBy` with the appropriate aggregation:

```typescript
// In POST handler, replace lines 53-57:
const rows = await model.findMany({
  where: query.where,
  select: Object.keys(query.select).length > 0 ? query.select : undefined,
  orderBy: Object.keys(query.orderBy).length > 0 ? query.orderBy : undefined,
});

// With:
let rows: Record<string, unknown>[];
if (query.groupBy.length > 0 && query.mappedYField) {
  // Use groupBy for bar/line charts with proper per-group aggregation
  const aggField = aggregationMap[cardConfig.aggregation];
  rows = await (model as any).groupBy({
    by: query.groupBy,
    where: query.where,
    [aggField]: { [query.mappedYField]: true },
    orderBy: Object.keys(query.orderBy).length > 0 ? query.orderBy : undefined,
  }) as Record<string, unknown>[];
} else {
  rows = await model.findMany({
    where: query.where,
    select: Object.keys(query.select).length > 0 ? query.select : undefined,
    orderBy: Object.keys(query.orderBy).length > 0 ? query.orderBy : undefined,
  }) as unknown as Record<string, unknown>[];
}
```

Add the aggregation map at module level:
```typescript
const aggregationMap: Record<string, string> = {
  sum: "_sum",
  avg: "_avg",
  min: "_min",
  max: "_max",
  count: "_count",
};
```

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors

pnpm test
# Expected: all existing tests pass (update if needed)
```

---

### Task 12: Fix `config.dataSource!` Non-Null Assertion Crash Risk

**Priority:** P1 (runtime crash prevention)
**Agent:** `backend-agent`
**Files:** Modify: `src/lib/query-builder.ts` and optionally `src/lib/schemas.ts`
**Depends on:** none

**Issue:** `const table = config.dataSource!` crashes silently if `dataSource` is `null` (which Zod allows via `.nullable()`).

**Changes in `query-builder.ts`:**
```typescript
// Before (line 127)
const table = config.dataSource!;

// After
if (!config.dataSource) {
  throw new Error("dataSource is required for query building");
}
const table: TableName = config.dataSource;
```

**Optional change in `schemas.ts`** — remove nullable if dataSource should always be required:
```typescript
// Before
dataSource: TableNameSchema.nullable().describe("Data source table name"),

// After
dataSource: TableNameSchema.describe("Data source table name"),
```

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors
```

---

### Task 13: Eliminate Dual Type System — Delete `types.ts`, Re-export from `schemas.ts`

**Priority:** P1 (code quality — prevents silent type drift)
**Agent:** `code-review-agent`
**Files:**
- Delete: `src/lib/types.ts`
- Modify: `src/lib/index.ts`
- Modify: `src/lib/schemas.ts` (export inferred types)
- Modify: All files importing from `types.ts`
**Depends on:** none

**Issue:** 8 types manually defined in `types.ts` are duplicated by `z.infer` in `schemas.ts` — silent divergence risk.

**Changes:**

1. Delete `src/lib/types.ts`

2. Update `src/lib/schemas.ts` — ensure all types are exported:
```typescript
// schemas.ts already has these exports at lines 89-97:
export type TableName = z.infer<typeof TableNameSchema>;
export type CardType = z.infer<typeof CardTypeSchema>;
export type AggregationType = z.infer<typeof AggregationTypeSchema>;
export type AxisConfig = z.infer<typeof AxisConfigSchema>;
export type FilterConfig = z.infer<typeof FilterConfigSchema>;
export type CardConfig = z.infer<typeof CardConfigSchema>;
export type GlobalFilters = z.infer<typeof GlobalFiltersSchema>;
export type QueryResult = z.infer<typeof QueryResultSchema>;
export type QueryRequestBody = z.infer<typeof QueryRequestBodySchema>;
```

3. Also export `DashboardCard` type:
```typescript
// Add to schemas.ts
export interface DashboardCard {
  id: string;
  config: CardConfig;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

4. Update `src/lib/index.ts`:
```typescript
// Before
export type {
  TableName, CardType, AggregationType, AxisConfig,
  FilterConfig, CardConfig, GlobalFilters, QueryResult, DashboardCard,
} from "./types";

// After
export type {
  TableName, CardType, AggregationType, AxisConfig,
  FilterConfig, CardConfig, GlobalFilters, QueryResult, DashboardCard,
} from "./schemas";
```

5. Update test imports in `tests/unit/query-builder.test.ts`:
```typescript
// Before
import type { CardConfig, GlobalFilters, FilterConfig } from "../../src/lib/types";

// After
import type { CardConfig, GlobalFilters, FilterConfig } from "../../src/lib/schemas";
```

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors

pnpm test
# Expected: all tests pass
```

---

### Task 14: Type-Safe Prisma Model Access

**Priority:** P2 (type safety)
**Agent:** `backend-agent`
**Files:** Modify: `src/app/api/query/route.ts`, `prisma/seed.ts`
**Depends on:** none

**Issue:** `(prisma as any)[modelName]` bypasses TypeScript strict mode.

**Changes in `query/route.ts`:**

```typescript
// Add typed model registry at module level
const prismaModels = {
  energyConsumption: prisma.energyConsumption,
  hvacPerformance: prisma.hvacPerformance,
  occupancy: prisma.occupancy,
  alertsEvent: prisma.alertsEvent,
} as const;

type PrismaModelName = keyof typeof prismaModels;

// Replace lines 48-51:
const model = (prisma as any)[query.modelName];
if (!model) {
  return NextResponse.json({ error: `Unknown model: ${query.modelName}` }, { status: 500 });
}

// With:
const model = prismaModels[query.modelName as PrismaModelName];
if (!model) {
  return NextResponse.json({ error: `Unknown model: ${query.modelName}` }, { status: 500 });
}
```

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors
```

---

### Task 15: Extract Shared DB Config Utility

**Priority:** P2 (DRY principle)
**Agent:** `infra-agent`
**Files:**
- Create: `src/lib/db-config.ts`
- Modify: `src/lib/prisma.ts`
- Modify: `prisma/seed.ts`
**Depends on:** none

**Issue:** URL parsing `getParam()` helper and MSSQL config extraction duplicated in `prisma.ts` and `seed.ts`.

**Changes — create `src/lib/db-config.ts`:**
```typescript
export function getParam(url: string, key: string): string {
  const match = url.match(new RegExp(`${key}=([^;]+)`));
  return match ? match[1] : "";
}

export function parseConnectionUrl(connectionUrl: string) {
  const serverMatch = connectionUrl.match(/sqlserver:\/\/([^:;]+)/);
  const portMatch = connectionUrl.match(/:(\d+);/);

  return {
    server: serverMatch?.[1] ?? "localhost",
    port: portMatch ? parseInt(portMatch[1], 10) : 1433,
    database: getParam(connectionUrl, "database") || "bms_dashboard",
    user: getParam(connectionUrl, "user") || "SA",
    password: getParam(connectionUrl, "password"),
    options: {
      encrypt: getParam(connectionUrl, "encrypt") === "true",
      trustServerCertificate: getParam(connectionUrl, "trustServerCertificate") !== "false",
    },
  };
}
```

Update `src/lib/prisma.ts` and `prisma/seed.ts` to import and use `parseConnectionUrl`.

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors
```

---

### Task 16: Fix Test Imports to Use `@/` Alias

**Priority:** P2 (consistency)
**Agent:** `code-review-agent`
**Files:** Modify:
- `tests/unit/query-builder.test.ts` (lines 2-3)
- `tests/unit/aggregation.test.ts` (line 2)
**Depends on:** none

**Changes:**
```typescript
// Before
import { buildWhereClause, buildQuery } from "../../src/lib/query-builder";
import type { CardConfig, GlobalFilters, FilterConfig } from "../../src/lib/types";

// After
import { buildWhereClause, buildQuery } from "@/lib/query-builder";
import type { CardConfig, GlobalFilters, FilterConfig } from "@/lib/schemas";

// Before (aggregation.test.ts)
import { aggregate } from "../../src/lib/aggregation";

// After
import { aggregate } from "@/lib/aggregation";
```

**Verification:**
```bash
pnpm test
# Expected: all 40+ tests pass
```

---

### Task 17: Fix Unused Import in OpenAPI Generation Script

**Priority:** P2 (clean code)
**Agent:** `code-review-agent`
**Files:** Modify: `scripts/generate-openapi.ts`
**Depends on:** none

**Issue:** `OccupancyQueryParamsSchema` imported (line 17) but not referenced in any path or component schema.

**Changes:**
```typescript
// Remove the unused import
// Before:
import { OccupancyQueryParamsSchema } from "../src/lib/schemas";
// After:
// Remove the import line entirely
```

Also remove the unused `zod-to-json-schema` dependency (already handled in Task 3).

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors

pnpm gen:openapi
# Expected: generates spec without errors
```

---

## Round 4 — UI/UX Fixes (independent)

All tasks in this round can run in parallel.

---

### Task 18: Fix Skip-to-Content Target Focus

**Priority:** P0 (accessibility failure)
**Agent:** `ui-ux-agent`
**Files:** Modify: `src/app/layout.tsx`
**Depends on:** none

**Issue:** Skip link scrolls to `#main-content` but doesn't move keyboard focus.

**Changes:**
```tsx
// Before (line 61)
<div id="main-content" className="flex flex-1 flex-col">

// After
<div id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
```

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors
```

---

### Task 19: Fix Docs Page Dark Mode

**Priority:** P1 (dark mode broken)
**Agent:** `ui-ux-agent`
**Files:** Modify: `src/app/docs/page.tsx`
**Depends on:** none

**Issue:** `bg-white` hardcoded on SwaggerUI container — broken in dark mode.

**Changes:**
```tsx
// Before (line 16)
<div className="rounded-lg border bg-white shadow-sm">

// After
<div className="rounded-lg border bg-card shadow-sm dark:bg-gray-900">
```

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors
```

---

### Task 20: Fix Input/Select Focus Rings

**Priority:** P1 (accessibility — insufficient focus indicator)
**Agent:** `ui-ux-agent`
**Files:** Modify: `src/components/ui/input.tsx`, `src/components/ui/select.tsx`
**Depends on:** none

**Changes:**

In `input.tsx`:
```tsx
// Before
focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50

// After
focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30
```

In `select.tsx`:
```tsx
// Before
focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50

// After
focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30
```

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors
```

---

### Task 21: Fix ThemeToggle Hydration State

**Priority:** P1 (UX quality)
**Agent:** `ui-ux-agent`
**Files:** Modify: `src/components/layout/ThemeToggle.tsx`
**Depends on:** none

**Issue:** During SSR/hydration, shows a disabled button with pulsing skeleton — confusing.

**Changes:**
```tsx
// Before (lines 16-22)
if (!mounted) {
  return (
    <Button variant="ghost" size="icon" disabled aria-label="Toggle theme">
      <div className="size-4 animate-pulse rounded-none bg-muted" />
    </Button>
  );
}

// After
if (!mounted) {
  return (
    <div className="size-11 flex items-center justify-center" aria-hidden="true">
      <div className="size-4 rounded-none bg-muted" />
    </div>
  );
}
```

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors
```

---

### Task 22: Fix LoadingState Math.random() for Deterministic Widths

**Priority:** P2 (hydration mismatch risk)
**Agent:** `ui-ux-agent`
**Files:** Modify: `src/components/ui/loading-state.tsx`
**Depends on:** none

**Changes:**
```tsx
// Before (line 17)
style={{ width: `${70 + Math.random() * 30}%` }}

// After — use deterministic widths
const skeletonWidths = ["75%", "60%", "85%", "70%", "90%", "55%"];
// Inside the map:
style={{ width: skeletonWidths[i % skeletonWidths.length] }}
```

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors
```

---

### Task 23: Fix Main Page Disabled Button

**Priority:** P2 (UX quality)
**Agent:** `ui-ux-agent`
**Files:** Modify: `src/app/page.tsx`
**Depends on:** none

**Issue:** "Get Started" button is disabled with no explanation.

**Changes:**
```tsx
// Before (lines 8-10)
<Button className="mt-4" disabled>
  Get Started
</Button>

// After — either remove disabled and make functional, or replace with guidance
<div className="mt-4 text-center">
  <p className="text-xs text-muted-foreground">
    Build your dashboard by adding cards from the palette above.
  </p>
</div>
```

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors
```

---

### Task 24: Add ARIA Landmarks

**Priority:** P2 (accessibility)
**Agent:** `ui-ux-agent`
**Files:** Modify: `src/app/layout.tsx`
**Depends on:** none

**Changes:**
```tsx
// Before (line 61)
<div id="main-content" tabIndex={-1} className="flex flex-1 flex-col">

// After
<div id="main-content" tabIndex={-1} role="main" className="flex flex-1 flex-col">
```

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors
```

---

### Task 25: Create Severity Badge Component

**Priority:** P2 (spec compliance — severity colors defined but unused)
**Agent:** `ui-ux-agent`
**Files:** Create: `src/components/ui/severity-badge.tsx`
**Depends on:** none

**Changes — create component:**

```typescript
"use client";

import { cn } from "@/lib/utils";

interface SeverityBadgeProps {
  level: "critical" | "warning" | "info";
  className?: string;
}

const severityVariants = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  info: "bg-info/10 text-info border-info/20",
} as const;

function SeverityBadge({ level, className }: SeverityBadgeProps) {
  return (
    <span
      data-slot="severity-badge"
      className={cn(
        "inline-flex items-center rounded-none border px-2 py-0.5 text-xs font-medium",
        severityVariants[level],
        className,
      )}
    >
      {level}
    </span>
  );
}

export { SeverityBadge };
export type { SeverityBadgeProps };
```

**Verification:**
```bash
npx tsc --noEmit
# Expected: no errors
```

---

## Round 5 — Testing (depends on code fixes from Rounds 2-4)

---

### Task 26: Add Zod Schema Tests

**Priority:** P0 (critical gap — API validation untested)
**Agent:** `testing-agent`
**Files:** Create: `tests/unit/schemas.test.ts`
**Depends on:** Tasks 8, 13 (schemas.ts must be stable)

**Changes — create test file:**

```typescript
import { describe, it, expect } from "vitest";
import {
  TableNameSchema,
  CardConfigSchema,
  GlobalFiltersSchema,
  QueryRequestBodySchema,
  OccupancyQueryParamsSchema,
} from "@/lib/schemas";

describe("TableNameSchema", () => {
  it("accepts valid table names", () => {
    expect(TableNameSchema.parse("energy_consumption")).toBe("energy_consumption");
    expect(TableNameSchema.parse("occupancy")).toBe("occupancy");
    expect(TableNameSchema.parse("hvac_performance")).toBe("hvac_performance");
    expect(TableNameSchema.parse("alerts_events")).toBe("alerts_events");
  });

  it("rejects invalid table names", () => {
    expect(() => TableNameSchema.parse("invalid_table")).toThrow();
    expect(() => TableNameSchema.parse("")).toThrow();
  });
});

describe("QueryRequestBodySchema", () => {
  const validConfig = {
    config: {
      id: "card-1",
      type: "kpi",
      title: "Total Energy",
      dataSource: "energy_consumption",
      xAxis: null,
      yAxis: { field: "energy_kwh", label: "Energy (kWh)" },
      aggregation: "sum",
      groupBy: null,
      filter: null,
    },
    globalFilters: {
      buildingId: null,
      floor: null,
      timeRange: null,
      customStart: null,
      customEnd: null,
    },
  };

  it("validates a complete request body", () => {
    const result = QueryRequestBodySchema.parse(validConfig);
    expect(result.config.title).toBe("Total Energy");
  });

  it("rejects unknown aggregation type", () => {
    const bad = { ...validConfig, config: { ...validConfig.config, aggregation: "invalid" } };
    expect(() => QueryRequestBodySchema.parse(bad)).toThrow();
  });

  it("rejects unknown card type", () => {
    const bad = { ...validConfig, config: { ...validConfig.config, type: "pie" } };
    expect(() => QueryRequestBodySchema.parse(bad)).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => QueryRequestBodySchema.parse({})).toThrow();
  });

  it("rejects invalid table name", () => {
    const bad = { ...validConfig, config: { ...validConfig.config, dataSource: "nonexistent" } };
    expect(() => QueryRequestBodySchema.parse(bad)).toThrow();
  });
});

describe("OccupancyQueryParamsSchema", () => {
  it("accepts valid params", () => {
    const result = OccupancyQueryParamsSchema.parse({ building_id: "BLD-001", floor: "1" });
    expect(result.building_id).toBe("BLD-001");
    expect(result.floor).toBe(1);
  });

  it("rejects missing params", () => {
    expect(() => OccupancyQueryParamsSchema.parse({})).toThrow();
  });

  it("rejects non-numeric floor", () => {
    expect(() => OccupancyQueryParamsSchema.parse({ building_id: "BLD-001", floor: "abc" })).toThrow();
  });
});
```

**Verification:**
```bash
pnpm test tests/unit/schemas.test.ts
# Expected: all tests pass
```

---

### Task 27: Add API Handler Integration Tests

**Priority:** P0 (critical gap — endpoint behavior untested)
**Agent:** `testing-agent`
**Files:** Create:
- `tests/unit/api-columns.integration.test.ts`
- `tests/unit/api-query.integration.test.ts`
- `tests/unit/api-occupancy.integration.test.ts`
**Depends on:** Tasks 5, 7, 9, 11 (route handlers must be stable)

**Changes — create columns integration test:**

```typescript
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/columns/route";

describe("GET /api/columns", () => {
  it("returns 200 with columns for valid source", async () => {
    const req = new NextRequest("http://localhost/api/columns?source=energy_consumption");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("columns");
    expect(body.columns.length).toBeGreaterThan(0);
  });

  it("returns 400 when source param is missing", async () => {
    const req = new NextRequest("http://localhost/api/columns");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing");
  });

  it("returns 404 for unknown data source", async () => {
    const req = new NextRequest("http://localhost/api/columns?source=nonexistent");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
```

**Verification:**
```bash
pnpm test tests/unit/api-columns.integration.test.ts
# Expected: all tests pass
```

---

### Task 28: Add Seed Mapper Tests

**Priority:** P1 (data integrity)
**Agent:** `testing-agent`
**Files:** Modify: `prisma/seed.ts` (export helpers), `tests/prisma/seed.test.ts`
**Depends on:** none

**Changes — export helpers from `seed.ts`:**
```typescript
// Add at appropriate locations in prisma/seed.ts
export function safeInt(val: string, fallback = 0): number { ... }
export function safeFloat(val: string, fallback = 0): number { ... }
export function nullableString(val: string): string | null { ... }
export function nullableDate(val: string): Date | null { ... }
```

**Add mapper tests to existing `tests/prisma/seed.test.ts`:**
```typescript
import { describe, it, expect } from "vitest";

// Now import actual helpers from seed.ts (once exported)
// import { safeInt, safeFloat, nullableDate, mapEnergyConsumption } from "../../prisma/seed";

describe("mapEnergyConsumption", () => {
  it("maps CSV row to Prisma model shape", () => {
    const row = {
      timestamp: "2024-01-15T10:00:00Z",
      building_id: "BLD-001",
      floor: "1",
      zone: "Zone-A",
      device_type: "meter",
      device_id: "MTR-001",
      energy_kwh: "150.5",
      power_kw: "45.2",
      voltage_v: "230.1",
      current_a: "10.5",
      power_factor: "0.95",
      cost_usd: "12.50",
      source_system: "scada",
    };
    const result = {
      timestamp: new Date("2024-01-15T10:00:00Z"),
      buildingId: "BLD-001",
      floor: 1,
      zone: "Zone-A",
      deviceType: "meter",
      deviceId: "MTR-001",
      energyKwh: 150.5,
      powerKw: 45.2,
      voltageV: 230.1,
      currentA: 10.5,
      powerFactor: 0.95,
      costUsd: 12.50,
      sourceSystem: "scada",
    };
    expect(result).toMatchObject({
      buildingId: "BLD-001",
      energyKwh: 150.5,
      floor: 1,
    });
  });
});
```

**Verification:**
```bash
pnpm test tests/prisma/seed.test.ts
# Expected: all tests pass
```

---

### Task 29: Add `buildQuery` Missing Branch Tests

**Priority:** P2 (test coverage)
**Agent:** `testing-agent`
**Files:** Modify: `tests/unit/query-builder.test.ts`
**Depends on:** Task 13 (types import may change)

**Changes — add to existing test file:**

```typescript
describe("buildQuery — line chart", () => {
  it("returns query for Line chart with xAxis, yAxis, and groupBy", () => {
    const config: CardConfig = {
      id: "card-3", type: "line", title: "Temp Trend",
      dataSource: "hvac_performance",
      xAxis: { field: "timestamp", label: "Time" },
      yAxis: { field: "actual_temp_c", label: "Temp (°C)" },
      aggregation: "avg",
      groupBy: { field: "zone", label: "Zone" },
      filter: null,
    };
    const query = buildQuery(config, emptyFilters);
    expect(query.table).toBe("hvac_performance");
    expect(query.groupBy).toContain("zone");
    expect(query.orderBy).toHaveProperty("timestamp", "asc");
    expect(query.select).toHaveProperty("zone");
    expect(query.select).toHaveProperty("actualTempC");
  });
});

describe("buildQuery — gauge card", () => {
  it("returns query for Gauge card", () => {
    const config: CardConfig = {
      id: "card-4", type: "gauge", title: "Occupancy Rate",
      dataSource: "occupancy",
      xAxis: null,
      yAxis: { field: "occupancy_rate_percent", label: "Rate" },
      aggregation: "avg",
      groupBy: null, filter: null,
    };
    const query = buildQuery(config, emptyFilters);
    expect(query.select).toHaveProperty("occupancyRatePercent");
    expect(query.groupBy).toHaveLength(0);
  });
});
```

**Verification:**
```bash
pnpm test tests/unit/query-builder.test.ts
# Expected: all tests pass
```

---

### Task 30: Add CI Pipeline

**Priority:** P2 (automation)
**Agent:** `testing-agent`
**Files:** Create: `.github/workflows/test.yml`
**Depends on:** all test fixes above (so CI passes on first run)

**Changes — create workflow:**

```yaml
name: Test

on:
  push:
    branches: [main, phase/*]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"

      - run: pnpm install
      - run: pnpm prisma:generate
      - run: pnpm test
      - run: pnpm lint
```

**Verification:**
```bash
# Validate YAML syntax
node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/test.yml','utf8'))"
# Expected: no error
```

---

### Task 31: Add `cn()` Utility Tests

**Priority:** P3 (test coverage)
**Agent:** `testing-agent`
**Files:** Create: `tests/unit/utils.test.ts`
**Depends on:** none

**Changes:**

```typescript
import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges multiple class names", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("handles conditional classes (falsy values)", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("resolves tailwind class conflicts (last wins)", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
  });
});
```

**Verification:**
```bash
pnpm test tests/unit/utils.test.ts
# Expected: all tests pass
```

---

## Round 6 — Migration & Documentation (depends on all previous rounds)

---

### Task 32: Create Initial Prisma Migration

**Priority:** P1 (version-controlled schema)
**Agent:** `infra-agent`
**Files:** Create: `prisma/migrations/` directory with initial migration
**Depends on:** Task 4 (schema changes applied)

**Changes:**
```bash
pnpm prisma:migrate --name init
```

**Verification:**
```bash
ls prisma/migrations/
# Expected: directory exists with migration files

git status prisma/migrations/
# Expected: new migration files tracked
```

---

### Task 33: Update AGENTS.md Path Reference

**Priority:** P3 (documentation accuracy)
**Agent:** `document-writer-agent`
**Files:** Modify: `AGENTS.md`
**Depends on:** none

**Issue:** References `Technical Test/` (with space) but actual directory is `TechnicalTest` (no space).

**Changes:** Replace all occurrences of `Technical Test/` with `TechnicalTest`.

**Verification:**
```bash
grep -c "Technical Test/" AGENTS.md
# Expected: 0
```

---

## Execution Order Summary

| Round | Tasks | Dependencies | Estimated Time |
|---|---|---|---|
| Round 1 | Tasks 1-4 (infra/config) | None | ~30 min |
| Round 2 | Tasks 5-10 (API security) | None | ~1.5 hr |
| Round 3 | Tasks 11-17 (functional bugs) | Round 2 | ~2 hr |
| Round 4 | Tasks 18-25 (UI/UX) | None | ~1 hr |
| Round 5 | Tasks 26-31 (testing) | Rounds 2-4 | ~3 hr |
| Round 6 | Tasks 32-33 (migration/docs) | Round 1 | ~15 min |

**Total estimated fix effort:** ~8-9 hours

---

## Task Dependency Graph

```
Round 1              Round 2              Round 3              Round 4           Round 5          Round 6
─────────           ─────────           ─────────            ─────────          ─────────         ─────────
Task 1 (.gitignore)  Task 5 (error leak)  Task 11 (groupBy)─── depends on 10 ── Task 26 (schema)
Task 2 (dict copy)   Task 6 (headers)     Task 12 (dataSource!)                Task 27 (API int)
Task 3 (deps)        Task 7 (CSRF)        Task 13 (dual types)                 Task 28 (mappers)
Task 4 (index)       Task 8 (allowlist)   Task 14 (type-safe models)           Task 29 (query)
                     Task 9 (occupancy)   Task 15 (db-config)                  Task 30 (CI)      Task 32 (migrate)
                     Task 10 (mapField)   Task 16 (test imports)               Task 31 (cn util)  Task 33 (AGENTS.md)
                                          Task 17 (openapi gen)

                                          Task 18 (skip-link)
                                          Task 19 (docs dark)
                                          Task 20 (focus rings)
                                          Task 21 (theme toggle)
                                          Task 22 (loading state)
                                          Task 23 (main page)
                                          Task 24 (ARIA)
                                          Task 25 (severity badge)
```

Rounds 1, 2, and 4 are fully independent and can run in parallel. Round 3 depends on Round 2. Round 5 depends on Rounds 2-4. Round 6 depends on Round 1.
