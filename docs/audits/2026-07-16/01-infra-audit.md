# Infrastructure & Database Audit Report

**Audit date:** 2026-07-16
**Agent:** `infra-agent`
**Scope:** Prisma schema, seed script, Docker/DB config, project config, missing infrastructure
**Artifacts audited:** 8 files + 4 CSVs

---

## Overall Score: 68/100

| Category | Score | Status |
|---|---|---|
| 1. Prisma Schema | **75/100** | Functional but missing indexes |
| 2. Seed Script | **70/100** | Fragile parser, no dotenv import |
| 3. Docker/Environment | **70/100** | Broken image tag, no .env.example |
| 4. Project Config | **85/100** | Minor gaps |
| 5. Missing Infrastructure | **40/100** | No PrismaClient singleton |

---

## 1. Prisma Schema Audit

### 1.1 Field Mapping vs DATA_DICTIONARY

| Model | Status | Details |
|---|---|---|
| `EnergyConsumption` | ✅ PASS | All 13 columns mapped, types match dictionary |
| `HvacPerformance` | ✅ PASS | All 15 columns mapped correctly |
| `Occupancy` | ✅ PASS | All 13 columns mapped correctly |
| `AlertsEvent` | ✅ PASS | All 17 columns mapped, nullables correct |

All `@map(...)` annotations match the CSV snake_case headers perfectly.

### 1.2 Type Appropriateness

| Field | Issue | Severity | Fix |
|---|---|---|---|
| `compressorHours` (Float) | Semantically an integer (cumulative runtime hours). Data shows whole numbers (`12450`, `8900`). | **Low** | Consider `Int` if data never has fractional hours |
| `durationMinutes` (Int) | ✅ Correct — integer values | PASS | — |
| `co2_ppm` (Int) | ✅ Correct — integer values | PASS | — |
| `airQualityIndex` (Int) | ✅ Correct — integer 0-100 | PASS | — |
| All Float fields | ✅ Match dictionary | PASS | — |

### 1.3 Index Annotations — **FAIL** ⚠️

There are **zero indexes** on non-primary-key columns. The data dictionary explicitly documents cross-file joins on `(building_id, floor, zone)` and time-range filtering on `timestamp`.

**Impact: HIGH** — Any production query joining across tables or filtering by building/zone will do full table scans.

**Recommended indexes:**

```prisma
// EnergyConsumption
@@index([buildingId, floor, zone, timestamp])
@@index([deviceId])
@@index([timestamp])

// HvacPerformance
@@index([buildingId, floor, zone, timestamp])
@@index([unitId])
@@index([timestamp])

// Occupancy
@@index([buildingId, floor, zone, timestamp])
@@index([timestamp])

// AlertsEvent
@@index([buildingId, floor, zone, timestamp])
@@index([severity])
@@index([category])
@@index([status])
@@index([deviceId])
@@index([timestamp])
```

### 1.4 SQL Server Datasource

**PASS** ✅ — The datasource block intentionally omits `url` (Prisma 7 config file pattern). The `url` is provided via `prisma.config.ts` using `env("DATABASE_URL")`.

### 1.5 Generator Output Path

**PASS** ✅ — All paths resolve correctly:
- Schema: `output = "../src/generated/prisma"` → resolves to `src/generated/prisma/`
- `.gitignore`: `/src/generated/` matches
- Seed import: `"../src/generated/prisma/client"` — consistent

---

## 2. Seed Script Audit

### 2.1 CSV Parser (`parseCsv`) — **FAIL** ⚠️

**File:** `prisma/seed.ts`, lines 33–64

```typescript
const values = line.split(",");
```

**Issues:**
- **No quoted field handling** — if any CSV value contains a comma, the parser will split incorrectly
- **No escape handling** — `""` or `\"` sequences in quoted fields would not be decoded

**Impact: MEDIUM** — Current data doesn't have commas in fields, but this is fragile.

**Fix:** Use `csv-parse` or implement RFC 4180-aware parser:

```typescript
import { parse } from "csv-parse/sync";
const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true });
```

### 2.2 Type Conversion Safety — **WARN** ⚠️

**File:** `prisma/seed.ts`, e.g. line 86: `parseInt(r.floor, 10)`

- If a CSV field is corrupt (empty string, non-numeric), `parseInt("")` returns `NaN`
- Same for `parseFloat("")` → `NaN`
- **No validation layer** — assumes all data is clean

**Impact: LOW** — Current data is clean, but fragile.

**Fix:** Add safe-number helpers:

```typescript
function safeInt(val: string, fallback = 0): number {
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
}
function safeFloat(val: string, fallback = 0): number {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}
```

### 2.3 Insert Pattern — Row-by-Row vs `createMany` — **WARN** ⚠️

**File:** `prisma/seed.ts`, lines 81–99

- ~200 total rows → 200 individual queries
- No `createMany` usage
- Each `await` serializes inserts
- **Missing transaction:** if insert #50 fails, rows 1–49 are already committed

**Fix:** Wrap in transaction or use `createMany`:

```typescript
await prisma.$transaction(
  raw.map((r) => prisma.energyConsumption.create({ data: { ... } }))
);
// OR
await prisma.energyConsumption.createMany({
  data: raw.map(r => ({ ... })),
});
```

### 2.4 `nullableString` / `nullableDate` — **PASS** ✅

Correctly returns `null` for empty strings. `nullableDate` guards against empty values.

**Note:** Could still produce `Invalid Date` for malformed non-empty strings. Consider:

```typescript
function nullableDate(val: string): Date | null {
  if (val === "") return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}
```

### 2.5 Adapter Initialization — **PASS** ✅

Correct Prisma 7 adapter pattern with `@prisma/adapter-mssql`. Connection string parsing handles the `sqlserver://host:port;key=value` format.

**Issue:** `dotenv` is NOT imported in `seed.ts`. Running via `tsx prisma/seed.ts` directly falls back to hardcoded defaults.

**Fix:** Add `import "dotenv/config"` to seed.ts.

---

## 3. Docker / Environment Audit

### 3.1 SQL Server Image Tag — **FAIL** 🔴

**File:** `docker-compose.yml`, line 3

```yaml
image: mcr.microsoft.com/mssql/server:2025-latest
```

SQL Server 2025 does not have a stable/public release. The latest stable image is `2022-latest`.

**Impact: HIGH** — Docker Compose will fail on startup.

**Fix:**
```yaml
image: mcr.microsoft.com/mssql/server:2022-latest
```

### 3.2 Hardcoded Passwords — **WARN** ⚠️

- `.env*` is in `.gitignore` — file won't be committed ✅
- No `.env.example` — new developers don't know what variables to create
- Password reused in both `DATABASE_URL` and `SA_PASSWORD`

**Fix:** Create `.env.example` with placeholder values.

### 3.3 Healthcheck — **PASS** ✅

Uses `mssql-tools18` (correct for 2022+), `-C` flag for trust certificate (required), reasonable interval/timeout values.

### 3.4 DATABASE_URL Format — **PASS** ✅

Format `sqlserver://host:port;database=db;user=user;password=pwd;key=value` is correct for `@prisma/adapter-mssql` (via `tedious`).

---

## 4. Project Config Audit

### 4.1 Package Scripts — **PASS** ✅

All essential scripts present: `prisma:generate`, `prisma:push`, `prisma:seed`, `prisma:studio`.

**Missing:** `prisma:migrate` for production migration workflow.

### 4.2 Generated Client in .gitignore — **PASS** ✅

`/src/generated/` matches the `output` path in schema.

### 4.3 prisma.config.ts — **PASS** ✅

Uses Prisma 7 config file pattern with `defineConfig` and `env("DATABASE_URL")`. Correct schema path. `dotenv` loaded before config.

### 4.4 dotenv Usage — **WARN** ⚠️

- `prisma.config.ts`: imports `"dotenv/config"` ✅
- `prisma/seed.ts`: **does NOT import dotenv** ❌

**Fix:** Add `import "dotenv/config"` at top of `prisma/seed.ts`.

### 4.5 Package Manager Alignment — **PASS** ✅

- `packageManager: "pnpm@11.13.1"` specified
- `pnpm-lock.yaml` exists
- All scripts use `tsx` (in devDependencies)

---

## 5. Missing Infrastructure

### 5.1 `src/lib/prisma.ts` — **FAIL** 🔴 (Missing)

A singleton PrismaClient factory is essential for:
- **Connection pooling** — Next.js serverless hot reloads
- **Query logging** — `log: ["query"]` for debugging
- **Centralized error handling** — consistent error mapping

**Impact: HIGH** — Every route file would duplicate initialization, leading to connection thrash.

**Recommended implementation:**

```typescript
// src/lib/prisma.ts
import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionUrl = process.env.DATABASE_URL!;
const server = connectionUrl.match(/sqlserver:\/\/([^:;]+)/)?.[1] ?? "localhost";
const port = parseInt(connectionUrl.match(/:(\d+);/)?.[1] ?? "1433", 10);

const adapter = new PrismaMssql({
  server, port,
  database: connectionUrl.match(/database=([^;]+)/)?.[1] ?? "bms_dashboard",
  user: connectionUrl.match(/user=([^;]+)/)?.[1] ?? "SA",
  password: connectionUrl.match(/password=([^;]+)/)?.[1] ?? "",
  options: {
    encrypt: connectionUrl.includes("encrypt=true"),
    trustServerCertificate: !connectionUrl.includes("trustServerCertificate=false"),
  },
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### 5.2 Missing: Migration History — **WARN** ⚠️

`prisma/migrations/` does not exist. Uses `prisma db push` (no migration tracking).

### 5.3 Missing: Seed Fallback Warning — **WARN** ⚠️

Seed script should warn when falling back to hardcoded connection string.

### 5.4 Missing: Row Count Assertion — **LOW**

No verification that CSV row count matches expectations from data dictionary.

---

## Priority Remediation

| # | Issue | Severity | File | Fix |
|---|-------|----------|------|-----|
| 1 | Broken Docker image tag | 🔴 HIGH | `docker-compose.yml:3` | `2025-latest` → `2022-latest` |
| 2 | Missing indexes | 🔴 HIGH | `prisma/schema.prisma` | Add `@@index` annotations |
| 3 | No PrismaClient singleton | 🔴 HIGH | `src/lib/prisma.ts` missing | Create singleton with query logging |
| 4 | Fragile CSV parser | 🟠 MEDIUM | `prisma/seed.ts:33-63` | Use `csv-parse` or RFC 4180 parser |
| 5 | Missing `.env.example` | 🟠 MEDIUM | Root | Create for developer onboarding |
| 6 | Missing `dotenv` in seed.ts | 🟠 MEDIUM | `prisma/seed.ts` | Add `import "dotenv/config"` |
| 7 | Unsafe parseInt/parseFloat | 🟠 MEDIUM | `prisma/seed.ts` | Add safe-number wrappers |
| 8 | No transaction wrapping | 🟠 LOW | `prisma/seed.ts` | Wrap in `$transaction` |
| 9 | Missing `prisma:migrate` script | 🟢 LOW | `package.json` | Add script |
| 10 | `compressorHours` type | 🟢 LOW | `schema.prisma` | Consider `Int` |
