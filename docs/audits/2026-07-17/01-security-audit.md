# Security Audit Report

**Audit date:** 2026-07-17
**Agent:** `security-auditor-agent`
**Scope:** Full codebase — API routes, lib files, components, pages, infrastructure, config, scripts, OpenAPI spec
**Artifacts audited:** 39 files

---

## Overall Score: 68/100 — FAIL

| Category | Score | Verdict |
|---|---|---|
| SQL Injection / Prisma Injection | 90/100 | ✅ Good — no raw queries, Prisma parameterizes all inputs |
| Zod Validation | 65/100 | ⚠️ Field names not allowlisted, no date format validation |
| Prisma Safety | 100/100 | ✅ No `$queryRawUnsafe` or `$executeRawUnsafe` |
| API Security | 35/100 | ❌ No auth, no rate limiting, no CSRF, error leakage |
| Secrets / Credentials | 70/100 | ⚠️ `.env.example` gitignored, `.env` has real password (gitignored) |
| XSS | 85/100 | ⚠️ `dangerouslySetInnerHTML` in chart with warning comment |
| Dependency Risk | 75/100 | ⚠️ Bleeding-edge versions (TS 6.0, Vitest 4.x, dnd-kit 10.0) |
| Next.js / RSC Security | 60/100 | ⚠️ No middleware, no auth, no CSRF |
| OpenAPI Spec | 90/100 | ✅ Clean, no leaked secrets |

---

## 🔴 CRITICAL (Immediate Fix Required)

### C-1: `.env.example` is gitignored — no env template for developers
- **File:** `.gitignore` line 34
- **Issue:** The glob pattern `.env*` matches both `.env` and `.env.example`. The `.env.example` file is meant to be a committed template, but it's excluded from version control.
- **Impact:** New developers cloning the repo have no reference for required environment variables.
- **Fix:**
  ```
  # Replace .gitignore line 34:
  .env
  .env.local
  .env.development.local
  .env.test.local
  .env.production.local
  ```
  Then `git add .env.example` to track it.

---

## 🟠 HIGH (Fix Before Deploy)

### H-1: Error message leakage in `/api/query` — stack traces exposed to client
- **File:** `src/app/api/query/route.ts` line 72
- **Issue:** The catch block returns `(e as Error).message` to the client in the `details` field. Prisma errors can contain database schema details.
- **Impact:** Information disclosure — attacker can probe database schema via malformed requests.
- **Fix:**
  ```typescript
  } catch (e) {
    console.error("Query API error:", e);
    return NextResponse.json(
      { error: "Failed to execute query" },
      { status: 500 },
    );
  }
  ```

### H-2: No authentication on any API endpoint
- **Files:** `src/app/api/query/route.ts`, `src/app/api/columns/route.ts`, `src/app/api/occupancy/latest/route.ts`
- **Issue:** All three API endpoints are publicly accessible with no authentication, authorization, or API key checks.
- **Impact:** Any network client can query the full database and extract all building data.
- **Fix:** Implement authentication middleware with API key check:
  ```typescript
  // src/middleware.ts
  import { NextResponse } from "next/server";
  import type { NextRequest } from "next/server";

  export function middleware(request: NextRequest) {
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  export const config = {
    matcher: "/api/:path*",
  };
  ```

### H-3: No security headers configured
- **File:** `next.config.ts`
- **Issue:** No Content Security Policy (CSP), X-Frame-Options, X-Content-Type-Options, or other security headers.
- **Impact:** Vulnerable to clickjacking, MIME-type sniffing, lacks XSS mitigation via CSP.
- **Fix:**
  ```typescript
  const nextConfig: NextConfig = {
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
  ```

### H-4: No CSRF protection on POST `/api/query`
- **File:** `src/app/api/query/route.ts`
- **Issue:** The POST endpoint accepts JSON with no CSRF token or origin validation.
- **Fix:** Validate the `Origin` or `Referer` header, or require a custom header.

### H-5: No request body size limits
- **File:** `src/app/api/query/route.ts`
- **Issue:** The POST endpoint accepts arbitrarily large JSON payloads with no size limit.
- **Impact:** Denial of service via memory exhaustion.
- **Fix:**
  ```typescript
  const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
  if (contentLength > 100_000) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }
  ```

### H-6: `AxisConfigSchema.field` and `FilterConfigSchema.field` are unvalidated strings
- **File:** `src/lib/schemas.ts` lines 25, 30
- **Issue:** Field names have no allowlist validation — unvalidated strings flow into `mapFieldName()` which passes through unknown fields as-is.
- **Impact:** An attacker can send arbitrary field names to probe the Prisma schema.
- **Fix:** Add field allowlist validation using `z.enum()` with all valid column names.

### H-7: Swagger UI exposes "Try it out" in production
- **File:** `src/app/docs/page.tsx`
- **Issue:** The Swagger UI page is publicly accessible at `/docs` with interactive "Try it out" functionality.
- **Fix:** Disable "Try it out" in production or add authentication to the docs page.

---

## 🟡 MEDIUM (Should Fix)

### M-1: `mapFieldName` passes through unknown fields as-is
- **File:** `src/lib/query-builder.ts` line 99
- **Issue:** `return fieldMappings[table]?.[field] ?? field;` — if a field name is not in the mapping dictionary, it's returned unchanged.
- **Fix:** Throw an error for unknown fields instead of passing them through.

### M-2: `customStart` and `customEnd` have no date format validation
- **File:** `src/lib/schemas.ts` lines 57-58
- **Issue:** `z.string().nullable()` with no format validation. Invalid date strings produce `Invalid Date` objects.
- **Fix:** Add `z.string().datetime().nullable()` or similar format validation.

### M-3: `(prisma as any)[query.modelName]` bypasses type safety
- **File:** `src/app/api/query/route.ts` line 48
- **Issue:** Dynamic property access using `as any` completely bypasses TypeScript type checking.
- **Fix:** Use a typed map instead:
  ```typescript
  const models = {
    energyConsumption: prisma.energyConsumption,
    hvacPerformance: prisma.hvacPerformance,
    occupancy: prisma.occupancy,
    alertsEvent: prisma.alertsEvent,
  } as const;
  const model = models[query.modelName as keyof typeof models];
  ```

### M-4: `NEXT_PUBLIC_APP_NAME` is unused
- **File:** `.env.example` line 6, `.env` line 6
- **Issue:** Defined but never referenced anywhere in the codebase. Dead configuration.

### M-5: No rate limiting on any endpoint
- **Files:** All three API route handlers
- **Issue:** No rate limiting — attacker can flood `/api/query` with expensive database queries.
- **Fix:** Implement rate limiting using `@upstash/rate-limit` or similar.

---

## 🔵 LOW / Informational

### L-1: No HTTPS enforcement
- **Issue:** OpenAPI spec and dev server use `http://localhost:3000`.

### L-2: No input sanitization on `buildingId` query parameter
- **File:** `src/app/api/occupancy/latest/route.ts` line 19
- **Fix:** Add basic length and character validation.

### L-3: `@dnd-kit/sortable` at version `^10.0.0` — potentially unstable
- **File:** `package.json` line 23
- **Issue:** Core is at `^6.3.1` but sortable is at `^10.0.0` — version mismatch risk.

### L-4: No `@prisma/client` generation in postinstall
- **File:** `package.json`
- **Fix:** Add `"postinstall": "prisma generate"` script.

---

## Priority Remediation

| # | Issue | Severity | File | Fix |
|---|---|---|---|---|
| 1 | `.env.example` gitignored | 🔴 CRITICAL | `.gitignore:34` | Change `.env*` to explicit list |
| 2 | Error message leakage | 🟠 HIGH | `query/route.ts:72` | Return generic message |
| 3 | No authentication | 🟠 HIGH | All API routes | Add middleware with API key |
| 4 | No security headers | 🟠 HIGH | `next.config.ts` | Add CSP, XFO, etc. |
| 5 | No CSRF protection | 🟠 HIGH | `query/route.ts` | Validate Origin header |
| 6 | No body size limits | 🟠 HIGH | `query/route.ts` | Check content-length |
| 7 | Field names not allowlisted | 🟠 HIGH | `schemas.ts:25,30` | Use `z.enum()` |
| 8 | Swagger UI exposed | 🟠 HIGH | `docs/page.tsx` | Disable Try it out |
| 9 | `mapFieldName` pass-through | 🟡 MEDIUM | `query-builder.ts:99` | Throw on unknown |
| 10 | No date format validation | 🟡 MEDIUM | `schemas.ts:57-58` | Add datetime() |
| 11 | `prisma as any` cast | 🟡 MEDIUM | `query/route.ts:48` | Typed model map |
| 12 | No rate limiting | 🟡 MEDIUM | All API routes | Add rate limiter |
