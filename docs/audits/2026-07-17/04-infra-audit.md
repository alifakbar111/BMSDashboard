# Infrastructure & Database Audit Report

**Audit date:** 2026-07-17
**Agent:** `infra-agent`
**Scope:** Prisma schema, seed script, Docker, env config, PrismaClient, data directory, generated client, package scripts
**Artifacts audited:** 15 files + 4 CSVs

---

## Overall Score: 87/100

| Category | Score | Grade |
|---|---|---|
| Schema Design & Indexes | 22/25 | ✅ Good |
| Seed Script (CSV import) | 18/20 | ✅ Good |
| Docker Configuration | 14/15 | ✅ Good |
| Environment & Config Files | 12/15 | ⚠️ Fair |
| PrismaClient Singleton | 9/10 | ✅ Good |
| Package.json & Dependencies | 4/5 | ✅ Good |
| Data Directory & Documentation | 3/5 | ⚠️ Fair |
| Generated Client & .gitignore | 5/5 | ✅ Good |

---

## Previous Audit Fix Verification

| # | Fix | Status | Evidence |
|---|---|---|---|
| 1 | Docker image: `mcr.microsoft.com/mssql/server:2022-latest` | ✅ PASS | `docker-compose.yml:3` — correctly uses `2022-latest` |
| 2 | SA_PASSWORD quoted in healthcheck | ✅ PASS | Line 14: `-P "${SA_PASSWORD}"` — double-quoted with braces |
| 3 | Database indexes on all 4 models | ✅ PASS | All models have `@@index([buildingId, floor, zone, timestamp])` + `@@index([timestamp])` + model-specific indexes |
| 4 | PrismaClient singleton at `src/lib/prisma.ts` | ✅ PASS | File exists with global caching pattern (`globalThis.prisma`) |
| 5 | Seed script rewritten with csv-parse, safe numbers, dotenv, $transaction | ✅ PASS | Uses `csv-parse/sync`, `safeInt/safeFloat/nullableString/nullableDate`, `import "dotenv/config"`, `prisma.$transaction()` |
| 6 | .env.example created with placeholder values | ✅ PASS | `.env.example` exists with `CHANGE_ME_TO_STRONG_PASSWORD` |
| 7 | `prisma:migrate` script in package.json | ✅ PASS | `"prisma:migrate": "prisma migrate dev"` present |
| 8 | No hardcoded password in seed.ts | ✅ PASS | Seed reads from `process.env.DATABASE_URL`, extracts via regex |

---

## 🔴 HIGH Priority — New Findings

### F1: `.gitignore` pattern `.env*` blocks `.env.example` from being committed

**File:** `.gitignore:34`
**Severity:** HIGH
**Issue:** The glob pattern `.env*` ignores ALL files starting with `.env`, including the documented-on-purpose `.env.example` and `.env` itself. This means `.env.example` (which is designed to be a committed template) will never be tracked by git. New developers cloning the repo won't see what environment variables are required.

**Fix:**
```
# Change .gitignore from:
.env*
# To:
.env
.env.local
.env.production
.env.development
```
Or add negation:
```
.env*
!.env.example
```

---

### F2: Missing `DATA_DICTIONARY.md` in `data/` directory

**File:** `data/`
**Severity:** HIGH
**Issue:** The data dictionary exists only at `TechnicalTest/data/DATA_DICTIONARY.md` (162 lines, excellent documentation). It is completely absent from `data/` where the CSVs live. Both AGENTS.md and agent system prompts reference `data/DATA_DICTIONARY.md`. Developers and agents cannot discover column definitions without digging into `TechnicalTest/`.

**Fix:** Copy or symlink `TechnicalTest/data/DATA_DICTIONARY.md` → `data/DATA_DICTIONARY.md`.

---

### F3: No Prisma migration history exists

**File:** `prisma/migrations/` directory does not exist
**Severity:** HIGH
**Issue:** The `prisma/migrations/` directory is entirely absent. The project has never run `prisma migrate dev`, only (potentially) `prisma db push`. For any deployed or shared database, this means schema changes cannot be version-controlled or rolled back.

**Fix:** Run `pnpm prisma:migrate` to create an initial migration. Ensure `prisma/migrations/` is committed.

---

## 🟡 MEDIUM Priority

### F4: `prisma:seed` bypasses Prisma's seed config

**File:** `package.json:17` (`"prisma:seed": "tsx prisma/seed.ts"`)
**Severity:** MEDIUM
**Issue:** Prisma 7's `prisma.config.ts` already defines the seed entrypoint: `migrations: { seed: "tsx prisma/seed.ts" }`. The npm script duplicates this by invoking `tsx` directly. If the seed config changes, it must be updated in two places.

**Fix:** Change `prisma:seed` to delegate: `"prisma:seed": "prisma db seed"`.

---

### F5: Index coverage gap — occupancy/latest query pattern

**File:** `prisma/schema.prisma` (model `Occupancy`) + `src/app/api/occupancy/latest/route.ts`
**Severity:** MEDIUM
**Issue:** The `/api/occupancy/latest` endpoint queries:
```ts
where: { buildingId, floor: floorNum },
orderBy: { timestamp: "desc" }
```
The current composite index `@@index([buildingId, floor, zone, timestamp])` can filter on `buildingId+floor` but cannot efficiently sort by `timestamp` because `zone` is in the middle of the index key.

**Fix:** Add a dedicated composite index for this query pattern:
```prisma
@@index([buildingId, floor, timestamp])
```

---

### F6: `NEXT_PUBLIC_APP_NAME` defined but never used

**Files:** `.env:6`, `.env.example:6`
**Severity:** MEDIUM
**Issue:** Set in both `.env` and `.env.example` but never referenced anywhere in `src/`.

**Fix:** Remove from both `.env` and `.env.example`, or implement its use in the UI.

---

## 🟢 LOW Priority

### F7: `TechnicalTest` directory name mismatch with documentation

**Files:** `AGENTS.md` references `Technical Test/` (with space), actual directory is `TechnicalTest` (no space)

### F8: `@prisma/client-runtime-utils` in dependencies

**File:** `package.json:26`
**Issue:** Internal Prisma package that is pulled in transitively. Explicitly listing it can lead to version conflicts.

### F9: Seed script could use `createMany` for performance

**File:** `prisma/seed.ts:100-105`
**Issue:** Uses individual `create` calls inside `$transaction`. `createMany()` would be more efficient.

### F10: `PrismaClient` has no connection pooling configuration

**File:** `src/lib/prisma.ts`
**Issue:** No explicit pool configuration (min/max connections, idle timeout).

---

## Detailed Findings

### Prisma Schema — `prisma/schema.prisma` — Score: 22/25

| Aspect | Verdict |
|---|---|
| Field types match DATA_DICTIONARY | ✅ All correct |
| `@map()` for snake_case columns | ✅ All columns properly mapped |
| `@@map()` for table names | ✅ All 4 models have `@@map(table_name)` |
| Composite indexes per model | ✅ `@@index([buildingId, floor, zone, timestamp])` on all models |
| Single-column indexes | ✅ `@@index([timestamp])` on all models |
| Model-specific indexes | ✅ Energy: `deviceId`; HVAC: `unitId`; Alerts: `severity`, `category`, `status`, `deviceId` |
| ID field | ✅ All use `@id @default(autoincrement())` |
| Optional fields | ✅ `AlertsEvent.deviceId?`, `resolvedAt?`, `acknowledgedBy?` |

### Seed Script — `prisma/seed.ts` — Score: 18/20

| Aspect | Verdict |
|---|---|
| csv-parse/sync import | ✅ |
| dotenv/config import | ✅ |
| Safe number helpers | ✅ `safeInt`, `safeFloat`, `nullableString`, `nullableDate` |
| $transaction usage | ✅ |
| DRY pattern | ✅ Generic `seedTable()` function |
| Row mappers per model | ✅ 4 mappers |
| Empty CSV handling | ✅ Warns and skips |
| Error handling | ✅ `.catch()` with `process.exit(1)`, `$disconnect` in `.finally()` |

### Docker Configuration — `docker-compose.yml` — Score: 14/15

| Aspect | Verdict |
|---|---|
| Image tag | ✅ `mcr.microsoft.com/mssql/server:2022-latest` |
| SA_PASSWORD from env | ✅ `${SA_PASSWORD}` — not hardcoded |
| Healthcheck | ✅ sqlcmd with `-C`, `"${SA_PASSWORD}"` quoted |
| Persistence volume | ✅ `sqlserver_data` named volume |
| `restart` policy | ⚠️ Missing |

### PrismaClient Singleton — `src/lib/prisma.ts` — Score: 9/10

| Aspect | Verdict |
|---|---|
| Global singleton pattern | ✅ `globalThis.prisma` caching |
| `@prisma/adapter-mssql` usage | ✅ |
| Connection URL parsing | ✅ Regex-based extraction |
| Non-production logging | ✅ `["query", "warn", "error"]` in dev |
| Error on missing URL | ✅ Throws if `DATABASE_URL` not set |

---

## Priority Remediation

| # | Issue | Severity | File | Fix |
|---|---|---|---|---|
| 1 | `.gitignore` blocks `.env.example` | 🔴 HIGH | `.gitignore:34` | Add `!.env.example` exception |
| 2 | Missing `DATA_DICTIONARY.md` in `data/` | 🔴 HIGH | `data/` | Copy from `TechnicalTest/data/` |
| 3 | No migration history | 🔴 HIGH | `prisma/migrations/` | Run `prisma migrate dev` |
| 4 | `prisma:seed` bypasses Prisma config | 🟡 MEDIUM | `package.json:17` | Change to `prisma db seed` |
| 5 | Index gap for occupancy/latest | 🟡 MEDIUM | `schema.prisma` | Add `[buildingId, floor, timestamp]` |
| 6 | Unused `NEXT_PUBLIC_APP_NAME` | 🟡 MEDIUM | `.env.example` | Remove or implement |
| 7 | Path reference mismatch in AGENTS.md | 🟢 LOW | `AGENTS.md` | Fix `Technical Test/` → `TechnicalTest` |
| 8 | `@prisma/client-runtime-utils` in deps | 🟢 LOW | `package.json:26` | Verify and potentially remove |
| 9 | Seed `createMany` optimization | 🟢 LOW | `seed.ts:100-105` | Consider `createMany()` |
| 10 | Connection pool configuration | 🟢 LOW | `prisma.ts` | Add explicit pool config |
