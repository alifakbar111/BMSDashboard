# Code Quality Review Report

**Audit date:** 2026-07-17
**Agent:** `code-review-agent`
**Scope:** TypeScript usage, component structure, naming conventions, dead code, pattern consistency, error handling, API design, testing quality
**Artifacts audited:** 39 source files

---

## Overall Score: 74/100 — Pass with Changes

| Dimension | Score | Key Issue |
|---|---|---|
| TypeScript Usage | 65/100 | Dual type definitions, `any` casts |
| Component Structure | 85/100 | Well-structured, consistent patterns |
| Naming & Conventions | 90/100 | Very consistent across all files |
| Error Handling | 70/100 | Error message leaking, inconsistent patterns |
| API Design | 75/100 | Missing validation in occupancy route, response inconsistency |
| Dead Code / Redundancy | 60/100 | Duplicate types, unused dependencies |
| Prisma/Schema | 80/100 | Good indexing, correct `@map()`, but unsafe dynamic access |
| Testing | 80/100 | Import alias inconsistency, solid coverage for pure functions |
| Config/Infrastructure | 85/100 | Clean, well-organized |
| Docs/Scripts | 75/100 | Unused import in OpenAPI gen, potential runtime method mismatch |

---

## Findings by Severity

### 🔴 HIGH — Must Fix

#### H1. Dual Type System: Manual types duplicated from Zod inference

| File | Lines | Issue |
|---|---|---|
| `src/lib/types.ts` | 1–51 | Manually defines `TableName`, `CardType`, `AggregationType`, `AxisConfig`, `FilterConfig`, `CardConfig`, `GlobalFilters`, `QueryResult` |
| `src/lib/schemas.ts` | 89–97 | Same types are inferred via `z.infer<typeof SchemaName>` |

These are exact duplicates. When the Zod schema changes (e.g., a new field on `CardConfig`), the manually-defined interface in `types.ts` silently diverges — tests may pass but runtime validation could reject valid data or accept invalid data.

**Fix:** Delete `src/lib/types.ts`. Re-export all inferred types from `src/lib/schemas.ts`. Update `src/lib/index.ts` and all import references.

---

#### H2. Unsafe `(prisma as any)[modelName]` dynamic access

| File | Line | Issue |
|---|---|---|
| `src/app/api/query/route.ts` | 48 | `(prisma as any)[query.modelName]` |
| `prisma/seed.ts` | 103 | `(prisma as any)[modelName].create(...)` |

This completely defeats TypeScript's strict mode for all Prisma queries. A typo in `getPrismaModel()` would not be caught at compile time.

**Fix:** Create a type-safe model registry:
```typescript
const prismaModelRegistry = {
  energyConsumption: true,
  hvacPerformance: true,
  occupancy: true,
  alertsEvent: true,
} as const;
type PrismaModelName = keyof typeof prismaModelRegistry;
```

---

#### H3. `config.dataSource!` non-null assertion can crash silently

**File:** `src/lib/query-builder.ts` line 127
**Issue:** `const table = config.dataSource!` — Zod schema defines `dataSource: TableNameSchema.nullable()`. If a client sends `"dataSource": null` (which passes Zod validation), `table` becomes `undefined` and causes a runtime error.

**Fix:** Validate `dataSource` is non-null before using it, or remove `.nullable()` from the Zod schema.

---

#### H4. `groupBy` computed but never used in Prisma queries

**File:** `src/lib/query-builder.ts` lines 136, 148, 157–158, and `src/app/api/query/route.ts` lines 53–57
**Issue:** `groupBy` array is populated for bar and line charts, but `findMany` call ignores it. Aggregation happens via `processQueryResult` on the full dataset — so the "sum" aggregation for a bar chart sums ALL values across ALL x-axis categories instead of per-category. This produces **incorrect results**.

**Fix:** Use Prisma's `groupBy` in the route handler when `query.groupBy` is non-empty:
```typescript
if (query.groupBy.length > 0) {
  const rows = await (model as any).groupBy({
    by: query.groupBy,
    where: query.where,
    _sum: { [yField]: true },
  });
}
```

---

### 🟠 MEDIUM — Should Fix

#### M1. Error details leak internal messages to clients

**File:** `src/app/api/query/route.ts` line 72
**Issue:** `details: (e as Error).message` sent to client. Leaks implementation details.

**Fix:** Log the full error server-side, return a generic message:
```typescript
catch (e) {
  console.error("Query API error:", e);
  return NextResponse.json({ error: "Failed to execute query" }, { status: 500 });
}
```

---

#### M2. `src/lib/prisma.ts` and `prisma/seed.ts` duplicate URL parsing logic

**Files:** `src/lib/prisma.ts` lines 13–31, `prisma/seed.ts` lines 22–35
**Issue:** The `getParam()` helper and MSSQL URL parsing logic are copy-pasted between the two files.

**Fix:** Extract URL parsing into a shared utility: `src/lib/db-config.ts`.

---

#### M3. `LoadingState` uses `Math.random()` during render

**File:** `src/components/ui/loading-state.tsx` line 17
**Issue:** `Math.random()` in the render path means skeleton widths change on every re-render, producing a visually jarring "dancing skeleton" effect.

**Fix:** Use array index to deterministically vary widths:
```typescript
style={{ width: `${70 + (i * 10) % 30}%` }}
```

---

#### M4. Unused `zod-to-json-schema` dependency

**File:** `package.json` line 49
**Issue:** `zod-to-json-schema` is designed for Zod v3, but this project uses Zod v4 (`^4.4.3`). Zod v4 has native `.toJSONSchema()` method, making this dependency dead.

**Fix:** Remove `zod-to-json-schema` from `package.json` dependencies.

---

#### M5. `OccupancyQueryParamsSchema` imported but unused in OpenAPI generation

**File:** `scripts/generate-openapi.ts` line 17
**Issue:** Imported but not referenced in any path or component schema.

**Fix:** Either use `toSchema(OccupancyQueryParamsSchema)` in parameter definitions, or remove the unused import.

---

#### M6. Route handler does not validate occupancy query params with Zod

**File:** `src/app/api/occupancy/latest/route.ts` lines 19–31
**Issue:** Manual `searchParams.get("floor")` + `parseInt` instead of using `OccupancyQueryParamsSchema` which exists at `src/lib/schemas.ts:73-76`.

**Fix:** Use `OccupancyQueryParamsSchema.safeParse()` in the route handler.

---

#### M7. Tests import from relative paths instead of `@/` alias

**Files:** `tests/unit/query-builder.test.ts` lines 2–3, `tests/unit/aggregation.test.ts` line 2
**Issue:** Uses `../../src/lib/...` instead of `@/lib/...`. Vitest config already maps `@/` → `./src`.

**Fix:** Use `@/lib/types` and `@/lib/aggregation` in all test files.

---

### 🟡 LOW — Consider Fixing

#### L1. Unused dependencies in `package.json`
- `date-fns` (^4.4.0) — Not imported anywhere
- `@prisma/client-runtime-utils` (^7.8.0) — Not imported anywhere

#### L2. `buildWhereClause` null check could be more idiomatic
**File:** `src/lib/query-builder.ts` line 24
- `filters.floor !== null && filters.floor !== undefined` → `filters.floor != null`

#### L3. Export style inconsistency between layout and UI components
- Layout components use `export function Name()`
- UI components use `function Name()` + `export { Name }`

#### L4. `min-w-[1280px]` on body restricts viewport
**File:** `src/app/globals.css` line 131
- Consider `min-w-[960px]` or responsive approach.

#### L5. `getTableColumns` throws instead of returning Result type
**File:** `src/app/api/columns/route.ts` lines 79–81
- Mixes control flow via exceptions for expected error states.

---

## Key Strengths Identified

1. **Consistent component patterns**: All 13 UI components use `cn()`, `data-slot`, named function exports, and `React.ComponentProps<>`.

2. **Zod-first validation**: Request body validation at the API boundary with descriptive error issues — correct and secure.

3. **Prisma schema quality**: Every camelCase field has a `@map()` to snake_case. Composite indexes match query patterns.

4. **Accessibility fundamentals**: Skip-to-content link, aria-labels on toggle buttons, sr-only text on icon-only buttons.

5. **Clean API route structure**: Distinct files for each endpoint with clear separation of concerns.

6. **Well-designed seed script**: Generic `seedTable()` function, row mappers as separate pure functions, safe number helpers.

7. **`ChartStyle` security warning**: The prominent comment warning against user-controlled color values in the CSS injection point.

---

## Priority Remediation

| # | Issue | Severity | File | Fix |
|---|---|---|---|---|
| 1 | Dual type system | 🔴 HIGH | `types.ts`, `schemas.ts` | Delete types.ts, re-export from schemas.ts |
| 2 | `groupBy` unused in queries | 🔴 HIGH | `query-builder.ts`, `query/route.ts` | Use Prisma `groupBy` |
| 3 | `dataSource!` crash risk | 🔴 HIGH | `query-builder.ts:127` | Validate non-null |
| 4 | `as any` Prisma access | 🔴 HIGH | `query/route.ts:48` | Typed model registry |
| 5 | Error detail leakage | 🟠 MEDIUM | `query/route.ts:72` | Generic error message |
| 6 | Use Zod for occupancy params | 🟠 MEDIUM | `occupancy/latest/route.ts` | Use `OccupancyQueryParamsSchema` |
| 7 | Shared DB config utility | 🟠 MEDIUM | `prisma.ts`, `seed.ts` | Extract shared helper |
| 8 | Clean up dead deps | 🟠 MEDIUM | `package.json` | Remove unused deps |
| 9 | Fix test imports to `@/` | 🟠 MEDIUM | `tests/unit/*.test.ts` | Use `@/` alias |
| 10 | Remove unused deps | 🟢 LOW | `package.json` | `date-fns`, `client-runtime-utils` |
