# Security Audit Report

**Audit date:** 2026-07-16
**Agent:** `security-auditor-agent`
**Scope:** Secrets, SQL injection, XSS, API security, dependencies, RSC security
**Artifacts audited:** 22 files

---

## Overall Score: 68/100

| Category | Status |
|---|--------|
| Secrets / Credential Exposure | **FAIL** 🔴 — Hardcoded credentials in source code |
| SQL Injection / Prisma Query Safety | **PASS** ✅ — No raw SQL, but monitor planned query builder |
| XSS / Script Injection | **PASS** ✅ — No unescaped user content |
| API Security | **WARN** ⚠️ — No API routes exist; forward-looking guidance |
| Dependency / Supply Chain | **WARN** ⚠️ — `radix-ui` meta-package risk |
| Next.js / RSC Security | **PASS** ✅ — Correct server/client boundaries |

---

## Critical Issues (Immediate Fix Required)

### [CRIT-001] Hardcoded SA Password in Seed Script Fallback

**Severity:** CRITICAL — CVSS 9.5
**Location:** `prisma/seed.ts:8`
**Status:** 🔴 FAIL

```typescript
const connectionUrl = process.env.DATABASE_URL || "sqlserver://localhost:1433;database=bms_dashboard;user=SA;password=Y0uRStrOng!P4ssw0rd;trustServerCertificate=true";
```

**Impact:** Any attacker with read access to this repository obtains the SQL Server SA password. An attacker could connect to the database, exfiltrate all building data, or pivot to the host.

**Evidence:**
- Line 8: Fallback URL committed in application source code
- Lines 17-21: `config.password` extracts from fallback URL — used at runtime
- `.gitignore` only ignores `.env*` — source `.ts` files are tracked and committed

**Fix:** Remove the fallback URL. Require `DATABASE_URL` at runtime:

```typescript
const connectionUrl = process.env.DATABASE_URL;
if (!connectionUrl) {
  console.error("FATAL: DATABASE_URL environment variable is required");
  process.exit(1);
}
```

---

## High Issues (Fix Before Deploy)

### [HIGH-001] SA Password in Healthcheck Command Line

**Severity:** HIGH — CVSS 7.5
**Location:** `docker-compose.yml:14`
**Status:** 🔴 FAIL

```yaml
test: /opt/mssql-tools18/bin/sqlcmd -S localhost -U SA -P ${SA_PASSWORD} -C -Q "SELECT 1" || exit 1
```

**Impact:** Password visible in process listings (`ps aux`) on the host and inside the container. Leaks into Docker event logs.

**Fix:** Quote the variable and consider a dedicated healthcheck user:

```yaml
test: /opt/mssql-tools18/bin/sqlcmd -S localhost -U SA -P "$SA_PASSWORD" -C -Q "SELECT 1" || exit 1
```

**Best fix:** Create a dedicated read-only healthcheck user in SQL Server.

### [HIGH-002] SA Password Hardcoded in `.env`

**Severity:** HIGH — CVSS 7.0
**Location:** `.env:2-3`
**Status:** 🟡 WARN

```
DATABASE_URL="sqlserver://localhost:1433;database=bms_dashboard;user=SA;password=Y0uRStrOng!P4ssw0rd;trustServerCertificate=true"
SA_PASSWORD="Y0uRStrOng!P4ssw0rd"
```

**Impact:** While `.env` is gitignored, any developer who clones the repo needs this file. Password stored in plaintext on disk.

**Fix:**
1. Generate a stronger, unique password (20+ truly random characters)
2. Use Docker Secrets or secret injection instead of checked-in `.env`

### [HIGH-003] Potential SQL Injection via Dynamic Query Construction

**Severity:** HIGH — CVSS 8.0 (Forward-looking)
**Location:** No code exists yet — design risk
**Status:** 🟡 WARN

**Issue:** The spec states: *"The frontend sends card configuration to the backend, which constructs and executes the appropriate SQL query"* (TechnicalTest.md line 72). If the backend interpolates user-provided column names without strict allowlisting, it creates SQL injection vulnerabilities.

**Fix (implement before building the API):**
1. **Never use `$queryRawUnsafe` or `$executeRawUnsafe`**
2. Maintain a strict allowlist of column names per table
3. Use typed Prisma `where` and `orderBy` objects — never raw filter strings
4. Consider `Prisma.sql` tagged templates if raw queries are unavoidable
5. Add a dedicated `query-builder.ts` module with allowlist validation

---

## Medium Issues (Should Fix)

### [MED-001] Community `radix-ui` Meta-Package Supply Chain Risk

**Severity:** MEDIUM — CVSS 4.5
**Location:** `package.json:33`
**Status:** 🟡 WARN

**Issue:** The project depends on `radix-ui: ^1.6.2` (community meta-package) instead of official `@radix-ui/*` scoped packages.

**Impact:** If the meta-package is compromised (typo-squatted, account takeover), the entire app is compromised.

**Fix:** Replace with direct scoped packages:

```typescript
// Instead of: import { Slot } from "radix-ui";
// Use:        import { Slot } from "@radix-ui/react-slot";
```

```json
"@radix-ui/react-dialog": "^1.1.14",
"@radix-ui/react-select": "^2.1.6",
"@radix-ui/react-tabs": "^1.1.5",
"@radix-ui/react-tooltip": "^1.2.3",
"@radix-ui/react-slot": "^1.2.1"
```

### [MED-002] Chart `dangerouslySetInnerHTML` — Needs Guardrails

**Severity:** MEDIUM — CVSS 3.0
**Location:** `src/components/ui/chart.tsx:89-106`
**Status:** 🟡 WARN

**Issue:** `ChartStyle` uses `dangerouslySetInnerHTML` to inject CSS. Currently safe (static config), but future user-controlled chart colors would create a CSS injection vector.

**Fix:** Add a warning comment and sanitize color values:

```typescript
// WARNING: ChartConfig values must be statically defined.
// NEVER pass user-controlled data into color/theme values.
```

### [MED-003] Basic CSV Parser Has No Quoted-Field Support

**Severity:** MEDIUM — CVSS 5.0 (Data Integrity)
**Location:** `prisma/seed.ts:33-63`
**Status:** 🔴 FAIL

**Issue:** `parseCsv` splits on all commas without handling quoted fields. If any CSV field contains a comma, columns shift and data corrupts.

**Fix:** Use `csv-parse`:

```bash
pnpm add csv-parse
```

```typescript
import { parse } from "csv-parse/sync";
const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
```

### [MED-004] No Input Validation on Numeric Parsing in Seed

**Severity:** MEDIUM — CVSS 4.0 (Data Integrity)
**Location:** `prisma/seed.ts:86,91-96,117,122-129,150,154,159-160,188-189`
**Status:** 🟡 WARN

**Issue:** `parseInt()` and `parseFloat()` called without validation. Malformed data produces `NaN`, which Prisma rejects at insert time.

**Fix:** Add numeric validation helpers:

```typescript
function safeParseInt(val: string, fallback = 0): number {
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
}
function safeParseFloat(val: string, fallback = 0): number {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}
```

---

## Low / Informational Findings

### [INFO-001] `dotenv` Listed as Production Dependency

**Location:** `package.json:28`
**Observation:** Only used by `prisma.config.ts` for dev-time Prisma config. Should be `devDependencies`.

### [INFO-002] Inconsistent Model Name `AlertsEvent`

**Location:** `prisma/schema.prisma:69`
**Observation:** Plural + singular (`AlertsEvent`) instead of conventional singular (`AlertEvent`).

### [INFO-003] Weak Password Pattern Analysis

**Location:** `.env:2-3` and `prisma/seed.ts:8`
**Observation:** Password `Y0uRStrOng!P4ssw0rd` uses leet-speak substitutions that password cracking tools break efficiently. Recommend 24+ truly random characters.

### [INFO-004] No Authentication or Authorization Layer

**Observation:** By design per spec (internal facilities tool). Document this as a conscious decision.

### [INFO-005] `suppressHydrationWarning` is Correctly Used

**Location:** `src/app/layout.tsx:37`
**Status:** ✅ PASS — Applied only to `<html>` for next-themes dark mode hydration.

### [INFO-006] Server/Client Component Boundary is Correct

**Status:** ✅ PASS
- `layout.tsx` — Server Component ✅
- `page.tsx` — Server Component ✅
- `ThemeProvider.tsx` — `"use client"` ✅
- `QueryProvider.tsx` — `"use client"` ✅
- No `"use server"` actions exist ✅

### [INFO-007] No API Routes Exist — Security by Absence

**Observation:** No `src/app/api/` files. Attack surface is zero. Plan ahead: Zod validation, column allowlisting, rate limiting, no raw stacks in errors.

### [INFO-008] `trustServerCertificate=true` in Connection String

**Location:** `.env:2` and `prisma/seed.ts:23-24`
**Observation:** Disables TLS certificate validation. Acceptable for local dev; must remove in production with proper CA-signed certificate.

---

## Verdict & Priority Remediation

**Verdict: FAIL** 🔴 — Must remediate Critical and High findings before deployment.

| # | Issue | Severity | File | Fix |
|---|-------|----------|------|-----|
| 1 | Hardcoded SA password in seed fallback | 🔴 CRITICAL | `prisma/seed.ts:8` | Remove fallback; require `DATABASE_URL` env |
| 2 | SA password in Docker healthcheck | 🟠 HIGH | `docker-compose.yml:14` | Quote variable; use healthcheck user |
| 3 | Weak SA password in `.env` | 🟠 HIGH | `.env:2-3` | Generate strong random password |
| 4 | Potential SQL injection (planned) | 🟠 HIGH | Design | Allowlist column names in query builder |
| 5 | `radix-ui` supply chain risk | 🟡 MED | `package.json:33` | Replace with `@radix-ui/*` scoped packages |
| 6 | No input validation on numeric parse | 🟡 MED | `prisma/seed.ts` | Add safe-number wrappers |
| 7 | Fragile CSV parser | 🟡 MED | `prisma/seed.ts:33-63` | Use `csv-parse` |
| 8 | `dotenv` in wrong deps group | 🟢 INFO | `package.json:28` | Move to devDependencies |

After remediation of Critical and High issues, the score would rise to approximately **84/100**.
