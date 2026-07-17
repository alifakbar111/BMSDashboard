# Testing Audit Report

**Audit date:** 2026-07-17
**Agent:** `testing-agent`
**Scope:** All 7 test files, source module coverage, test quality, CI configuration
**Test count:** 40 tests (all passing, 641ms)
**Covered source:** 7 source files (partial), 32+ source files untested

---

## Overall Score: 45/100 — FAIL

| Category | Score | Status |
|---|---|---|
| Pure Function Tests (aggregation, csv-parse) | 85/100 | ✅ Good coverage |
| Query Builder Tests | 50/100 | ⚠️ Partial — missing line/gauge/groupBy/mapFieldName |
| API Endpoint Tests | 0/100 | ❌ Zero HTTP tests for any route handler |
| Zod Schema Validation Tests | 0/100 | ❌ 10 schemas, zero tests |
| Seed Mapper Tests | 0/100 | ❌ Row mappers completely untested |
| Prisma Singleton Tests | 60/100 | ⚠️ Basic existence checks only |
| Component Tests | 0/100 | ❌ 16 UI components, zero tests |
| CI / Automation | 0/100 | ❌ No CI pipeline configured |

---

## Per-Test-File Breakdown

### 1. `tests/unit/aggregation.test.ts` — Score: 8/10 ✅

**Tests:** 7 | **Source:** `src/lib/aggregation.ts` (20 lines)

**Covered:** All 5 aggregation types (sum, avg, min, max, count), empty array edge cases, unknown type error.

**Gaps:**
- `avg` with empty array (early return path)
- `min`/`max` with empty array (guard clause behavior)
- Single-element arrays
- Floating point precision (`[0.1, 0.2]`)
- Negative values

---

### 2. `tests/unit/query-builder.test.ts` — Score: 5/10 ⚠️

**Tests:** 7 | **Source:** `src/lib/query-builder.ts` (166 lines, 4 exported + 2 private functions)

**Covered:**
- `buildWhereClause`: empty filters ✅, buildingId ✅, floor ✅, timeRange "today" ✅, global + card filter merge ✅
- `buildQuery`: KPI card ✅, Bar chart ✅

**Gaps (Critical):**

| Function | Lines | Tests? | Issue |
|---|---|---|---|
| `buildWhereClause` | 15-47 | ⚠️ Partial | `timeRange: "last7"` untested, `timeRange: "custom"` + customStart/customEnd untested, card filter with non-eq operators untested, `floor: 0` edge case |
| `buildQuery` | 112-165 | ⚠️ Partial | `type: "line"` completely untested, `type: "gauge"` completely untested, `config.groupBy` completely untested, `config.filter` path untested, `dataSource` as `null` untested, only `energy_consumption` table tested |
| `mapFieldName` | 50-100 | ❌ None | Zero direct tests for 30+ field mappings across 4 tables |
| `getPrismaModel` | 102-110 | ❌ None | Only tested indirectly through `buildQuery` |
| `parseOperatorToPrisma` | 3-13 | ❌ None | Only tested indirectly through `buildWhereClause` |

---

### 3. `tests/unit/api-query.test.ts` — Score: 4/10 🔴

**Tests:** 4 | **Source:** `src/app/api/query/route.ts` (76 lines)

**Covered:**
- `processQueryResult` with `sum` ✅ and `avg` ✅
- Empty rows ✅
- Missing value field ✅

**Gaps (Critical):**
- HTTP `POST` handler — **0% tested** (6+ behaviors untested)
- `getNumericValue` — private but critical; string parsing, NaN, null, undefined paths untested
- `min`, `max`, `count` aggregation types in `processQueryResult` untested
- Dead mock: `vi.mock("@/lib/prisma")` but tests never use Prisma

**Untested POST handler behaviors:**
- Invalid JSON → 400
- Schema validation failure → 400 with `details`
- Valid KPI request → 200 with aggregated response
- Valid Bar/Line request → 200 with raw data
- Unknown model → 500
- Prisma query error → 500
- KPI type with missing yField

---

### 4. `tests/unit/api-columns.test.ts` — Score: 6/10 ⚠️

**Tests:** 4 | **Source:** `src/app/api/columns/route.ts` (96 lines)

**Covered:**
- `getTableColumns` for `energy_consumption` ✅
- `getTableColumns` for `hvac_performance` ✅
- Unknown table throws ✅
- `zone` is non-numeric ✅

**Gaps:**
- `occupancy` and `alerts_events` tables untested
- No column count assertions
- No `data_type` field assertions
- `GET` handler — **0% tested** (4+ behaviors untested)

---

### 5. `tests/unit/api-occupancy.test.ts` — Score: 5/10 ⚠️

**Tests:** 3 | **Source:** `src/app/api/occupancy/latest/route.ts` (49 lines)

**Covered:**
- `getLatestPerZone` returns latest per zone ✅
- Empty input ✅
- Single zone single row ✅

**Gaps:**
- Rows with empty/null zone (`if (!zone) continue;`) untested
- Same-timestamp tiebreaker behavior untested
- Invalid timestamp strings untested
- Input not sorted by timestamp (relies on caller's ORDER BY)
- `GET` handler — **0% tested** (5+ behaviors untested)

---

### 6. `tests/lib/prisma.test.ts` — Score: 6/10 ⚠️

**Tests:** 2 | **Source:** `src/lib/prisma.ts` (40 lines)

**Covered:**
- Exports a prisma object when DATABASE_URL is set ✅
- Throws when DATABASE_URL is missing ✅

**Gaps:**
- Singleton pattern behavior not tested (re-import returns same instance)
- URL parsing logic not tested (different formats, missing params)
- `getParam` helper not tested (not exported)
- Log configuration levels not tested (development vs production)

---

### 7. `tests/prisma/seed.test.ts` — Score: 5/10 ⚠️

**Tests:** 11 | **Source:** `prisma/seed.ts` (220 lines)

**Covered:**
- csv-parse: basic CSV ✅, quoted fields ✅, empty lines ✅, escaped quotes ✅
- `safeInt`: valid ✅, invalid fallback ✅, custom fallback ✅
- `safeFloat`: valid ✅, invalid fallback ✅
- `nullableDate`: empty string ✅, invalid date ✅, valid date ✅

**Gaps (Critical):**

| Function | Lines | Tests? | Issue |
|---|---|---|---|
| `nullableString` | 54-56 | ❌ None | Simple but untested |
| `parseCsv` | 67-82 | ❌ None | File I/O — needs mocking |
| `seedTable` | 87-109 | ❌ None | Integration — needs Prisma mock |
| `mapEnergyConsumption` | 114-130 | ❌ None | **Critical — field mapping bugs** |
| `mapHvacPerformance` | 132-150 | ❌ None | **Critical — field mapping bugs** |
| `mapOccupancy` | 152-168 | ❌ None | **Critical — field mapping bugs** |
| `mapAlertsEvent` | 170-189 | ❌ None | **Critical — field mapping bugs** |

**Important:** Helpers tested in this file are **duplicated** from seed.ts. If someone changes `safeInt` in seed.ts but not in the test, tests pass but seed breaks.

---

## Coverage Gaps by Source File

| Source File | Lines | Exports | Coverage Estimate |
|---|---|---|---|
| `src/lib/aggregation.ts` | 20 | `aggregate` | ~85% ✅ |
| `src/lib/query-builder.ts` | 166 | `buildWhereClause`, `buildQuery`, `mapFieldName` | ~35% ⚠️ |
| `src/lib/schemas.ts` | 97 | 10 Zod schemas | **0%** ❌ |
| `src/lib/types.ts` | 51 | 0 (types only) | N/A |
| `src/lib/prisma.ts` | 40 | `prisma` | ~20% ❌ |
| `src/lib/utils.ts` | 6 | `cn` | **0%** ❌ |
| `src/app/api/query/route.ts` | 76 | `POST`, `processQueryResult` | ~20% ❌ |
| `src/app/api/columns/route.ts` | 96 | `GET`, `getTableColumns` | ~30% ⚠️ |
| `src/app/api/occupancy/latest/route.ts` | 49 | `GET`, `getLatestPerZone` | ~20% ❌ |
| `prisma/seed.ts` | 220 | Helpers + 4 mappers | ~15% ❌ |
| `scripts/generate-openapi.ts` | 333 | `toSchema` | **0%** ❌ |
| `src/components/**/*.tsx` | ~400+ | 16 components | **0%** ❌ |

---

## Test Quality Issues

1. **Dead mock setup** — `tests/unit/api-query.test.ts` mocks `@/lib/prisma` but tests never use Prisma.

2. **No CI integration** — No `.github/` directory, no CI config. Tests must be manually run.

3. **No coverage thresholds** — `vitest.config.ts` has no `coverage` configuration.

4. **Duplicate test code** — `tests/prisma/seed.test.ts` duplicates helper functions instead of importing them.

5. **Weak assertions** — Several tests use `toHaveProperty` without asserting exact values:
   - `api-columns.test.ts:7`: `expect(columns.length).toBeGreaterThan(0)` — doesn't check exact count
   - `prisma.test.ts:16`: `expect(mod).toHaveProperty("prisma")` — doesn't check it's a PrismaClient instance

6. **No test for Zod schema validation** — The API gatekeeper schemas are untested.

7. **No component tests** — 16 UI components with zero tests despite `@testing-library/react` being installed.

8. **No integration tests** — All tests are unit tests. No endpoint-to-database flow tests.

---

## Priority Recommendations

### 🔴 Critical — Must Add

**1. Zod Schema Tests** (`tests/unit/schemas.test.ts`)
- Test all 10 schemas: valid input acceptance, invalid input rejection, edge cases
- Cover `QueryRequestBodySchema`, `CardConfigSchema`, `GlobalFiltersSchema`, `TableNameSchema`, etc.

**2. API Handler Integration Tests** (`tests/integration/api-*.test.ts`)
- Test HTTP request → response for all 3 route handlers
- Use `NextRequest` directly to test status codes, response shapes, error handling

**3. Seed Mapper Tests**
- Test all 4 row mappers with sample CSV row data
- Export helpers from `seed.ts` to avoid duplication

**4. CI Pipeline** (`.github/workflows/test.yml`)
- GitHub Actions workflow running `pnpm install && pnpm prisma:generate && pnpm test && pnpm lint`

### 🟡 High Priority

**5. `buildWhereClause` Missing Branches**
- Test `timeRange: "last7"`, `timeRange: "custom"` with customStart/customEnd
- Test all card filter operators (neq, gt, gte, lt, lte)
- Test `floor: 0` edge case

**6. `buildQuery` Missing Branches**
- Test `type: "line"` with and without groupBy
- Test `type: "gauge"` 
- Test all 4 tables (not just `energy_consumption`)

**7. Coverage Configuration** in `vitest.config.ts`
```typescript
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html"],
  include: ["src/**/*.ts", "prisma/seed.ts"],
  thresholds: {
    statements: 60,
    branches: 50,
    functions: 60,
    lines: 60,
  },
},
```

### 🔵 Medium Priority

**8. `mapFieldName` Exhaustive Tests**
- Test ALL 30+ field mappings across all 4 tables
- Test pass-through behavior for unmapped fields

**9. `cn()` Utility Tests** (`tests/unit/utils.test.ts`)
- Class merging, conditional classes, Tailwind conflict resolution

**10. Component Tests**
- Setup testing-library with `@testing-library/react`
- Test `EmptyState`, `LoadingState`, `ErrorState`, `Button`, `ThemeToggle`

---

## Summary

| Metric | Current | Recommended | Delta |
|---|---|---|---|
| Test files | 7 | 16 | +9 |
| Total tests | 40 | ~125 | +85 |
| API handler tests | 0 | 9 | +9 |
| Schema validation tests | 0 | 10 | +10 |
| Seed mapper tests | 0 | 8 | +8 |
| Component tests | 0 | 12 | +12 |
| CI pipeline | None | GitHub Actions | +1 |
| Coverage reporting | None | v8 + thresholds | +1 |
| Integration tests | 0 | 6 | +6 |
