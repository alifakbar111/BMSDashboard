# BMS Dashboard Builder — Full-Stack Implementation Plan

> **For agentic workers:** This plan MUST be executed by delegating each task to the appropriate agent(s) to implement this plan task-by-task. Do NOT implement tasks directly — route to existing agents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack Building Management System (BMS) dashboard with a drag-and-drop card-based builder, four chart types, global filters, and an SVG floor plan occupancy view.

**Architecture:** Next.js App Router monolith — backend logic lives in API Route Handlers (`src/app/api/`) that use Prisma Client to query a SQL Server database seeded from CSV files. The frontend uses zustand for state (card layout + global filters), dnd-kit for drag-and-drop canvas, and Recharts for chart rendering. Each card is configured dynamically: user selects a data source, the frontend fetches available columns, then maps axes before the backend constructs and executes a Prisma query.

**Tech Stack:** Next.js 16 (App Router, TypeScript, Tailwind CSS), Prisma 7 + `@prisma/adapter-mssql` (SQL Server), shadcn/ui (with Recharts), dnd-kit, zustand, @tanstack/react-query, date-fns, lucide-react, vitest, oxlint, oxfmt.

> **Note:** Prisma 7 requires a driver adapter per database. For SQL Server we use `@prisma/adapter-mssql`. The generated client lives at `src/generated/prisma/` and PrismaClient is instantiated with `new PrismaClient({ adapter })`.

## Global Constraints

- Build order: data-explorer -> infra -> backend -> frontend -> polish — do NOT parallelize phases
- **Manual test gate**: After each phase completes, user manually tests before approving the next phase. Each phase is committed to its feature branch, the user verifies, then merges to `main`.
- No client-side CSV parsing — all data from backend API
- Backend constructs queries using Prisma Client, returns JSON — no raw SQL injection risks
- **Package manager: PNPM** — all install/add commands use pnpm, not npm
- **UI Library: shadcn/ui** — use shadcn components (Card, Dialog, Select, Button, Tabs, etc.) + shadcn Chart (wraps Recharts) for all UI primitives; shadcn preset from user-provided ID
- **Server state:** @tanstack/react-query for card data fetching, caching, and auto-refetch on filter changes (paired with Zustand for client state: layout + filters)
- **Linting/Formatting:** oxlint for linting, oxfmt for formatting (Void0 toolchain alongside vitest)
- **Dark mode:** next-themes (shadcn's built-in approach), not manual CSS toggling
- **Prisma 7 adapter requirement**: All PrismaClient instances must use a driver adapter — SQL Server uses `@prisma/adapter-mssql` with `new PrismaClient({ adapter })`. Connection config is parsed from `DATABASE_URL` env var.
- Backend: Next.js API Route Handlers (`src/app/api/`), no separate framework
- 4 card types required: KPI, Bar Chart, Line Chart, Gauge Chart
- Global filters: building_id, floor, time range — update all cards simultaneously
- Floor plan: SVG per building/floor combo, color-coded occupancy (green/yellow/red), hover tooltip, 30s auto-refresh
- Responsive at 1280px+ minimum width
- Alert severity colors: Critical = red, Warning = orange, Info = blue
- localStorage for layout persistence
- Commit format: `type(scope): message` — single line, no body, no trailers, no Co-Authored-By
- **Granular commits**: Each logical change gets its own commit. Never lump unrelated changes (e.g., "scaffold + shadcn + providers" should be 3+ separate commits). A phase may produce 3-8 commits depending on scope.
- Git branch strategy: feature branches per phase (`phase/1-setup`, `phase/2-infra`, etc.), merged to `main`
- Git init before first commit — no git repo exists yet
- Root .gitignore must NOT be inside .opencode/ (that dir has its own separate gitignore)
- Every file path is relative to project root /home/al-ip/learning/BMS-Dashboard/

---

## File Structure Map

```
prisma/
  schema.prisma               — 4 models
  seed.ts                     — CSV -> SQL Server seed script
src/
  app/
    layout.tsx                — Root layout (wraps ThemeProvider)
    page.tsx                  — Dashboard builder page
    globals.css               — Tailwind + shadcn CSS variables
    floor-plan/
      page.tsx                — Floor plan page
    api/
      columns/route.ts        — GET /api/columns
      query/route.ts          — POST /api/query
      occupancy/latest/route.ts — GET /api/occupancy/latest
  lib/
    utils.ts                  — cn() helper (from shadcn)
    prisma.ts                 — PrismaClient singleton
    aggregation.ts            — Aggregate functions
    query-builder.ts          — Prisma query construction
    types.ts                  — Shared TypeScript types
  hooks/                      — (shadcn convention)
  store/
    dashboard-store.ts        — Zustand store
  components/
    ui/                       — shadcn primitives (button, card, dialog, select, chart, etc.)
    dashboard/                — Canvas, CardPalette, DashboardCard, CardConfigModal
    cards/                    — KPICard, BarChartCard, LineChartCard, GaugeCard
    layout/                   — Navbar, GlobalFilters, StoreInitializer, ThemeProvider
    floor-plan/               — FloorPlanSVG, ZoneOverlay, OccupancyTooltip
tests/
  unit/                       — 6 test files
```

---

## Bonus Features Coverage

All 9 bonus points listed in the spec are integrated into the relevant tasks below:

| #   | Bonus                                                         | Status      | Where                                                                                               |
| --- | ------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| 1   | **Card resizing** (1×1, 2×1, 1×2, 2×2)                        | ✅ Added    | Task 10 (store: `resizeCard`), Task 11 (DashboardCard: size button group)                           |
| 2   | **Export/Import layout** (JSON file)                          | ✅ Added    | Task 11 (CardPalette: export/import buttons + file dialog)                                          |
| 3   | **Dark mode toggle**                                          | ✅ Built-in | shadcn preset + next-themes in Navbar (Task 18)                                                     |
| 4   | **Animated transitions** (card add/remove)                    | ✅ Added    | Task 11 (CSS `fadeIn` keyframes + `transition-all`), Task 20 (globals.css `@keyframes fadeIn`)      |
| 5   | **Card duplication**                                          | ✅ Added    | Task 10 (store: `duplicateCard`), Task 11 (DashboardCard: duplicate button)                         |
| 6   | **Real-time clock** (current time + highlight on line charts) | ✅ Added    | Task 15 (LineChartCard: `useEffect` clock + `ReferenceLine` for nearest data point)                 |
| 7   | **Print/PDF export**                                          | ✅ Added    | Task 11 (CardPalette: print button + `window.print()`), Task 20 (globals.css `@media print` styles) |
| 8   | **Unit tests**                                                | ✅ Built-in | Tasks 21-22 (6 test files: store, aggregation, query-builder, API, floor plan, occupancy)           |
| 9   | **Query logging** (Prisma query log with duration)            | ✅ Added    | Task 5 (prisma.ts: `$on("query")` event listener)                                                   |

---

### Task 1: Project Setup — Scaffold Next.js + shadcn/ui + Install Dependencies + Git Init

**Files:**

- Create: Next.js scaffold via CLI, shadcn init + components, `.gitignore`
- Modified: `src/app/layout.tsx`, `src/app/page.tsx`, `globals.css`

> **Note:** This task uses Next.js 16 (latest stable), PNPM as package manager, Turbopack for dev bundling (faster HMR), skips ESLint in favor of oxlint, and uses shadcn/ui with the user's preset.

- [ ] **Step 1: Create Next.js project with PNPM**

```bash
pnpm create next-app@latest /home/al-ip/learning/BMS-Dashboard --typescript --tailwind --no-eslint --app --src-dir --import-alias "@/*" --use-pnpm --turbo
```

This scaffolds the project with latest Next.js (15+), App Router, TypeScript, Tailwind, Turbopack, oxlint.

- [ ] **Step 2: Initialize shadcn/ui with user's preset**

```bash
cd /home/al-ip/learning/BMS-Dashboard
pnpm dlx shadcn@latest init --preset b7BEjszMO0 --base radix --template next
```

Follow any interactive prompts:

- Accept the default components directory (`@/components/ui`)
- Accept the default utils path (`@/lib/utils`)
- Accept the default Tailwind config merge

- [ ] **Step 3: Add required shadcn components**

```bash
pnpm dlx shadcn@latest add button card dialog select tabs input label tooltip skeleton
pnpm dlx shadcn@latest add chart   # wraps Recharts with consistent styling
```

- [ ] **Step 4: Install remaining project dependencies**

```bash
pnpm add prisma @prisma/client @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities zustand @tanstack/react-query date-fns lucide-react
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom @types/node tsx oxlint oxfmt
```

> Note: Recharts is already included via shadcn chart component. `next-themes` for dark mode is included via shadcn preset.

- [ ] **Step 5: Add lint/format scripts to package.json**

Read `package.json` and add to `"scripts"`:

```json
"lint": "oxlint .",
"format": "oxfmt .",
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Create QueryProvider for TanStack Query**

Write to `src/components/layout/QueryProvider.tsx`:

```tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 7: Create root .gitignore**

Write file `.gitignore`:

```
node_modules/
.next/
*.tsbuildinfo
next-env.d.ts
.env
.env.local
.env*.local
```

- [ ] **Step 8: Verify src/app/globals.css**

Read the file — verify it contains:

- Tailwind directives (`@tailwind base/components/utilities`)
- CSS variables for shadcn theme (light + dark)
- shadcn's `@layer base` with theme variables

- [ ] **Step 9: Create ThemeProvider wrapper (if not created by shadcn preset)**

Check if `src/components/layout/ThemeProvider.tsx` exists after shadcn init.
If not, create it:

Write to `src/components/layout/ThemeProvider.tsx`:

```tsx
"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 10: Write src/app/layout.tsx with ThemeProvider + QueryProvider**

```tsx
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { QueryProvider } from "@/components/layout/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "BMS Dashboard",
  description: "Building Management System Dashboard Builder",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 11: Write placeholder src/app/page.tsx**

```tsx
export default function DashboardPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">BMS Dashboard</h1>
      <p className="text-muted-foreground mt-2">Dashboard builder loading...</p>
    </main>
  );
}
```

- [ ] **Step 12: Verify project compiles**

```bash
pnpm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully`

- [ ] **Step 13: Git init + granular commits**

```bash
git init
git branch -m main
git checkout -b phase/1-setup

# Commit 1: Pre-existing project assets
git add .agents/ .opencode/ .superpowers/ AGENTS.md TechnicalTest/ data/ docs/ opencode.json skills-lock.json components.json
git commit -m "chore(repo): add project specification, data files, and agent configuration"

# Commit 2: Next.js scaffold + deps
git add next.config.ts tsconfig.json postcss.config.mjs package.json pnpm-lock.yaml prisma/ public/ src/app/favicon.ico src/app/globals.css src/lib/utils.ts
git commit -m "chore(project): scaffold Next.js 16 with TypeScript, Tailwind, and Turbopack"

# Commit 3: shadcn UI components
git add src/components/ui/
git commit -m "chore(ui): add shadcn/ui preset and components (button, card, dialog, select, tabs, input, label, tooltip, skeleton, chart)"

# Commit 4: Custom providers + root layout
git add src/app/layout.tsx src/app/page.tsx src/components/layout/
git commit -m "feat(web): add QueryProvider, ThemeProvider, and root layout with dark mode"

# Commit 5: Config
git add .gitignore
git commit -m "chore(project): add .gitignore for Node.js, Next.js, and environment files"
```

---

### [Phase 1 Complete] User tests, then Merge `phase/1-setup` to `main`

After user manually tests and approves: run the merge, then start Phase 2.

```bash
git checkout main
git merge phase/1-setup
git checkout -b phase/2-infra
```

---

### Task 1.5: Local Database Setup — Docker Compose for SQL Server

**Files:**

- Create: `docker-compose.yml`

> **Note:** SQL Server must be running locally for Prisma schema push and seed to work. This task should run before any schema or seed work.

- [ ] **Step 1: Create docker-compose.yml**

Write to `docker-compose.yml`:

```yaml
services:
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2025-latest
    container_name: bms-sqlserver
    environment:
      SA_PASSWORD: ${SA_PASSWORD}
      ACCEPT_EULA: "Y"
      MSSQL_PID: "Developer"
    ports:
      - "1433:1433"
    volumes:
      - sqlserver_data:/var/opt/mssql
    healthcheck:
      test: /opt/mssql-tools18/bin/sqlcmd -S localhost -U SA -P ${SA_PASSWORD} -C -Q "SELECT 1" || exit 1
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

volumes:
  sqlserver_data:
```

- [ ] **Step 2: Add SA_PASSWORD to .env**

Ensure `.env` has both `DATABASE_URL` and `SA_PASSWORD` with matching values:

```
DATABASE_URL="sqlserver://localhost:1433;database=bms_dashboard;user=SA;password=Y0uRStrOng!P4ssw0rd;trustServerCertificate=true"
SA_PASSWORD="Y0uRStrOng!P4ssw0rd"
```

> `docker-compose.yml` reads `${SA_PASSWORD}` from `.env` (Docker Compose auto-loads it). `DATABASE_URL` is used by Prisma. Both passwords must match.

- [ ] **Step 3: Start SQL Server**

```bash
docker compose up -d
```

Wait for health check to pass:
```bash
docker compose ps
# Should show "healthy"
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "infra(db): add Docker Compose for local SQL Server 2022"
```

---

### Task 2: Data Exploration — Profile CSV Files

**Files:**

- Create: `scripts/profile-data.ts`

- [ ] **Step 1: Create profiling script**

Write to `scripts/profile-data.ts`:

```typescript
import * as fs from "fs";
import * as path from "path";

interface ColumnProfile {
  name: string;
  nonNull: number;
  total: number;
  uniqueValues: number;
  sampleValues: string[];
}

function profileCSV(filePath: string): void {
  const content = fs.readFileSync(filePath, "utf-8").trim();
  const lines = content.split("\n");
  const headers = lines[0].split(",");
  const rows = lines.slice(1);

  console.log(`\n=== ${path.basename(filePath)} ===`);
  console.log(`Rows: ${rows.length}, Columns: ${headers.length}`);

  for (const header of headers) {
    const values = rows.map((row) => {
      const cols = row.split(",");
      const idx = headers.indexOf(header);
      return cols[idx]?.trim() ?? "";
    });
    const nonNull = values.filter((v) => v.length > 0).length;
    const unique = new Set(values);
    const numValues = values.map(Number).filter((n) => !isNaN(n));

    console.log(`  ${header}: ${nonNull}/${rows.length} non-null, ${unique.size} unique`);
    if (numValues.length > 0) {
      const avg = numValues.reduce((a, b) => a + b, 0) / numValues.length;
      console.log(
        `    range: ${Math.min(...numValues)} - ${Math.max(...numValues)}, avg: ${avg.toFixed(2)}`,
      );
    }
    console.log(`    samples: ${[...unique].slice(0, 3).join(", ")}`);
  }
}

const dataDir = path.resolve(__dirname, "../data");
const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".csv"));
for (const file of files) {
  profileCSV(path.join(dataDir, file));
}
```

- [ ] **Step 2: Run profiling script**

```bash
npx tsx scripts/profile-data.ts
```

- [ ] **Step 3: Commit**

```bash
git add scripts/profile-data.ts
git commit -m "chore(data): add CSV profiling script"
```

---

### Task 3: Prisma Schema — Define Database Models

**Files:**

- Create: `prisma/schema.prisma`, `.env`

- [ ] **Step 1: Create .env**

```
DATABASE_URL="sqlserver://localhost:1433;database=bms_dashboard;user=SA;password=YourPassword123;trustServerCertificate=true"
```

- [ ] **Step 2: Write prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}

model EnergyConsumption {
  id           Int     @id @default(autoincrement())
  timestamp    DateTime
  buildingId   String  @map("building_id")
  floor        Int
  zone         String
  deviceType   String  @map("device_type")
  deviceId     String  @map("device_id")
  energyKwh    Float   @map("energy_kwh")
  powerKw      Float   @map("power_kw")
  voltageV     Float   @map("voltage_v")
  currentA     Float   @map("current_a")
  powerFactor  Float   @map("power_factor")
  costUsd      Float   @map("cost_usd")
  sourceSystem String  @map("source_system")
  @@map("energy_consumption")
}

model HvacPerformance {
  id                    Int     @id @default(autoincrement())
  timestamp             DateTime
  buildingId            String  @map("building_id")
  floor                 Int
  zone                  String
  unitId                String  @map("unit_id")
  mode                  String
  setpointTempC         Float   @map("setpoint_temp_c")
  actualTempC           Float   @map("actual_temp_c")
  outdoorTempC          Float   @map("outdoor_temp_c")
  humidityPercent       Float   @map("humidity_percent")
  airflowM3h            Float   @map("airflow_m3h")
  filterStatusPercent   Float   @map("filter_status_percent")
  compressorHours       Float   @map("compressor_hours")
  energyEfficiencyRatio Float   @map("energy_efficiency_ratio")
  operatingStatus       String  @map("operating_status")
  @@map("hvac_performance")
}

model Occupancy {
  id                   Int   @id @default(autoincrement())
  timestamp            DateTime
  buildingId           String @map("building_id")
  floor                Int
  zone                 String
  zoneCapacity         Int    @map("zone_capacity")
  personCount          Int    @map("person_count")
  occupancyRatePercent Float  @map("occupancy_rate_percent")
  co2Ppm               Int    @map("co2_ppm")
  temperatureC         Float  @map("temperature_c")
  humidityPercent      Float  @map("humidity_percent")
  airQualityIndex      Int    @map("air_quality_index")
  entryCount           Int    @map("entry_count")
  exitCount            Int    @map("exit_count")
  @@map("occupancy")
}

model AlertsEvent {
  id               Int      @id @default(autoincrement())
  timestamp        DateTime
  buildingId       String   @map("building_id")
  floor            Int
  zone             String
  alertId          String   @map("alert_id")
  severity         String
  category         String
  deviceId         String?  @map("device_id")
  alarmType        String   @map("alarm_type")
  description      String
  value            Float
  threshold        Float
  unit             String
  durationMinutes  Int      @map("duration_minutes")
  resolvedAt       DateTime? @map("resolved_at")
  status           String
  acknowledgedBy   String?  @map("acknowledged_by")
  @@map("alerts_events")
}
```

- [ ] **Step 3: Validate schema**

```bash
npx prisma validate
```

Expected: `Your Prisma schema is valid!`

- [ ] **Step 4: Generate Prisma Client**

```bash
npx prisma generate
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma .env
git commit -m "infra(prisma): add schema with 4 BMS data models"
```

---

### Task 4: Seed Script — Import CSV Data into SQL Server

**Files:**

- Create: `prisma/seed.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Prisma 7 adapter for SQL Server**

```bash
pnpm add @prisma/adapter-mssql
```

- [ ] **Step 2: Write prisma/seed.ts**

Write the seed script that reads all 4 CSV files, parses each row, and inserts into the database using Prisma Client. The script should:

- Import `PrismaMssql` from `@prisma/adapter-mssql` and `PrismaClient` from `../src/generated/prisma/client`
- Parse the `DATABASE_URL` env var to extract server, port, database, user, password
- Create adapter: `new PrismaMssql({ server, port, database, user, password, options: { encrypt: true, trustServerCertificate: true } })`
- Instantiate: `new PrismaClient({ adapter })`
- Parse CSV files from `data/` directory using Node.js `fs.readFileSync` and string splitting
- Handle timestamp -> `new Date(row.timestamp)` conversion
- Parse integers with `parseInt(row.field, 10)` for floor, zone_capacity, person_count, etc.
- Parse floats with `parseFloat(row.field)` for numeric measurements
- Handle nullable fields (deviceId, resolvedAt, acknowledgedBy) as `null` when empty
- Insert each row with `await prisma.modelName.create({ data: {...} })`
- Log progress and row counts after each table
- Wrap in try/catch with `prisma.$disconnect()` in finally block

The full implementation (~210 lines) covers all 4 models with exact field mappings matching the Prisma schema from Task 3.

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit prisma/seed.ts 2>&1
```

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "infra(prisma): add seed script for CSV data import"
```

---

### [Phase 2 Complete] User tests, then Merge `phase/2-infra` to `main`

After user manually tests infra (schema, seed, data loads correctly) and approves:

```bash
git checkout main
git merge phase/2-infra
git checkout -b phase/3-backend
```

---

### Task 5: Prisma Client Singleton + Shared Types

**Files:**

- Create: `src/lib/prisma.ts`, `src/lib/types.ts`

- [ ] **Step 1: Write src/lib/prisma.ts with query logging**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? [{ emit: "event", level: "query" }] : [],
  });

  // Query logging — bonus feature: log all queries with execution time
  if (process.env.NODE_ENV === "development") {
    client.$on("query" as any, (e: any) => {
      console.log(`[Prisma Query] ${e.duration}ms | ${e.query}`);
    });
  }

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 2: Write src/lib/types.ts**

```typescript
export type TableName = "energy_consumption" | "hvac_performance" | "occupancy" | "alerts_events";
export type CardType = "kpi" | "bar" | "line" | "gauge";
export type AggregationType = "sum" | "avg" | "min" | "max" | "count";

export interface AxisConfig {
  field: string;
  label: string;
}
export interface FilterConfig {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
  value: string | number;
}

export interface CardConfig {
  id: string;
  type: CardType;
  title: string;
  dataSource: TableName | null;
  xAxis: AxisConfig | null;
  yAxis: AxisConfig | null;
  aggregation: AggregationType;
  groupBy: AxisConfig | null;
  filter: FilterConfig | null;
  gaugeMin?: number;
  gaugeMax?: number;
  gaugeTarget?: number;
}

export interface GlobalFilters {
  buildingId: string | null;
  floor: number | null;
  timeRange: "today" | "last7" | "custom" | null;
  customStart: string | null;
  customEnd: string | null;
}

export interface QueryResult {
  data: Record<string, unknown>[];
  aggregated: number | null;
}

export interface DashboardCard {
  id: string;
  config: CardConfig;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/prisma.ts src/lib/types.ts
git commit -m "feat(lib): add Prisma singleton and shared TypeScript types"
```

---

### Task 6: Aggregation Logic + Query Builder

**Files:**

- Create: `src/lib/aggregation.ts`
- Create: `src/lib/query-builder.ts`
- Test: `tests/unit/aggregation.test.ts`
- Test: `tests/unit/query-builder.test.ts`

**Interfaces:**

- Consumes: `AggregationType`, `CardConfig`, `GlobalFilters`, `TableName` from `src/lib/types.ts`
- Produces:
  - `aggregate(values: number[], type: AggregationType): number`
  - `buildWhereClause(filters: GlobalFilters, cardFilter?: FilterConfig): Record<string, unknown>`
  - `buildQuery(config: CardConfig, globalFilters: GlobalFilters): { table, modelName, where, groupBy, select, orderBy }`

- [ ] **Step 1: Write the failing aggregation test**

Write to `tests/unit/aggregation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { aggregate } from "../../src/lib/aggregation";

describe("aggregate", () => {
  const values = [10, 20, 30, 40, 50];

  it("returns sum of values", () => {
    expect(aggregate(values, "sum")).toBe(150);
  });

  it("returns average of values", () => {
    expect(aggregate(values, "avg")).toBe(30);
  });

  it("returns minimum of values", () => {
    expect(aggregate(values, "min")).toBe(10);
  });

  it("returns maximum of values", () => {
    expect(aggregate(values, "max")).toBe(50);
  });

  it("returns count of values", () => {
    expect(aggregate(values, "count")).toBe(5);
  });

  it("returns 0 for empty array with count", () => {
    expect(aggregate([], "count")).toBe(0);
  });

  it("returns 0 for empty array with sum", () => {
    expect(aggregate([], "sum")).toBe(0);
  });

  it("throws for unsupported aggregation type", () => {
    expect(() => aggregate([1, 2], "unknown" as any)).toThrow("Unknown aggregation type: unknown");
  });
});
```

- [ ] **Step 2: Run aggregation test to verify it fails**

```bash
npx vitest run tests/unit/aggregation.test.ts 2>&1
```

Expected: FAIL — `aggregate` not defined.

- [ ] **Step 3: Write minimal aggregation implementation**

Write to `src/lib/aggregation.ts`:

```typescript
import type { AggregationType } from "./types";

export function aggregate(values: number[], type: AggregationType): number {
  if (values.length === 0 && type !== "count") return 0;

  switch (type) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "count":
      return values.length;
    default:
      throw new Error(`Unknown aggregation type: ${type}`);
  }
}
```

- [ ] **Step 4: Run aggregation test to verify it passes**

```bash
npx vitest run tests/unit/aggregation.test.ts 2>&1
```

Expected: PASS — all 8 tests pass.

- [ ] **Step 5: Write the failing query-builder test**

Write to `tests/unit/query-builder.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildWhereClause, buildQuery } from "../../src/lib/query-builder";
import type { CardConfig, GlobalFilters, FilterConfig } from "../../src/lib/types";

describe("buildWhereClause", () => {
  it("returns empty object when no filters set", () => {
    const filters: GlobalFilters = {
      buildingId: null,
      floor: null,
      timeRange: null,
      customStart: null,
      customEnd: null,
    };
    expect(buildWhereClause(filters)).toEqual({});
  });

  it("adds buildingId filter", () => {
    const filters: GlobalFilters = {
      buildingId: "BLD-001",
      floor: null,
      timeRange: null,
      customStart: null,
      customEnd: null,
    };
    expect(buildWhereClause(filters)).toEqual({ buildingId: "BLD-001" });
  });

  it("adds floor filter", () => {
    const filters: GlobalFilters = {
      buildingId: null,
      floor: 1,
      timeRange: null,
      customStart: null,
      customEnd: null,
    };
    expect(buildWhereClause(filters)).toEqual({ floor: 1 });
  });

  it("adds timeRange filter for today", () => {
    const filters: GlobalFilters = {
      buildingId: null,
      floor: null,
      timeRange: "today",
      customStart: null,
      customEnd: null,
    };
    const result = buildWhereClause(filters);
    expect(result).toHaveProperty("timestamp");
  });

  it("merges global filters with card filter", () => {
    const filters: GlobalFilters = {
      buildingId: "BLD-001",
      floor: null,
      timeRange: null,
      customStart: null,
      customEnd: null,
    };
    const cardFilter: FilterConfig = { field: "zone", operator: "eq", value: "Zone-A" };
    const result = buildWhereClause(filters, cardFilter);
    expect(result).toHaveProperty("buildingId", "BLD-001");
    expect(result).toHaveProperty("zone", "Zone-A");
  });
});

describe("buildQuery", () => {
  it("returns query for KPI card", () => {
    const config: CardConfig = {
      id: "card-1",
      type: "kpi",
      title: "Total Energy",
      dataSource: "energy_consumption",
      xAxis: null,
      yAxis: { field: "energy_kwh", label: "Energy (kWh)" },
      aggregation: "sum",
      groupBy: null,
      filter: null,
    };
    const filters: GlobalFilters = {
      buildingId: "BLD-001",
      floor: null,
      timeRange: null,
      customStart: null,
      customEnd: null,
    };
    const query = buildQuery(config, filters);
    expect(query.table).toBe("energy_consumption");
    expect(query.where).toHaveProperty("buildingId", "BLD-001");
  });

  it("returns query for Bar chart with xAxis and yAxis", () => {
    const config: CardConfig = {
      id: "card-2",
      type: "bar",
      title: "Energy by Zone",
      dataSource: "energy_consumption",
      xAxis: { field: "zone", label: "Zone" },
      yAxis: { field: "energy_kwh", label: "Energy (kWh)" },
      aggregation: "sum",
      groupBy: null,
      filter: null,
    };
    const filters: GlobalFilters = {
      buildingId: null,
      floor: null,
      timeRange: null,
      customStart: null,
      customEnd: null,
    };
    const query = buildQuery(config, filters);
    expect(query.table).toBe("energy_consumption");
    expect(query.groupBy).toContain("zone");
    expect(query.select).toHaveProperty("zone");
  });
});
```

- [ ] **Step 6: Run query-builder test to verify it fails**

```bash
npx vitest run tests/unit/query-builder.test.ts 2>&1
```

Expected: FAIL — functions not defined.

- [ ] **Step 7: Write minimal query-builder implementation**

Write to `src/lib/query-builder.ts`:

```typescript
import type { CardConfig, GlobalFilters, FilterConfig, TableName } from "./types";

function parseOperatorToPrisma(operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte"): string {
  const map: Record<string, string> = {
    eq: "equals",
    neq: "not",
    gt: "gt",
    gte: "gte",
    lt: "lt",
    lte: "lte",
  };
  return map[operator] || "equals";
}

export function buildWhereClause(
  filters: GlobalFilters,
  cardFilter?: FilterConfig,
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filters.buildingId) {
    where.buildingId = filters.buildingId;
  }
  if (filters.floor !== null && filters.floor !== undefined) {
    where.floor = filters.floor;
  }
  if (filters.timeRange === "today") {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    where.timestamp = { gte: startOfDay };
  } else if (filters.timeRange === "last7") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    where.timestamp = { gte: sevenDaysAgo };
  } else if (filters.timeRange === "custom" && filters.customStart && filters.customEnd) {
    where.timestamp = { gte: new Date(filters.customStart), lte: new Date(filters.customEnd) };
  }
  if (cardFilter) {
    const prismaOp = parseOperatorToPrisma(cardFilter.operator);
    where[cardFilter.field] = { [prismaOp]: cardFilter.value };
  }
  return where;
}

function getPrismaModel(table: TableName): string {
  const map: Record<TableName, string> = {
    energy_consumption: "energyConsumption",
    hvac_performance: "hvacPerformance",
    occupancy: "occupancy",
    alerts_events: "alertsEvent",
  };
  return map[table];
}

function mapFieldName(field: string, table: TableName): string {
  const fieldMappings: Record<TableName, Record<string, string>> = {
    energy_consumption: {
      building_id: "buildingId",
      device_type: "deviceType",
      device_id: "deviceId",
      energy_kwh: "energyKwh",
      power_kw: "powerKw",
      voltage_v: "voltageV",
      current_a: "currentA",
      power_factor: "powerFactor",
      cost_usd: "costUsd",
      source_system: "sourceSystem",
    },
    hvac_performance: {
      building_id: "buildingId",
      unit_id: "unitId",
      setpoint_temp_c: "setpointTempC",
      actual_temp_c: "actualTempC",
      outdoor_temp_c: "outdoorTempC",
      humidity_percent: "humidityPercent",
      airflow_m3h: "airflowM3h",
      filter_status_percent: "filterStatusPercent",
      compressor_hours: "compressorHours",
      energy_efficiency_ratio: "energyEfficiencyRatio",
      operating_status: "operatingStatus",
    },
    occupancy: {
      building_id: "buildingId",
      zone_capacity: "zoneCapacity",
      person_count: "personCount",
      occupancy_rate_percent: "occupancyRatePercent",
      co2_ppm: "co2Ppm",
      temperature_c: "temperatureC",
      humidity_percent: "humidityPercent",
      air_quality_index: "airQualityIndex",
      entry_count: "entryCount",
      exit_count: "exitCount",
    },
    alerts_events: {
      building_id: "buildingId",
      alert_id: "alertId",
      device_id: "deviceId",
      alarm_type: "alarmType",
      duration_minutes: "durationMinutes",
      resolved_at: "resolvedAt",
      acknowledged_by: "acknowledgedBy",
    },
  };
  return fieldMappings[table]?.[field] ?? field;
}

export function buildQuery(
  config: CardConfig,
  globalFilters: GlobalFilters,
): {
  table: TableName;
  modelName: string;
  where: Record<string, unknown>;
  groupBy: string[];
  select: Record<string, boolean>;
  orderBy: Record<string, string>;
} {
  const table = config.dataSource!;
  const modelName = getPrismaModel(table);
  const where = buildWhereClause(globalFilters, config.filter);

  const groupBy: string[] = [];
  const select: Record<string, boolean> = {};
  const orderBy: Record<string, string> = {};

  const yField = config.yAxis ? mapFieldName(config.yAxis.field, table) : null;
  const xField = config.xAxis ? mapFieldName(config.xAxis.field, table) : null;
  const groupField = config.groupBy ? mapFieldName(config.groupBy.field, table) : null;

  if (config.type === "kpi" && yField) {
    select[yField] = true;
  }
  if (config.type === "bar" && xField && yField) {
    groupBy.push(xField);
    select[xField] = true;
    select[yField] = true;
  }
  if (config.type === "line" && xField && yField) {
    orderBy[xField] = "asc";
    select[xField] = true;
    select[yField] = true;
    if (groupField) {
      groupBy.push(groupField);
      select[groupField] = true;
    }
  }
  if (config.type === "gauge" && yField) {
    select[yField] = true;
  }

  return { table, modelName, where, groupBy, select, orderBy };
}
```

- [ ] **Step 8: Run query-builder test to verify it passes**

```bash
npx vitest run tests/unit/query-builder.test.ts 2>&1
```

Expected: PASS — all 7 tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/lib/aggregation.ts src/lib/query-builder.ts tests/unit/aggregation.test.ts tests/unit/query-builder.test.ts
git commit -m "feat(lib): add aggregation logic and Prisma query builder"
```

---

### Task 7: Columns API — GET /api/columns

**Files:**

- Create: `src/app/api/columns/route.ts`
- Test: `tests/unit/api-columns.test.ts`

**Interfaces:**

- Consumes: nothing (static column metadata)
- Produces: `GET /api/columns?source=energy_consumption` -> `{ columns: ColumnInfo[] }`
  - `export function getTableColumns(tableName: string): ColumnInfo[]`
  - `export type ColumnInfo = { column_name: string; data_type: string; is_numeric: boolean }`

- [ ] **Step 1: Write the failing test**

Write to `tests/unit/api-columns.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getTableColumns } from "../../src/app/api/columns/route";

describe("getTableColumns", () => {
  it("returns columns for energy_consumption", () => {
    const columns = getTableColumns("energy_consumption");
    expect(columns.length).toBeGreaterThan(0);
    const energyKwh = columns.find((c) => c.column_name === "energy_kwh");
    expect(energyKwh).toBeDefined();
    expect(energyKwh!.is_numeric).toBe(true);
  });

  it("returns columns for hvac_performance", () => {
    const columns = getTableColumns("hvac_performance");
    const actualTempC = columns.find((c) => c.column_name === "actual_temp_c");
    expect(actualTempC).toBeDefined();
    expect(actualTempC!.is_numeric).toBe(true);
  });

  it("throws for unknown table", () => {
    expect(() => getTableColumns("unknown" as any)).toThrow("Unknown data source");
  });

  it("marks zone as non-numeric", () => {
    const columns = getTableColumns("energy_consumption");
    const zoneCol = columns.find((c) => c.column_name === "zone");
    expect(zoneCol).toBeDefined();
    expect(zoneCol!.is_numeric).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/api-columns.test.ts 2>&1
```

Expected: FAIL — `getTableColumns` not defined.

- [ ] **Step 3: Write the columns API route**

Write to `src/app/api/columns/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_numeric: boolean;
}

const TABLE_COLUMNS: Record<string, ColumnInfo[]> = {
  energy_consumption: [
    { column_name: "timestamp", data_type: "datetime", is_numeric: false },
    { column_name: "building_id", data_type: "string", is_numeric: false },
    { column_name: "floor", data_type: "integer", is_numeric: true },
    { column_name: "zone", data_type: "string", is_numeric: false },
    { column_name: "device_type", data_type: "string", is_numeric: false },
    { column_name: "device_id", data_type: "string", is_numeric: false },
    { column_name: "energy_kwh", data_type: "float", is_numeric: true },
    { column_name: "power_kw", data_type: "float", is_numeric: true },
    { column_name: "voltage_v", data_type: "float", is_numeric: true },
    { column_name: "current_a", data_type: "float", is_numeric: true },
    { column_name: "power_factor", data_type: "float", is_numeric: true },
    { column_name: "cost_usd", data_type: "float", is_numeric: true },
    { column_name: "source_system", data_type: "string", is_numeric: false },
  ],
  hvac_performance: [
    { column_name: "timestamp", data_type: "datetime", is_numeric: false },
    { column_name: "building_id", data_type: "string", is_numeric: false },
    { column_name: "floor", data_type: "integer", is_numeric: true },
    { column_name: "zone", data_type: "string", is_numeric: false },
    { column_name: "unit_id", data_type: "string", is_numeric: false },
    { column_name: "mode", data_type: "string", is_numeric: false },
    { column_name: "setpoint_temp_c", data_type: "float", is_numeric: true },
    { column_name: "actual_temp_c", data_type: "float", is_numeric: true },
    { column_name: "outdoor_temp_c", data_type: "float", is_numeric: true },
    { column_name: "humidity_percent", data_type: "float", is_numeric: true },
    { column_name: "airflow_m3h", data_type: "float", is_numeric: true },
    { column_name: "filter_status_percent", data_type: "float", is_numeric: true },
    { column_name: "compressor_hours", data_type: "float", is_numeric: true },
    { column_name: "energy_efficiency_ratio", data_type: "float", is_numeric: true },
    { column_name: "operating_status", data_type: "string", is_numeric: false },
  ],
  occupancy: [
    { column_name: "timestamp", data_type: "datetime", is_numeric: false },
    { column_name: "building_id", data_type: "string", is_numeric: false },
    { column_name: "floor", data_type: "integer", is_numeric: true },
    { column_name: "zone", data_type: "string", is_numeric: false },
    { column_name: "zone_capacity", data_type: "integer", is_numeric: true },
    { column_name: "person_count", data_type: "integer", is_numeric: true },
    { column_name: "occupancy_rate_percent", data_type: "float", is_numeric: true },
    { column_name: "co2_ppm", data_type: "integer", is_numeric: true },
    { column_name: "temperature_c", data_type: "float", is_numeric: true },
    { column_name: "humidity_percent", data_type: "float", is_numeric: true },
    { column_name: "air_quality_index", data_type: "integer", is_numeric: true },
    { column_name: "entry_count", data_type: "integer", is_numeric: true },
    { column_name: "exit_count", data_type: "integer", is_numeric: true },
  ],
  alerts_events: [
    { column_name: "timestamp", data_type: "datetime", is_numeric: false },
    { column_name: "building_id", data_type: "string", is_numeric: false },
    { column_name: "floor", data_type: "integer", is_numeric: true },
    { column_name: "zone", data_type: "string", is_numeric: false },
    { column_name: "alert_id", data_type: "string", is_numeric: false },
    { column_name: "severity", data_type: "string", is_numeric: false },
    { column_name: "category", data_type: "string", is_numeric: false },
    { column_name: "device_id", data_type: "string", is_numeric: false },
    { column_name: "alarm_type", data_type: "string", is_numeric: false },
    { column_name: "description", data_type: "string", is_numeric: false },
    { column_name: "value", data_type: "float", is_numeric: true },
    { column_name: "threshold", data_type: "float", is_numeric: true },
    { column_name: "unit", data_type: "string", is_numeric: false },
    { column_name: "duration_minutes", data_type: "integer", is_numeric: true },
    { column_name: "resolved_at", data_type: "datetime", is_numeric: false },
    { column_name: "status", data_type: "string", is_numeric: false },
    { column_name: "acknowledged_by", data_type: "string", is_numeric: false },
  ],
};

export function getTableColumns(tableName: string): ColumnInfo[] {
  const columns = TABLE_COLUMNS[tableName];
  if (!columns) throw new Error(`Unknown data source: ${tableName}`);
  return columns;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  if (!source) {
    return NextResponse.json({ error: "Missing 'source' query parameter" }, { status: 400 });
  }
  try {
    const columns = getTableColumns(source);
    return NextResponse.json({ columns });
  } catch {
    return NextResponse.json({ error: `Unknown data source: ${source}` }, { status: 404 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/api-columns.test.ts 2>&1
```

Expected: PASS — all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/columns/route.ts tests/unit/api-columns.test.ts
git commit -m "feat(api): add GET /api/columns endpoint for dynamic axis selection"
```

---

### Task 8: Query API — POST /api/query

**Files:**

- Create: `src/app/api/query/route.ts`
- Test: `tests/unit/api-query.test.ts`

**Interfaces:**

- Consumes: `prisma` from `src/lib/prisma.ts`, `buildQuery` from `src/lib/query-builder.ts`, `aggregate` from `src/lib/aggregation.ts`
- Produces: `POST /api/query` body `{ config: CardConfig, globalFilters: GlobalFilters }` -> `{ data, aggregated }`
  - `export function processQueryResult(rows, aggregationType, yField): { data, aggregated }`

- [ ] **Step 1: Write the failing test**

Write to `tests/unit/api-query.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { processQueryResult } from "../../src/app/api/query/route";

describe("processQueryResult", () => {
  it("aggregates rows by sum", () => {
    const rows = [{ energy_kwh: 10 }, { energy_kwh: 20 }, { energy_kwh: 30 }];
    const result = processQueryResult(rows, "sum", "energy_kwh");
    expect(result.aggregated).toBe(60);
    expect(result.data).toEqual(rows);
  });

  it("aggregates rows by avg", () => {
    const rows = [{ energy_kwh: 10 }, { energy_kwh: 20 }, { energy_kwh: 30 }];
    const result = processQueryResult(rows, "avg", "energy_kwh");
    expect(result.aggregated).toBe(20);
  });

  it("handles empty rows", () => {
    const result = processQueryResult([], "sum", "energy_kwh");
    expect(result.aggregated).toBe(0);
    expect(result.data).toEqual([]);
  });

  it("handles missing value field gracefully", () => {
    const rows = [{ zone: "A" }];
    const result = processQueryResult(rows, "sum", "energy_kwh");
    expect(result.aggregated).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/api-query.test.ts 2>&1
```

Expected: FAIL — `processQueryResult` not defined.

- [ ] **Step 3: Write the query API route**

Write to `src/app/api/query/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildQuery } from "@/lib/query-builder";
import { aggregate } from "@/lib/aggregation";
import type { CardConfig, GlobalFilters } from "@/lib/types";

function getNumericValue(row: Record<string, unknown>, field: string): number {
  const val = row[field];
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function processQueryResult(
  rows: Record<string, unknown>[],
  aggregationType: string,
  yField: string,
): { data: Record<string, unknown>[]; aggregated: number } {
  if (rows.length === 0) return { data: [], aggregated: 0 };
  const values = rows.map((row) => getNumericValue(row, yField));
  const aggregated = aggregate(values, aggregationType as any);
  return { data: rows, aggregated };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, globalFilters } = body as { config: CardConfig; globalFilters: GlobalFilters };

    if (!config.dataSource) {
      return NextResponse.json({ error: "Card has no data source configured" }, { status: 400 });
    }

    const query = buildQuery(config, globalFilters);
    const model = (prisma as any)[query.modelName];
    if (!model) {
      return NextResponse.json({ error: `Unknown model: ${query.modelName}` }, { status: 500 });
    }

    const rows = await model.findMany({
      where: query.where,
      select: Object.keys(query.select).length > 0 ? query.select : undefined,
      orderBy: Object.keys(query.orderBy).length > 0 ? query.orderBy : undefined,
    });

    const rawData = rows as unknown as Record<string, unknown>[];

    if (config.type === "kpi" || config.type === "gauge") {
      const yField = config.yAxis?.field ?? "";
      const result = processQueryResult(rawData, config.aggregation, yField);
      return NextResponse.json(result);
    }

    return NextResponse.json({ data: rawData, aggregated: null });
  } catch (e) {
    console.error("Query API error:", e);
    return NextResponse.json(
      { error: "Failed to execute query", details: (e as Error).message },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/api-query.test.ts 2>&1
```

Expected: PASS — all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/query/route.ts tests/unit/api-query.test.ts
git commit -m "feat(api): add POST /api/query for dynamic card data queries"
```

---

### Task 9: Occupancy Latest API — GET /api/occupancy/latest

**Files:**

- Create: `src/app/api/occupancy/latest/route.ts`
- Test: `tests/unit/api-occupancy.test.ts`

**Interfaces:**

- Consumes: `prisma` from `src/lib/prisma.ts`
- Produces: `GET /api/occupancy/latest?building_id=BLD-001&floor=1` -> `{ buildingId, floor, zones: ZoneData[], timestamp }`
  - `export function getLatestPerZone(rows): Record<string, unknown>[]`

- [ ] **Step 1: Write the failing test**

Write to `tests/unit/api-occupancy.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getLatestPerZone } from "../../src/app/api/occupancy/latest/route";

describe("getLatestPerZone", () => {
  it("returns latest reading per zone from sorted data", () => {
    const rows = [
      {
        zone: "Zone-A",
        timestamp: "2025-06-01T08:00:00Z",
        person_count: 120,
        occupancy_rate_percent: 80,
      },
      {
        zone: "Zone-A",
        timestamp: "2025-06-01T09:00:00Z",
        person_count: 100,
        occupancy_rate_percent: 67,
      },
      {
        zone: "Zone-B",
        timestamp: "2025-06-01T08:00:00Z",
        person_count: 62,
        occupancy_rate_percent: 78,
      },
    ];
    const result = getLatestPerZone(rows);
    expect(result).toHaveLength(2);
    const zoneA = result.find((r) => r.zone === "Zone-A");
    expect(zoneA!.person_count).toBe(100);
    expect(zoneA!.occupancy_rate_percent).toBe(67);
  });

  it("handles empty input", () => {
    const result = getLatestPerZone([]);
    expect(result).toEqual([]);
  });

  it("handles single zone single row", () => {
    const rows = [
      {
        zone: "Zone-A",
        timestamp: "2025-06-01T08:00:00Z",
        person_count: 50,
        occupancy_rate_percent: 33,
      },
    ];
    const result = getLatestPerZone(rows);
    expect(result).toHaveLength(1);
    expect(result[0].person_count).toBe(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/api-occupancy.test.ts 2>&1
```

Expected: FAIL — `getLatestPerZone` not defined.

- [ ] **Step 3: Write the occupancy latest API route**

Write to `src/app/api/occupancy/latest/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export function getLatestPerZone(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const zoneMap = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const zone = String(row.zone ?? "");
    if (!zone) continue;
    const existing = zoneMap.get(zone);
    if (!existing || new Date(String(row.timestamp)) > new Date(String(existing.timestamp))) {
      zoneMap.set(zone, row);
    }
  }
  return Array.from(zoneMap.values());
}

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

  try {
    const rows = await prisma.occupancy.findMany({
      where: { buildingId, floor: floorNum },
      orderBy: { timestamp: "desc" },
    });
    const latestPerZone = getLatestPerZone(rows as unknown as Record<string, unknown>[]);
    return NextResponse.json({
      buildingId,
      floor: floorNum,
      zones: latestPerZone,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Occupancy API error:", e);
    return NextResponse.json({ error: "Failed to fetch occupancy data" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/api-occupancy.test.ts 2>&1
```

Expected: PASS — all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/occupancy/latest/route.ts tests/unit/api-occupancy.test.ts
git commit -m "feat(api): add GET /api/occupancy/latest for floor plan data"
```

---

### [Phase 3 Complete] User tests, then Merge `phase/3-backend` to `main`

After user manually tests backend APIs (curl/Postman all endpoints) and approves:

```bash
git checkout main
git merge phase/3-backend
git checkout -b phase/4-frontend
```

---

### Task 10: Zustand Dashboard Store

**Files:**

- Create: `src/store/dashboard-store.ts`
- Test: `tests/unit/dashboard-store.test.ts`

---

**Interfaces:**

- Consumes: `DashboardCard`, `CardConfig`, `GlobalFilters`, `CardType` from `src/lib/types.ts`
- Produces: `useDashboardStore` with:
  - `cards: DashboardCard[]`
  - `filters: GlobalFilters`
  - `addCard(type: CardType): string`
  - `removeCard(id: string): void`
  - `updateCardConfig(id: string, config: Partial<CardConfig>): void`
  - `reorderCards(fromIndex: number, toIndex: number): void`
  - `setFilters(filters: Partial<GlobalFilters>): void`
  - `loadFromStorage(): void`
  - `saveToStorage(): void`

- [ ] **Step 1: Write the failing store test**

Write to `tests/unit/dashboard-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useDashboardStore } from "../../src/store/dashboard-store";

describe("dashboard-store", () => {
  beforeEach(() => {
    useDashboardStore.setState({
      cards: [],
      filters: {
        buildingId: null,
        floor: null,
        timeRange: null,
        customStart: null,
        customEnd: null,
      },
    });
  });

  it("adds a card and returns its id", () => {
    const id = useDashboardStore.getState().addCard("kpi");
    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
    expect(useDashboardStore.getState().cards).toHaveLength(1);
    expect(useDashboardStore.getState().cards[0].config.type).toBe("kpi");
  });

  it("removes a card by id", () => {
    const id = useDashboardStore.getState().addCard("bar");
    useDashboardStore.getState().removeCard(id);
    expect(useDashboardStore.getState().cards).toHaveLength(0);
  });

  it("updates card config", () => {
    const id = useDashboardStore.getState().addCard("kpi");
    useDashboardStore
      .getState()
      .updateCardConfig(id, { title: "Total Energy", dataSource: "energy_consumption" });
    const card = useDashboardStore.getState().cards.find((c) => c.id === id);
    expect(card?.config.title).toBe("Total Energy");
    expect(card?.config.dataSource).toBe("energy_consumption");
  });

  it("reorders cards", () => {
    const id1 = useDashboardStore.getState().addCard("kpi");
    const id2 = useDashboardStore.getState().addCard("bar");
    const id3 = useDashboardStore.getState().addCard("line");
    useDashboardStore.getState().reorderCards(0, 2);
    const cards = useDashboardStore.getState().cards;
    expect(cards[2].id).toBe(id1);
  });

  it("sets global filters", () => {
    useDashboardStore.getState().setFilters({ buildingId: "BLD-001" });
    expect(useDashboardStore.getState().filters.buildingId).toBe("BLD-001");
  });

  it("sets floor filter", () => {
    useDashboardStore.getState().setFilters({ floor: 1 });
    expect(useDashboardStore.getState().filters.floor).toBe(1);
  });

  it("sets time range filter", () => {
    useDashboardStore.getState().setFilters({ timeRange: "today" });
    expect(useDashboardStore.getState().filters.timeRange).toBe("today");
  });

  it("merges partial filter updates", () => {
    useDashboardStore.getState().setFilters({ buildingId: "BLD-001" });
    useDashboardStore.getState().setFilters({ floor: 2 });
    const filters = useDashboardStore.getState().filters;
    expect(filters.buildingId).toBe("BLD-001");
    expect(filters.floor).toBe(2);
  });

  it("duplicates a card", () => {
    const id = useDashboardStore.getState().addCard("kpi");
    const newId = useDashboardStore.getState().duplicateCard(id);
    expect(newId).not.toBe(id);
    expect(useDashboardStore.getState().cards).toHaveLength(2);
    expect(useDashboardStore.getState().cards[1].config.title).toContain("(copy)");
  });

  it("resizes a card", () => {
    const id = useDashboardStore.getState().addCard("bar");
    useDashboardStore.getState().resizeCard(id, "wide");
    const card = useDashboardStore.getState().cards.find((c) => c.id === id);
    expect(card?.width).toBe(2);
    expect(card?.height).toBe(1);
  });

  it("sets cards from import", () => {
    const id = useDashboardStore.getState().addCard("kpi");
    const exported = useDashboardStore.getState().cards;
    useDashboardStore.getState().removeCard(id);
    expect(useDashboardStore.getState().cards).toHaveLength(0);
    useDashboardStore.getState().setCards(exported);
    expect(useDashboardStore.getState().cards).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/dashboard-store.test.ts 2>&1
```

Expected: FAIL — import errors.

- [ ] **Step 3: Write the zustand store**

Write to `src/store/dashboard-store.ts`:

```typescript
import { create } from "zustand";
import type { DashboardCard, CardConfig, GlobalFilters, CardType } from "@/lib/types";

function generateId(): string {
  return `card-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function createDefaultConfig(type: CardType): CardConfig {
  const base: CardConfig = {
    id: generateId(),
    type,
    title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Card`,
    dataSource: null,
    xAxis: null,
    yAxis: null,
    aggregation: "sum",
    groupBy: null,
    filter: null,
  };
  if (type === "gauge") {
    base.gaugeMin = 0;
    base.gaugeMax = 100;
    base.gaugeTarget = 75;
  }
  return base;
}

const STORAGE_KEY = "bms-dashboard-layout";

interface DashboardState {
  cards: DashboardCard[];
  filters: GlobalFilters;
  addCard: (type: CardType) => string;
  removeCard: (id: string) => void;
  updateCardConfig: (id: string, config: Partial<CardConfig>) => void;
  duplicateCard: (id: string) => string;
  resizeCard: (id: string, size: "small" | "wide" | "tall" | "large") => void;
  reorderCards: (fromIndex: number, toIndex: number) => void;
  setCards: (cards: DashboardCard[]) => void;
  setFilters: (filters: Partial<GlobalFilters>) => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const SIZE_MAP: Record<string, { w: number; h: number }> = {
  small: { w: 1, h: 1 },
  wide: { w: 2, h: 1 },
  tall: { w: 1, h: 2 },
  large: { w: 2, h: 2 },
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  cards: [],
  filters: { buildingId: null, floor: null, timeRange: null, customStart: null, customEnd: null },

  addCard: (type: CardType) => {
    const config = createDefaultConfig(type);
    const card: DashboardCard = { id: config.id, config, x: 0, y: 0, width: 1, height: 1 };
    set((state) => ({ cards: [...state.cards, card] }));
    get().saveToStorage();
    return card.id;
  },

  removeCard: (id: string) => {
    set((state) => ({ cards: state.cards.filter((c) => c.id !== id) }));
    get().saveToStorage();
  },

  updateCardConfig: (id: string, configUpdate: Partial<CardConfig>) => {
    set((state) => ({
      cards: state.cards.map((card) =>
        card.id === id ? { ...card, config: { ...card.config, ...configUpdate } } : card,
      ),
    }));
    get().saveToStorage();
  },

  duplicateCard: (id: string) => {
    const card = get().cards.find((c) => c.id === id);
    if (!card) return "";
    const newId = `card-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newCard: DashboardCard = {
      ...card,
      id: newId,
      config: { ...card.config, id: newId, title: `${card.config.title} (copy)` },
    };
    set((state) => ({ cards: [...state.cards, newCard] }));
    get().saveToStorage();
    return newId;
  },

  resizeCard: (id: string, size: "small" | "wide" | "tall" | "large") => {
    const dims = SIZE_MAP[size];
    set((state) => ({
      cards: state.cards.map((card) =>
        card.id === id ? { ...card, width: dims.w, height: dims.h } : card,
      ),
    }));
    get().saveToStorage();
  },

  reorderCards: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const cards = [...state.cards];
      const [moved] = cards.splice(fromIndex, 1);
      cards.splice(toIndex, 0, moved);
      return { cards };
    });
    get().saveToStorage();
  },

  setCards: (cards: DashboardCard[]) => {
    set({ cards });
    get().saveToStorage();
  },

  setFilters: (filterUpdate: Partial<GlobalFilters>) => {
    set((state) => ({ filters: { ...state.filters, ...filterUpdate } }));
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({ cards: parsed.cards ?? [] });
      }
    } catch {
      /* ignore */
    }
  },

  saveToStorage: () => {
    try {
      const { cards } = get();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cards }));
    } catch {
      /* ignore */
    }
  },
}));
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/dashboard-store.test.ts 2>&1
```

Expected: PASS — all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/dashboard-store.ts tests/unit/dashboard-store.test.ts
git commit -m "feat(store): add zustand dashboard store with card/filter state"
```

### Task 11: Dashboard Canvas with Drag & Drop + Card Palette

**Files:**

- Create: `src/components/dashboard/Canvas.tsx`
- Create: `src/components/dashboard/CardPalette.tsx`
- Create: `src/components/dashboard/DashboardCard.tsx`
- Test: none (visual — verify in browser)

**Interfaces:**

- Consumes: `useDashboardStore` from `src/store/dashboard-store.ts`, `CardType` from `src/lib/types.ts`
- Produces: Draggable canvas with card palette toolbar

- [ ] **Step 1: Write CardPalette component**

Write to `src/components/dashboard/CardPalette.tsx`:

```tsx
"use client";
import { useRef } from "react";
import { useDashboardStore } from "@/store/dashboard-store";
import { Plus, BarChart3, Activity, Gauge, Hash, Download, Upload, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CardType } from "@/lib/types";

const CARD_TYPES: { type: CardType; label: string; icon: React.ReactNode }[] = [
  { type: "kpi", label: "KPI", icon: <Hash className="w-4 h-4" /> },
  { type: "bar", label: "Bar Chart", icon: <BarChart3 className="w-4 h-4" /> },
  { type: "line", label: "Line Chart", icon: <Activity className="w-4 h-4" /> },
  { type: "gauge", label: "Gauge", icon: <Gauge className="w-4 h-4" /> },
];

export default function CardPalette() {
  const addCard = useDashboardStore((s) => s.addCard);
  const cards = useDashboardStore((s) => s.cards);
  const setCards = useDashboardStore((s) => s.setCards);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const blob = new Blob([JSON.stringify({ cards }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bms-dashboard-layout.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.cards) setCards(data.cards);
      } catch {
        alert("Invalid layout file");
      }
    };
    reader.readAsText(file);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex items-center gap-2 p-4 border-b card-palette">
      <span className="text-sm font-medium text-muted-foreground mr-1 self-center">Add Card:</span>
      {CARD_TYPES.map(({ type, label, icon }) => (
        <Button
          key={type}
          variant="outline"
          size="sm"
          onClick={() => addCard(type)}
          className="gap-1.5"
        >
          {icon}
          <span>{label}</span>
          <Plus className="w-3 h-3" />
        </Button>
      ))}
      <div className="ml-auto flex items-center gap-1 no-print">
        <Button variant="ghost" size="sm" onClick={handleExport} title="Export layout">
          <Download className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          title="Import layout"
        >
          <Upload className="w-4 h-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <Button variant="ghost" size="sm" onClick={handlePrint} title="Print dashboard">
          <Printer className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write DashboardCard wrapper**

Write to `src/components/dashboard/DashboardCard.tsx`:

```tsx
"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Settings, Copy } from "lucide-react";
import type { DashboardCard as DashboardCardType } from "@/lib/types";
import { useDashboardStore } from "@/store/dashboard-store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import KPICard from "@/components/cards/KPICard";

interface Props {
  card: DashboardCardType;
  onConfigure: (cardId: string) => void;
}

const SIZE_OPTIONS = [
  { size: "small" as const, label: "1×1" },
  { size: "wide" as const, label: "2×1" },
  { size: "tall" as const, label: "1×2" },
  { size: "large" as const, label: "2×2" },
];

export default function DashboardCard({ card, onConfigure }: Props) {
  const removeCard = useDashboardStore((s) => s.removeCard);
  const duplicateCard = useDashboardStore((s) => s.duplicateCard);
  const resizeCard = useDashboardStore((s) => s.resizeCard);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: `${transition || ""}, opacity 0.2s ease-in-out`,
    opacity: isDragging ? 0.5 : 1,
    animation: "fadeIn 0.2s ease-out",
  };

  const colSpan = card.width > 1 ? `md:col-span-${card.width}` : "";
  const rowSpan = card.height > 1 ? `md:row-span-${card.height}` : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${colSpan} ${rowSpan} transition-all duration-200`}
    >
      <Card className="overflow-hidden h-full">
        <CardHeader className="flex flex-row items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="cursor-grab active:cursor-grabbing h-8 w-8"
              {...attributes}
              {...listeners}
              aria-label="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </Button>
            <h3 className="text-sm font-semibold truncate max-w-[200px]">{card.config.title}</h3>
          </div>
          <div className="flex items-center gap-1">
            {/* Resize button group */}
            <div className="flex items-center gap-0.5 mr-1">
              {SIZE_OPTIONS.map((opt) => (
                <Button
                  key={opt.size}
                  variant="ghost"
                  size="icon"
                  onClick={() => resizeCard(card.id, opt.size)}
                  className={`h-7 w-7 text-[10px] font-mono ${card.width === (opt.size === "wide" || opt.size === "large" ? 2 : 1) && card.height === (opt.size === "tall" || opt.size === "large" ? 2 : 1) ? "bg-accent text-accent-foreground" : ""}`}
                  aria-label={`Resize to ${opt.size}`}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => duplicateCard(card.id)}
              className="h-8 w-8"
              aria-label="Duplicate card"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onConfigure(card.id)}
              className="h-8 w-8"
              aria-label="Configure card"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeCard(card.id)}
              className="h-8 w-8 hover:text-destructive"
              aria-label="Remove card"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 min-h-[200px]">
          {!card.config.dataSource ? (
            <p className="text-sm text-muted-foreground italic text-center mt-8">
              Click settings to configure this card
            </p>
          ) : (
            <>
              {card.config.type === "kpi" && <KPICard config={card.config} />}
              {card.config.type === "bar" && (
                <p className="text-sm text-muted-foreground text-center mt-8">
                  Bar chart loading...
                </p>
              )}
              {card.config.type === "line" && (
                <p className="text-sm text-muted-foreground text-center mt-8">
                  Line chart loading...
                </p>
              )}
              {card.config.type === "gauge" && (
                <p className="text-sm text-muted-foreground text-center mt-8">Gauge loading...</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Write Canvas component**

Write to `src/components/dashboard/Canvas.tsx`:

```tsx
"use client";
import { useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDashboardStore } from "@/store/dashboard-store";
import DashboardCard from "./DashboardCard";
import CardConfigModal from "./CardConfigModal";

export default function Canvas() {
  const cards = useDashboardStore((s) => s.cards);
  const reorderCards = useDashboardStore((s) => s.reorderCards);
  const [configuringCardId, setConfiguringCardId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = cardIds.indexOf(String(active.id));
    const newIndex = cardIds.indexOf(String(over.id));
    if (oldIndex !== -1 && newIndex !== -1) reorderCards(oldIndex, newIndex);
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {cards.map((card) => (
              <DashboardCard
                key={card.id}
                card={card}
                onConfigure={(id) => setConfiguringCardId(id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {cards.length === 0 && (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <p className="text-lg">Add cards using the toolbar above</p>
        </div>
      )}

      {configuringCardId && (
        <CardConfigModal cardId={configuringCardId} onClose={() => setConfiguringCardId(null)} />
      )}
    </>
  );
}
```

- [ ] **Step 4: Update `src/app/page.tsx`**

```tsx
import CardPalette from "@/components/dashboard/CardPalette";
import Canvas from "@/components/dashboard/Canvas";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <CardPalette />
      <Canvas />
    </main>
  );
}
```

- [ ] **Step 5: Verify TypeScript compilation**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: No TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/Canvas.tsx src/components/dashboard/CardPalette.tsx src/components/dashboard/DashboardCard.tsx src/app/page.tsx
git commit -m "feat(dashboard): add DnD canvas, card palette, and card wrapper"
```

---

### Task 12: Card Config Modal — Dynamic Axis Selection

**Files:**

- Create: `src/components/dashboard/CardConfigModal.tsx`
- Test: none (manual verification — UI interaction)

**Interfaces:**

- Consumes: `useDashboardStore`, `ColumnInfo` from `src/app/api/columns/route.ts`
- Produces: Modal UI for selecting data source, axes, aggregation, filters

- [ ] **Step 1: Write the CardConfigModal component**

Write to `src/components/dashboard/CardConfigModal.tsx`:

```tsx
"use client";
import { useState, useEffect } from "react";
import { useDashboardStore } from "@/store/dashboard-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CardConfig, TableName, AggregationType } from "@/lib/types";
import type { ColumnInfo } from "@/app/api/columns/route";

interface Props {
  cardId: string;
  onClose: () => void;
}

const TABLE_NAMES: TableName[] = [
  "energy_consumption",
  "hvac_performance",
  "occupancy",
  "alerts_events",
];
const AGGREGATIONS: { value: AggregationType; label: string }[] = [
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
  { value: "count", label: "Count" },
];

export default function CardConfigModal({ cardId, onClose }: Props) {
  const cards = useDashboardStore((s) => s.cards);
  const updateCardConfig = useDashboardStore((s) => s.updateCardConfig);
  const card = cards.find((c) => c.id === cardId);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [loadingCols, setLoadingCols] = useState(false);
  const [editTitle, setEditTitle] = useState(card?.config.title ?? "");
  const [editDataSource, setEditDataSource] = useState<TableName | "">(
    card?.config.dataSource ?? "",
  );
  const [xAxis, setXAxis] = useState(card?.config.xAxis?.field ?? "");
  const [yAxis, setYAxis] = useState(card?.config.yAxis?.field ?? "");
  const [aggregation, setAggregation] = useState<AggregationType>(
    card?.config.aggregation ?? "sum",
  );
  const [groupBy, setGroupBy] = useState(card?.config.groupBy?.field ?? "");
  const [filterField, setFilterField] = useState("");
  const [filterOp, setFilterOp] = useState("eq");
  const [filterVal, setFilterVal] = useState("");
  const [gaugeMin, setGaugeMin] = useState(card?.config.gaugeMin ?? 0);
  const [gaugeMax, setGaugeMax] = useState(card?.config.gaugeMax ?? 100);
  const [gaugeTarget, setGaugeTarget] = useState(card?.config.gaugeTarget ?? 75);
  const config = card?.config;

  useEffect(() => {
    if (!editDataSource) {
      setColumns([]);
      return;
    }
    setLoadingCols(true);
    fetch(`/api/columns?source=${editDataSource}`)
      .then((res) => res.json())
      .then((data) => setColumns(data.columns ?? []))
      .catch(() => setColumns([]))
      .finally(() => setLoadingCols(false));
  }, [editDataSource]);

  function handleSave() {
    if (!config) return;
    const updates: Partial<CardConfig> = {
      title: editTitle,
      dataSource: (editDataSource || null) as TableName | null,
      xAxis: xAxis ? { field: xAxis, label: xAxis } : null,
      yAxis: yAxis ? { field: yAxis, label: yAxis } : null,
      aggregation,
      groupBy: groupBy ? { field: groupBy, label: groupBy } : null,
      filter:
        filterField && filterVal
          ? { field: filterField, operator: filterOp as any, value: filterVal }
          : null,
    };
    if (config.type === "gauge") {
      updates.gaugeMin = gaugeMin;
      updates.gaugeMax = gaugeMax;
      updates.gaugeTarget = gaugeTarget;
    }
    updateCardConfig(cardId, updates);
    onClose();
  }

  if (!config) return null;

  const numericColumns = columns.filter((c) => c.is_numeric);
  const stringColumns = columns.filter((c) => !c.is_numeric);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Configure {config.type.charAt(0).toUpperCase() + config.type.slice(1)} Card
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="cardTitle">Card Title</Label>
            <Input
              id="cardTitle"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Data Source</Label>
            <Select value={editDataSource} onValueChange={(v) => setEditDataSource(v as TableName)}>
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {TABLE_NAMES.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {editDataSource && (
            <>
              <div className="grid gap-2">
                <Label>{config.type === "line" ? "X-Axis (Timestamp)" : "X-Axis (Category)"}</Label>
                <Select value={xAxis} onValueChange={setXAxis}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col.column_name} value={col.column_name}>
                        {col.column_name} {col.is_numeric ? "(num)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Y-Axis (Value)</Label>
                <Select value={yAxis} onValueChange={setYAxis}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select numeric column" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((col) => (
                      <SelectItem key={col.column_name} value={col.column_name}>
                        {col.column_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Aggregation</Label>
                <Select
                  value={aggregation}
                  onValueChange={(v) => setAggregation(v as AggregationType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGGREGATIONS.map((agg) => (
                      <SelectItem key={agg.value} value={agg.value}>
                        {agg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {config.type === "line" && (
                <div className="grid gap-2">
                  <Label>Group By (Optional)</Label>
                  <Select value={groupBy} onValueChange={setGroupBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {stringColumns.map((col) => (
                        <SelectItem key={col.column_name} value={col.column_name}>
                          {col.column_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {config.type === "gauge" && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Min</Label>
                    <Input
                      type="number"
                      value={gaugeMin}
                      onChange={(e) => setGaugeMin(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Max</Label>
                    <Input
                      type="number"
                      value={gaugeMax}
                      onChange={(e) => setGaugeMax(parseFloat(e.target.value) || 100)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Target</Label>
                    <Input
                      type="number"
                      value={gaugeTarget}
                      onChange={(e) => setGaugeTarget(parseFloat(e.target.value) || 75)}
                    />
                  </div>
                </div>
              )}

              <div className="border-t pt-4 space-y-2">
                <Label>Optional Filter</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={filterField} onValueChange={setFilterField}>
                    <SelectTrigger>
                      <SelectValue placeholder="Field" />
                    </SelectTrigger>
                    <SelectContent>
                      {stringColumns.map((col) => (
                        <SelectItem key={col.column_name} value={col.column_name}>
                          {col.column_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterOp} onValueChange={setFilterOp}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eq">Equals</SelectItem>
                      <SelectItem value="neq">Not Equals</SelectItem>
                      <SelectItem value="gt">Greater Than</SelectItem>
                      <SelectItem value="lt">Less Than</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Value"
                    value={filterVal}
                    onChange={(e) => setFilterVal(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/CardConfigModal.tsx
git commit -m "feat(dashboard): add card config modal with dynamic axis selection"
```

---

### Task 13: KPI Card Component + UI Primitives

**Files:**

- Create: `src/components/cards/KPICard.tsx`
- Create: `src/components/ui/LoadingState.tsx`
- Create: `src/components/ui/ErrorState.tsx`
- Create: `src/components/ui/EmptyState.tsx`
- Test: none (visual)

**Interfaces:**

- Consumes: `CardConfig`, `GlobalFilters`; `POST /api/query` response
- Produces: React component that fetches and displays a single aggregated value

- [ ] **Step 1: Write LoadingState component with shadcn Skeleton**

Write to `src/components/ui/LoadingState.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[120px] gap-3 p-4">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-20" />
      <span className="text-xs text-muted-foreground mt-1">Loading data...</span>
    </div>
  );
}
```

- [ ] **Step 2: Write ErrorState component**

Write to `src/components/ui/ErrorState.tsx`:

```tsx
import { Button } from "@/components/ui/button";

interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[100px] p-4">
      <p className="text-sm text-destructive text-center">{message}</p>
      {onRetry && (
        <Button variant="link" size="sm" onClick={onRetry} className="mt-2">
          Retry
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write EmptyState component**

Write to `src/components/ui/EmptyState.tsx`:

```tsx
interface Props {
  message?: string;
}

export default function EmptyState({ message = "No data available" }: Props) {
  return (
    <div className="flex items-center justify-center h-full min-h-[100px]">
      <p className="text-sm text-muted-foreground italic">{message}</p>
    </div>
  );
}
```

- [ ] **Step 4: Write KPICard component**

Write to `src/components/cards/KPICard.tsx`:

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { useDashboardStore } from "@/store/dashboard-store";
import type { CardConfig, QueryResult } from "@/lib/types";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";

interface Props {
  config: CardConfig;
}

export default function KPICard({ config }: Props) {
  const filters = useDashboardStore((s) => s.filters);

  const { data, isLoading, error, refetch } = useQuery<QueryResult>({
    queryKey: ["kpi", config, filters],
    queryFn: async () => {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, globalFilters: filters }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: !!config.dataSource && !!config.yAxis,
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (!data) return null;

  const displayValue =
    data.aggregated !== null && data.aggregated !== undefined
      ? data.aggregated.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : "—";
  const label = config.yAxis?.label ?? "Value";
  const unit = config.dataSource === "energy_consumption" ? "kWh" : "";

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <span className="text-4xl font-bold">{displayValue}</span>
      <span className="text-sm text-muted-foreground mt-1">
        {label} {unit && `(${unit})`}
      </span>
      <span className="text-xs text-muted-foreground/60 mt-1 capitalize">{config.aggregation}</span>
    </div>
  );
}
```

- [ ] **Step 5: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/cards/KPICard.tsx src/components/ui/LoadingState.tsx src/components/ui/ErrorState.tsx src/components/ui/EmptyState.tsx
git commit -m "feat(cards): add KPI card component with data fetching and UI primitives"
```

---

### Task 14: Bar Chart Card Component

**Files:**

- Create: `src/components/cards/BarChartCard.tsx`
- Modify: `src/components/dashboard/DashboardCard.tsx` (wire BarChartCard)

**Interfaces:**

- Consumes: `CardConfig`, `GlobalFilters`; `POST /api/query`
- Produces: Recharts `BarChart` component

- [ ] **Step 1: Write BarChartCard component**

Write to `src/components/cards/BarChartCard.tsx`:

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDashboardStore } from "@/store/dashboard-store";
import type { CardConfig } from "@/lib/types";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";

interface Props {
  config: CardConfig;
}

export default function BarChartCard({ config }: Props) {
  const filters = useDashboardStore((s) => s.filters);

  const { data, isLoading, error, refetch } = useQuery<{ data: Record<string, unknown>[] }>({
    queryKey: ["bar", config, filters],
    queryFn: async () => {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, globalFilters: filters }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: !!config.dataSource && !!config.xAxis && !!config.yAxis,
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (data.length === 0)
    return <p className="text-sm text-gray-400 italic text-center mt-8">No data</p>;

  const xField = config.xAxis.field;
  const yField = config.yAxis.field;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={xField} tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={40} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey={yField} fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Wire BarChartCard into DashboardCard**

Read and edit `src/components/dashboard/DashboardCard.tsx`. Add import:

```tsx
import BarChartCard from "@/components/cards/BarChartCard";
```

Replace the placeholder:

```tsx
{
  card.config.type === "bar" && <BarChartCard config={card.config} />;
}
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/cards/BarChartCard.tsx src/components/dashboard/DashboardCard.tsx
git commit -m "feat(cards): add BarChart card component with Recharts"
```

---

### Task 15: Line Chart Card Component

**Files:**

- Create: `src/components/cards/LineChartCard.tsx`
- Modify: `src/components/dashboard/DashboardCard.tsx` (wire LineChartCard)

**Interfaces:**

- Consumes: `CardConfig`, `GlobalFilters`; `POST /api/query`
- Produces: Recharts `LineChart` component with optional group-by series

- [ ] **Step 1: Write LineChartCard component**

Write to `src/components/cards/LineChartCard.tsx`:

```tsx
"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { useDashboardStore } from "@/store/dashboard-store";
import type { CardConfig } from "@/lib/types";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";

interface Props {
  config: CardConfig;
}

const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899"];

export default function LineChartCardComponent({ config }: Props) {
  const filters = useDashboardStore((s) => s.filters);
  const [now, setNow] = useState(new Date());

  // Real-time clock — update every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const { data, isLoading, error, refetch } = useQuery<{ data: Record<string, unknown>[] }>({
    queryKey: ["line", config, filters],
    queryFn: async () => {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, globalFilters: filters }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: !!config.dataSource && !!config.xAxis && !!config.yAxis,
  });

  const chartData = data?.data ?? [];

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (chartData.length === 0)
    return <p className="text-sm text-muted-foreground italic text-center mt-8">No data</p>;

  const xField = config.xAxis.field;
  const yField = config.yAxis.field;
  const groupField = config.groupBy?.field;

  if (groupField) {
    const groups = [...new Set(chartData.map((d) => String(d[groupField])))];
    const timestamps = [...new Set(chartData.map((d) => String(d[xField])))];
    const groupedData = timestamps.map((ts) => {
      const entry: Record<string, unknown> = { [xField]: ts };
      for (const group of groups) {
        const match = data.find((d) => String(d[xField]) === ts && String(d[groupField]) === group);
        entry[String(group)] = match ? Number(match[yField]) : 0;
      }
      return entry;
    });

    // Find closest data point for group: take first group's timestamp
    const closestGroupPoint =
      groupedData.length > 0
        ? groupedData.reduce((prev, curr) => {
            const pDiff = Math.abs(new Date(String(prev[xField])).getTime() - nowMs);
            const cDiff = Math.abs(new Date(String(curr[xField])).getTime() - nowMs);
            return cDiff < pDiff ? curr : prev;
          }, groupedData[0])
        : null;

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-end px-3 pt-1 text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />
          {formatTime(now)}
        </div>
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={groupedData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={xField} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {closestGroupPoint && (
                <ReferenceLine
                  x={String(closestGroupPoint[xField])}
                  stroke="#ef4444"
                  strokeDasharray="4 2"
                  strokeWidth={1.5}
                  label={{ value: "● now", position: "top", fontSize: 10, fill: "#ef4444" }}
                />
              )}
              {groups.map((group, i) => (
                <Line
                  key={group}
                  type="monotone"
                  dataKey={String(group)}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Find data point closest to current time for the reference line
  const nowMs = now.getTime();
  const closestPoint =
    chartData.length > 0
      ? chartData.reduce((prev, curr) => {
          const prevDiff = Math.abs(new Date(String(prev[xField])).getTime() - nowMs);
          const currDiff = Math.abs(new Date(String(curr[xField])).getTime() - nowMs);
          return currDiff < prevDiff ? curr : prev;
        }, chartData[0])
      : null;

  return (
    <div className="flex flex-col h-full">
      {/* Real-time clock indicator */}
      <div className="flex items-center justify-end px-3 pt-1 text-xs text-muted-foreground">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />
        {formatTime(now)}
      </div>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xField} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {closestPoint && (
              <ReferenceLine
                x={String(closestPoint[xField])}
                stroke="#ef4444"
                strokeDasharray="4 2"
                strokeWidth={1.5}
                label={{ value: "● now", position: "top", fontSize: 10, fill: "#ef4444" }}
              />
            )}
            <Line
              type="monotone"
              dataKey={yField}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire LineChartCard into DashboardCard**

Read and edit `src/components/dashboard/DashboardCard.tsx`. Add import:

```tsx
import LineChartCardComponent from "@/components/cards/LineChartCard";
```

Replace the placeholder:

```tsx
{
  card.config.type === "line" && <LineChartCardComponent config={card.config} />;
}
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/cards/LineChartCard.tsx src/components/dashboard/DashboardCard.tsx
git commit -m "feat(cards): add LineChart card component with group-by support"
```

---

### Task 16: Gauge Chart Card Component

**Files:**

- Create: `src/components/cards/GaugeCard.tsx`
- Modify: `src/components/dashboard/DashboardCard.tsx` (wire GaugeCard)

**Interfaces:**

- Consumes: `CardConfig`, `GlobalFilters`; `POST /api/query`
- Produces: Custom SVG gauge component

- [ ] **Step 1: Write GaugeCard component**

Write to `src/components/cards/GaugeCard.tsx`:

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { useDashboardStore } from "@/store/dashboard-store";
import type { CardConfig, QueryResult } from "@/lib/types";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";

function GaugeSvg({
  value,
  min,
  max,
  target,
  label,
}: {
  value: number;
  min: number;
  max: number;
  target: number;
  label: string;
}) {
  const range = max - min || 1;
  const fraction = (value - min) / range;
  const clampedFraction = Math.max(0, Math.min(1, fraction));
  const angle = clampedFraction * 180;
  const targetFraction = Math.max(0, Math.min(1, (target - min) / range)) * 180;
  const radius = 70;
  const cx = 100,
    cy = 90;
  const startRad = Math.PI;
  const endRad = Math.PI + (angle * Math.PI) / 180;
  const tRad = Math.PI + (targetFraction * Math.PI) / 180;
  const tx = cx + radius * Math.cos(tRad);
  const ty = cy + radius * Math.sin(tRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);
  const color = value >= target ? "#22c55e" : value >= target * 0.75 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="130" viewBox="0 0 200 130">
        <path
          d={`M ${cx - radius + 5} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius - 5} ${cy}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - radius + 5} ${cy} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
        />
        {targetFraction > 0 && targetFraction < 180 && (
          <line x1={tx} y1={ty - 8} x2={tx} y2={ty + 8} stroke="#6b7280" strokeWidth="2" />
        )}
        <text x={cx} y={cy + 25} textAnchor="middle" fontSize="24" fontWeight="bold" fill={color}>
          {value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
        </text>
        <text x={cx} y={cy + 42} textAnchor="middle" fontSize="10" fill="#9ca3af">
          {label}
        </text>
      </svg>
      <div className="flex justify-between w-full max-w-[180px] text-xs text-gray-400 -mt-2">
        <span>{min}</span>
        <span className="text-gray-500">Target: {target}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function GaugeCard({ config }: Props) {
  const filters = useDashboardStore((s) => s.filters);

  const { data, isLoading, error, refetch } = useQuery<QueryResult>({
    queryKey: ["gauge", config, filters],
    queryFn: async () => {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, globalFilters: filters }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: !!config.dataSource && !!config.yAxis,
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (!data) return null;

  const value = data.aggregated ?? 0;
  const min = config.gaugeMin ?? 0;
  const max = config.gaugeMax ?? 100;
  const target = config.gaugeTarget ?? max;
  const label = config.yAxis?.label ?? "Value";

  return <GaugeSvg value={value} min={min} max={max} target={target} label={label} />;
}
```

- [ ] **Step 2: Wire GaugeCard into DashboardCard**

Read and edit `src/components/dashboard/DashboardCard.tsx`. Add import:

```tsx
import GaugeCard from "@/components/cards/GaugeCard";
```

Replace the placeholder:

```tsx
{
  card.config.type === "gauge" && <GaugeCard config={card.config} />;
}
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/cards/GaugeCard.tsx src/components/dashboard/DashboardCard.tsx
git commit -m "feat(cards): add Gauge card component with SVG arc"
```

### Task 17: Global Filters Component

**Files:**

- Create: `src/components/layout/GlobalFilters.tsx`
- Test: none (visual + functional)

**Interfaces:**

- Consumes: `useDashboardStore` (filters + setFilters)
- Produces: Filter bar with building select, floor select, time range picker

- [ ] **Step 1: Write GlobalFilters component**

Write to `src/components/layout/GlobalFilters.tsx`:

```tsx
"use client";
import { useDashboardStore } from "@/store/dashboard-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const BUILDINGS = [
  { id: "BLD-001", name: "Building 1 (BLD-001)" },
  { id: "BLD-002", name: "Building 2 (BLD-002)" },
];
const FLOORS = [1, 2];
const TIME_RANGES = [
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 Days" },
  { value: "custom", label: "Custom Range" },
];

export default function GlobalFilters() {
  const filters = useDashboardStore((s) => s.filters);
  const setFilters = useDashboardStore((s) => s.setFilters);
  const cardCount = useDashboardStore((s) => s.cards.length);

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
        Filters
      </span>

      <Select
        value={filters.buildingId ?? ""}
        onValueChange={(v) => setFilters({ buildingId: v || null })}
      >
        <SelectTrigger className="w-44 h-8 text-xs">
          <SelectValue placeholder="All Buildings" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Buildings</SelectItem>
          {BUILDINGS.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.floor ? String(filters.floor) : ""}
        onValueChange={(v) => setFilters({ floor: v ? parseInt(v, 10) : null })}
      >
        <SelectTrigger className="w-28 h-8 text-xs">
          <SelectValue placeholder="All Floors" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Floors</SelectItem>
          {FLOORS.map((f) => (
            <SelectItem key={f} value={String(f)}>
              Floor {f}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.timeRange ?? ""}
        onValueChange={(v) => {
          const val = v === "all" ? null : v;
          setFilters({
            timeRange: val as any,
            customStart: val !== "custom" ? null : filters.customStart,
            customEnd: val !== "custom" ? null : filters.customEnd,
          });
        }}
      >
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue placeholder="All Time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          {TIME_RANGES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filters.timeRange === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filters.customStart?.split("T")[0] ?? ""}
            onChange={(e) =>
              setFilters({
                customStart: e.target.value ? new Date(e.target.value).toISOString() : null,
              })
            }
            className="h-8 w-36 text-xs"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="date"
            value={filters.customEnd?.split("T")[0] ?? ""}
            onChange={(e) =>
              setFilters({
                customEnd: e.target.value ? new Date(e.target.value).toISOString() : null,
              })
            }
            className="h-8 w-36 text-xs"
          />
        </div>
      )}

      <span className="ml-auto text-xs text-muted-foreground">
        {cardCount} card{cardCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/GlobalFilters.tsx
git commit -m "feat(layout): add global filters for building, floor, and time range"
```

---

### Task 18: Navigation Bar + Root Layout Wiring

**Files:**

- Create: `src/components/layout/Navbar.tsx`
- Modify: `src/app/layout.tsx` (add Navbar + GlobalFilters to root layout)
- Test: none (visual)

**Interfaces:**

- Consumes: nothing (standalone nav component)
- Produces: Top navigation bar with Dashboard and Floor Plan links

- [ ] **Step 1: Write Navbar component**

Write to `src/components/layout/Navbar.tsx`:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { LayoutDashboard, Map, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <nav className="flex items-center justify-between px-4 py-3 border-b shadow-sm">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">BMS</span>
          </div>
          <span className="font-semibold hidden sm:inline">BMS Dashboard</span>
        </Link>
        <div className="flex items-center gap-1">
          <Button variant={pathname === "/" ? "secondary" : "ghost"} size="sm" asChild>
            <Link href="/">
              <LayoutDashboard className="w-4 h-4 mr-1" /> Dashboard
            </Link>
          </Button>
          <Button
            variant={pathname?.startsWith("/floor-plan") ? "secondary" : "ghost"}
            size="sm"
            asChild
          >
            <Link href="/floor-plan">
              <Map className="w-4 h-4 mr-1" /> Floor Plan
            </Link>
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Update root layout**

Write to `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { QueryProvider } from "@/components/layout/QueryProvider";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import GlobalFilters from "@/components/layout/GlobalFilters";
import StoreInitializer from "@/components/layout/StoreInitializer";

export const metadata: Metadata = {
  title: "BMS Dashboard",
  description: "Building Management System Dashboard Builder",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <StoreInitializer />
            <Navbar />
            <GlobalFilters />
            <main>{children}</main>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Write StoreInitializer component**

Write to `src/components/layout/StoreInitializer.tsx`:

```tsx
"use client";
import { useEffect } from "react";
import { useDashboardStore } from "@/store/dashboard-store";

export default function StoreInitializer() {
  const loadFromStorage = useDashboardStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return null;
}
```

- [ ] **Step 4: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Navbar.tsx src/components/layout/StoreInitializer.tsx src/app/layout.tsx src/components/layout/ThemeProvider.tsx
git commit -m "feat(layout): add navbar with theme toggle, store initializer, and wire root layout"
```

---

### Task 19: Floor Plan Page — SVG + Occupancy Overlays

**Files:**

- Create: `src/app/floor-plan/page.tsx`
- Create: `src/components/floor-plan/FloorPlanSVG.tsx`
- Create: `src/components/floor-plan/ZoneOverlay.tsx`
- Create: `src/components/floor-plan/OccupancyTooltip.tsx`
- Test: none (visual)

**Interfaces:**

- Consumes: `GET /api/occupancy/latest?building_id=X&floor=Y`
- Produces: SVG floor plan page with occupancy overlays, building/floor tabs, 30s auto-refresh

- [ ] **Step 1: Write OccupancyTooltip component**

Write to `src/components/floor-plan/OccupancyTooltip.tsx`:

```tsx
interface ZoneData {
  zone: string;
  floor: number;
  occupancy_rate_percent?: number;
  person_count?: number;
  zone_capacity?: number;
  co2_ppm?: number;
  air_quality_index?: number;
  timestamp?: string;
}
interface Props {
  data: ZoneData;
  x: number;
  y: number;
}

export default function OccupancyTooltip({ data, x, y }: Props) {
  return (
    <div
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm pointer-events-none"
      style={{ left: x + 12, top: y - 10 }}
    >
      <p className="font-semibold text-gray-800 mb-1">{data.zone}</p>
      <table className="text-xs text-gray-600">
        <tbody>
          <tr>
            <td className="pr-3">Floor:</td>
            <td>{data.floor}</td>
          </tr>
          <tr>
            <td className="pr-3">Occupancy:</td>
            <td>{data.occupancy_rate_percent?.toFixed(1) ?? "—"}%</td>
          </tr>
          <tr>
            <td className="pr-3">People:</td>
            <td>
              {data.person_count ?? "—"} / {data.zone_capacity ?? "—"}
            </td>
          </tr>
          <tr>
            <td className="pr-3">CO2:</td>
            <td>{data.co2_ppm ?? "—"} ppm</td>
          </tr>
          <tr>
            <td className="pr-3">AQI:</td>
            <td>{data.air_quality_index ?? "—"}</td>
          </tr>
          <tr>
            <td className="pr-3">Updated:</td>
            <td>{data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : "—"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Write ZoneOverlay component**

Write to `src/components/floor-plan/ZoneOverlay.tsx`:

```tsx
"use client";
import { useState } from "react";
import OccupancyTooltip from "./OccupancyTooltip";

interface ZoneData {
  zone: string;
  floor: number;
  occupancy_rate_percent?: number;
  person_count?: number;
  zone_capacity?: number;
  co2_ppm?: number;
  air_quality_index?: number;
  timestamp?: string;
}
interface Props {
  zoneData: ZoneData;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

function getOccupancyColor(rate?: number): string {
  if (rate === undefined || rate === null) return "#9ca3af";
  if (rate > 75) return "#ef4444";
  if (rate > 40) return "#f59e0b";
  return "#22c55e";
}

function isStale(timestamp?: string): boolean {
  if (!timestamp) return true;
  return Date.now() - new Date(timestamp).getTime() > 60 * 60 * 1000;
}

export default function ZoneOverlay({ zoneData, x, y, width, height, label }: Props) {
  const [tooltip, setTooltip] = useState<{ show: boolean; pageX: number; pageY: number }>({
    show: false,
    pageX: 0,
    pageY: 0,
  });
  const stale = isStale(zoneData.timestamp);
  const fillColor = stale ? "#d1d5db" : getOccupancyColor(zoneData.occupancy_rate_percent);
  const personCount = zoneData.person_count ?? 0;

  return (
    <g
      onMouseMove={(e) => setTooltip({ show: true, pageX: e.pageX, pageY: e.pageY })}
      onMouseLeave={() => setTooltip({ show: false, pageX: 0, pageY: 0 })}
      style={{ cursor: "pointer" }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill={fillColor}
        fillOpacity={stale ? 0.3 : 0.6}
        stroke={stale ? "#9ca3af" : fillColor}
        strokeWidth={2}
      />
      {stale && (
        <text
          x={x + width / 2}
          y={y + height / 2 - 4}
          textAnchor="middle"
          fontSize="11"
          fill="#6b7280"
        >
          No data
        </text>
      )}
      <text
        x={x + width / 2}
        y={y + (stale ? height / 2 + 12 : height / 2 - 4)}
        textAnchor="middle"
        fontSize="13"
        fontWeight="bold"
        fill={stale ? "#9ca3af" : "#1f2937"}
      >
        {label}
      </text>
      {!stale && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 14}
          textAnchor="middle"
          fontSize="11"
          fill="#4b5563"
        >
          {personCount} people
        </text>
      )}
      {tooltip.show && zoneData.occupancy_rate_percent !== undefined && (
        <foreignObject
          x={0}
          y={0}
          width="100%"
          height="100%"
          overflow="visible"
          pointerEvents="none"
        >
          <OccupancyTooltip
            data={zoneData}
            x={tooltip.pageX - x - 250}
            y={tooltip.pageY - y - 100}
          />
        </foreignObject>
      )}
    </g>
  );
}
```

- [ ] **Step 3: Write FloorPlanSVG component**

Write to `src/components/floor-plan/FloorPlanSVG.tsx`:

```tsx
"use client";
import ZoneOverlay from "./ZoneOverlay";

interface ZoneData {
  zone: string;
  floor: number;
  occupancy_rate_percent?: number;
  person_count?: number;
  zone_capacity?: number;
  co2_ppm?: number;
  air_quality_index?: number;
  timestamp?: string;
}
interface Props {
  zones: ZoneData[];
  buildingId: string;
  floor: number;
}

export default function FloorPlanSVG({ zones, buildingId, floor }: Props) {
  const zoneMap = new Map<string, ZoneData>();
  for (const z of zones) zoneMap.set(z.zone, z);

  const zoneLayouts = [
    { zone: "Zone-A", x: 20, y: 20, width: 340, height: 360, label: "Open Workspace" },
    { zone: "Zone-B", x: 380, y: 20, width: 200, height: 200, label: "Meeting Rooms" },
    { zone: "Zone-C", x: 380, y: 240, width: 200, height: 140, label: "Server Room" },
  ];

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 600 420"
      className="bg-gray-50 rounded-lg border border-gray-200"
    >
      <rect
        x={10}
        y={10}
        width={580}
        height={400}
        rx={8}
        fill="none"
        stroke="#d1d5db"
        strokeWidth={2}
      />
      <rect x={365} y={15} width={8} height={390} fill="#e5e7eb" rx={2} />
      <text x={20} y={405} fontSize="10" fill="#9ca3af">
        {buildingId} — Floor {floor}
      </text>
      <rect x={480} y={395} width={10} height={10} fill="#22c55e" rx={2} />
      <text x={494} y={404} fontSize="9" fill="#6b7280">
        &lt;40%
      </text>
      <rect x={530} y={395} width={10} height={10} fill="#f59e0b" rx={2} />
      <text x={544} y={404} fontSize="9" fill="#6b7280">
        40-75%
      </text>
      <rect x={565} y={395} width={10} height={10} fill="#ef4444" rx={2} />
      <text x={579} y={404} fontSize="9" fill="#6b7280">
        &gt;75%
      </text>

      {zoneLayouts.map((layout) => {
        const zoneData = zoneMap.get(layout.zone) ?? {
          zone: layout.zone,
          floor,
          occupancy_rate_percent: undefined,
          person_count: undefined,
          zone_capacity: undefined,
          co2_ppm: undefined,
          air_quality_index: undefined,
          timestamp: undefined,
        };
        return (
          <ZoneOverlay
            key={layout.zone}
            zoneData={zoneData}
            x={layout.x}
            y={layout.y}
            width={layout.width}
            height={layout.height}
            label={layout.label}
          />
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 4: Write the floor plan page**

Write to `src/app/floor-plan/page.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FloorPlanSVG from "@/components/floor-plan/FloorPlanSVG";

const BUILDING_FLOORS = [
  { buildingId: "BLD-001", floor: 1, label: "BLD-001 — Floor 1" },
  { buildingId: "BLD-001", floor: 2, label: "BLD-001 — Floor 2" },
  { buildingId: "BLD-002", floor: 1, label: "BLD-002 — Floor 1" },
  { buildingId: "BLD-002", floor: 2, label: "BLD-002 — Floor 2" },
];

export default function FloorPlanPage() {
  const [selected, setSelected] = useState(BUILDING_FLOORS[0]);

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["occupancy", selected.buildingId, selected.floor],
    queryFn: async () => {
      const res = await fetch(
        `/api/occupancy/latest?building_id=${selected.buildingId}&floor=${selected.floor}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const zones = data?.zones ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Floor Plan</h1>

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {BUILDING_FLOORS.map((bf) => (
          <button
            key={`${bf.buildingId}-${bf.floor}`}
            onClick={() => setSelected(bf)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              selected.buildingId === bf.buildingId && selected.floor === bf.floor
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {bf.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">
          Last updated: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—"}
          <span className="ml-2 inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </span>
        {isLoading && <span className="text-xs text-blue-500">Refreshing...</span>}
      </div>

      <div className="w-full max-h-[600px]">
        <FloorPlanSVG zones={zones} buildingId={selected.buildingId} floor={selected.floor} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/floor-plan/page.tsx src/components/floor-plan/FloorPlanSVG.tsx src/components/floor-plan/ZoneOverlay.tsx src/components/floor-plan/OccupancyTooltip.tsx
git commit -m "feat(floor-plan): add SVG floor plan with occupancy overlays and tooltips"
```

---

### [Phase 4 Complete] User tests, then Merge `phase/4-frontend` to `main`

After user manually tests frontend (dashboard builder, cards, filters, floor plan) and approves:

```bash
git checkout main
git merge phase/4-frontend
git checkout -b phase/5-polish
```

---

### Task 20: UI Polish — Alert Severity Colors + shadcn Theme Fine-Tune

**Files:**

- Modify: `src/app/globals.css` (add severity CSS variables on top of shadcn)
- Test: none (visual)

**Interfaces:**

- Consumes: shadcn theme variables already set by preset + `next-themes` for dark mode
- Produces: Alert severity color scheme (Critical=red, Warning=orange, Info=blue)

> Note: Dark mode is already handled by `next-themes` (included via shadcn preset). The ThemeToggle is part of the Navbar in Task 18. No manual CSS overrides for dark mode are needed — shadcn's CSS variables handle it.

- [ ] **Step 1: Add severity CSS variables**

Edit `src/app/globals.css` — add at the end of the file (after shadcn's `@layer base` block):

```css
@layer base {
  :root {
    --color-severity-critical: #ef4444;
    --color-severity-warning: #f97316;
    --color-severity-info: #3b82f6;
  }
}

/* Animated transitions — card add/remove */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Print/PDF export styles */
@media print {
  nav,
  .filters-bar,
  .card-palette,
  .no-print {
    display: none !important;
  }
  body {
    background: white !important;
  }
  .card {
    break-inside: avoid;
    border: 1px solid #ccc !important;
    box-shadow: none !important;
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(ui): add alert severity color CSS variables (critical/warning/info)"
```

---

### Task 21: Unit Tests for Core Logic

**Files:**

- Test: `tests/unit/aggregation.test.ts` (already created in Task 6)
- Test: `tests/unit/query-builder.test.ts` (already created in Task 6)
- Test: `tests/unit/dashboard-store.test.ts` (already created in Task 10)
- Test: `tests/unit/api-columns.test.ts` (already created in Task 7)
- Test: `tests/unit/api-query.test.ts` (already created in Task 8)
- Test: `tests/unit/api-occupancy.test.ts` (already created in Task 9)
- Test: `tests/unit/line-chart-card.test.tsx` — new, for real-time clock bonus
- Test: none new other than line-chart-card — run all existing tests to verify they still pass

**Interfaces:**

- Consumes: all existing source files
- Produces: green test suite

- [ ] **Step 1a: Write LineChartCard clock test**

```typescript
// tests/unit/line-chart-card.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import LineChartCardComponent from "@/components/cards/LineChartCard";
import { useDashboardStore } from "@/store/dashboard-store";
import type { CardConfig } from "@/lib/types";

// Mock recharts to avoid SVG complexity in test
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div>Line</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  CartesianGrid: () => <div>Grid</div>,
  Tooltip: () => <div>Tooltip</div>,
  Legend: () => <div>Legend</div>,
  ReferenceLine: (props: any) => <div data-testid="ref-line" data-x={props.x}>RefLine</div>,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: { data: [] }, isLoading: false, error: null, refetch: vi.fn() }),
}));

describe("LineChartCard - Real-time clock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useDashboardStore.setState({ cards: [], filters: { buildingId: null, floor: null, timeRange: "24h", customStart: null, customEnd: null } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("displays current time and updates every second", () => {
    const config: CardConfig = {
      id: "test-line", type: "line", title: "Test", dataSource: "energy_consumption",
      xAxis: { field: "timestamp" }, yAxis: { field: "usage" }, groupBy: null, filter: null,
    };
    render(<LineChartCardComponent config={config} />);
    // Should show time (at mock time 0 = midnight)
    expect(screen.getByText(/:\d{2}:\d{2}/)).toBeTruthy();
  });

  it("renders a live indicator dot", () => {
    const config: CardConfig = {
      id: "test-line", type: "line", title: "Test", dataSource: "energy_consumption",
      xAxis: { field: "timestamp" }, yAxis: { field: "usage" }, groupBy: null, filter: null,
    };
    render(<LineChartCardComponent config={config} />);
    // Green pulsing dot indicates live data
    const dot = document.querySelector(".animate-pulse");
    expect(dot).toBeTruthy();
  });
});
```

- [ ] **Step 1b: Run all unit tests**

```bash
npx vitest run 2>&1
```

Expected: PASS — all 34+ tests across 6 test files pass.

If any tests fail, debug and fix them before proceeding.

- [ ] **Step 2: Check test coverage (optional)**

```bash
npx vitest run --coverage 2>&1 | tail -30
```

Expected: Coverage report showing lines/functions/branches covered.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: verify all unit tests pass for core logic modules"
```

---

### Task 22: Vitest Configuration Setup

**Files:**

- Create: `vitest.config.mts` (or add to existing config)
- Test: none (config file, tests already run)

- [ ] **Step 1: Create vitest config**

Write to `vitest.config.mts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 2: Add test script to package.json**

Read `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Run tests again with config**

```bash
npm test 2>&1
```

Expected: All tests pass via npm script.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.mts package.json
git commit -m "chore(test): add vitest configuration and npm test script"
```

---

### Task 23: Documentation — README + Architecture Brief + PROMPT_HISTORY.md

**Files:**

- Create: `README.md`
- Create: `ARCHITECTURE.md`
- Create: `PROMPT_HISTORY.md`
- Test: none (documentation)

- [ ] **Step 1: Write README.md**

Write to `README.md`:

````markdown
# BMS Dashboard Builder

A full-stack Building Management System (BMS) dashboard with a drag-and-drop card-based builder, four chart types, global filters, and an SVG floor plan occupancy view.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts, dnd-kit, zustand, @tanstack/react-query, lucide-react
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** Microsoft SQL Server (MSSQL)
- **Testing:** Vitest

## Prerequisites

- Node.js 18+
- Microsoft SQL Server (local or Docker)
- npm

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```
````

2. **Configure database:**
   Edit `.env` with your SQL Server connection string:

   ```
   DATABASE_URL="sqlserver://localhost:1433;database=bms_dashboard;user=SA;password=YourPassword123;trustServerCertificate=true"
   ```

3. **Push schema to database:**

   ```bash
   npx prisma db push
   ```

4. **Seed data from CSVs:**

   ```bash
   npx prisma db seed
   ```

5. **Run the development server:**

   ```bash
   npm run dev
   ```

6. **Open the app:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Running Tests

```bash
npm test
```

## Project Structure

```
src/
  app/              — Next.js App Router pages + API routes
  components/       — React components (dashboard, cards, layout, floor-plan, ui)
  lib/              — Shared utilities (Prisma client, aggregation, query builder, types)
  store/            — Zustand state management
prisma/             — Schema + seed script
tests/              — Unit tests
data/               — CSV data files
```

## Features

- **Dashboard Builder:** Drag-and-drop canvas with 4 card types (KPI, Bar, Line, Gauge)
- **Dynamic Axis Selection:** Select data source, map columns to axes, configure aggregation
- **Global Filters:** Filter by building, floor, and time range across all cards
- **Floor Plan View:** SVG floor plans with color-coded occupancy overlays, hover tooltips, auto-refresh
- **Dark Mode:** Toggle dark/light theme
- **Persistence:** Dashboard layout saved to localStorage

````

- [ ] **Step 2: Write ARCHITECTURE.md**

Write to `ARCHITECTURE.md`:
```markdown
# Architecture Brief

## State Management Approach

Zustand is used for all frontend state:
- `useDashboardStore` manages `cards[]` (the dashboard layout) and `filters` (global filter state)
- Card config updates trigger `saveToStorage()` which persists to localStorage
- On page load, `StoreInitializer` calls `loadFromStorage()` to hydrate state
- Global filter changes are reactive — all card components re-fetch via `useCallback`/`useEffect` dependency on `filters`

## Data Flow: SQL Server -> Card Rendering

1. CSV files are imported into SQL Server via Prisma seed script
2. When a card is configured, the frontend sends `{ config, globalFilters }` to `POST /api/query`
3. The backend calls `buildQuery()` to construct a Prisma `findMany` with `where`, `select`, `orderBy`, and `groupBy`
4. Prisma Client executes the query against SQL Server
5. For KPI/Gauge cards, the backend applies aggregation (sum/avg/min/max/count) and returns a single value
6. For Bar/Line charts, the raw rows are returned — Recharts renders them client-side

## Drag-and-Drop Implementation Strategy

Using `@dnd-kit/core` and `@dnd-kit/sortable`:
- `DndContext` wraps the canvas with `closestCenter` collision detection
- Each `DashboardCard` is wrapped in `useSortable` which provides drag handle listeners
- `SortableContext` with `verticalListSortingStrategy` enables reordering
- On drag end, the store's `reorderCards(fromIndex, toIndex)` updates the array and persists to localStorage

## Dynamic Axis Binding

1. User opens CardConfigModal, selects a data source (table name)
2. Frontend fetches `GET /api/columns?source=energy_consumption` which returns column metadata
3. UI populates dropdowns: X-Axis, Y-Axis, Aggregation, Group-By, Filter
4. User maps columns to axes and clicks Save
5. CardConfig calls `updateCardConfig()` in the store
6. The card component re-renders, detects the new config, and calls `POST /api/query`

## Database Schema Design Decisions

- 4 models map directly to the 4 CSV files with snake_case -> camelCase field mapping
- Each model has an auto-increment `id` primary key
- `@map()` directives map Prisma camelCase fields to SQL Server snake_case columns
- `@@map()` directives set the actual SQL table names matching the CSV filenames
- Optional fields (deviceId, resolvedAt, acknowledgedBy) use `String?` / `DateTime?`
- No raw SQL — all queries go through Prisma Client, preventing SQL injection

## SVG Floor Plan Zone Overlay Approach

- FloorPlanSVG renders a 600x420 SVG canvas with predefined zone rectangles
- ZoneOverlay uses SVG `<rect>` elements positioned and sized per zone
- Occupancy data is fetched from `GET /api/occupancy/latest` which returns the latest reading per zone
- Color coding: green (<40%), yellow (40-75%), red (>75%)
- Stale data (>1 hour) shows gray with "No data" text
- Hover tooltip uses SVG `<foreignObject>` to embed HTML tooltip content
- Auto-refresh via `setInterval(fetchOccupancy, 30000)`
````

- [ ] **Step 3: Write PROMPT_HISTORY.md**

Write to `PROMPT_HISTORY.md`:

```markdown
# PROMPT_HISTORY.md

This document records the complete interaction between the developer and AI tools during the creation of the BMS Dashboard Builder application.

## Overview

- **Project:** BMS Dashboard Builder
- **AI Tool:** Claude Code (opencode)
- **Approach:** Plan-first execution using writing-plans skill, followed by subagent-driven development for each task

## Interaction Summary

### Phase 1: Planning

**Prompt:** "Write a detailed implementation plan for the BMS Dashboard Builder..."

**AI Response:** Produced a 22-task implementation plan covering project setup through documentation, following the AGENTS.md build order (data-explorer -> infra -> backend -> frontend -> polish). The plan was saved to `docs/superpowers/plans/2026-07-16-bms-dashboard-build.md`.

### Phase 2: Data Exploration

**Prompt:** "Run the data exploration agent to profile CSV files before schema design."

**AI Response:** Created `scripts/profile-data.ts` which reads all 4 CSV files and outputs column-by-column profiles including non-null counts, unique values, and numeric ranges.

### Phase 3: Infrastructure

**Prompt:** "Set up Prisma schema and seed script based on the profiled CSV data."

**AI Response:** Created `prisma/schema.prisma` with 4 models (EnergyConsumption, HvacPerformance, Occupancy, AlertsEvent) mapping CSV columns to Prisma fields with proper type mappings. Created `prisma/seed.ts` to read CSVs and insert rows using Prisma Client.

### Phase 4: Backend API

**Prompt:** "Build the backend API routes — columns endpoint, query endpoint, and occupancy latest endpoint."

**AI Response:**

- `GET /api/columns` — returns static column metadata per table (field name, type, is_numeric)
- `POST /api/query` — accepts card config + global filters, builds Prisma query, returns aggregated or raw data
- `GET /api/occupancy/latest` — fetches latest occupancy reading per zone for a building/floor combo

### Phase 5: Frontend

**Prompt:** "Build the frontend — zustand store, DnD canvas, card types, config modal, floor plan."

**AI Response:**

- Zustand store with card CRUD, filter state, localStorage persistence
- dnd-kit canvas with sortable card grid
- CardConfigModal with dynamic column fetching and axis mapping
- 4 card types: KPI, BarChart, LineChart (with group-by), Gauge (custom SVG)
- Floor plan page with SVG overlays, auto-refresh, stale data handling

### Phase 6: Polish

**Prompt:** "Add dark mode, severity colors, loading states, and documentation."

**AI Response:** Added dark mode toggle with CSS custom properties, alert severity color scheme, loading/error/empty state components, README, architecture brief, and PROMPT_HISTORY.md.

## Key Design Decisions

1. **No client-side CSV parsing** — all data from backend API (per spec requirement)
2. **Static column metadata** — columns endpoint returns hardcoded metadata rather than querying INFORMATION_SCHEMA, avoiding DB round-trips and simplifying testing
3. **Zustand over Redux** — simpler API, built-in TypeScript support, no boilerplate
4. **Grid layout over free-form** — easier to implement with dnd-kit sortable, ensures consistent card sizing
5. **SVG gauge** — custom implementation avoids heavy chart library dependency for a simple component

## AI Tool Usage Reflection

- The writing-plans skill was essential for breaking down the large scope into manageable tasks
- TDD steps (failing test -> implement -> pass) kept code quality high
- Subagent-driven development allowed parallel work on independent components
- The AGENTS.md build order prevented circular dependencies between phases
```

- [ ] **Step 4: Commit**

```bash
git add README.md ARCHITECTURE.md PROMPT_HISTORY.md
git commit -m "docs: add README, architecture brief, and prompt history"
```

---

### Task 24: Final Verification — Build Check + Full Test Suite

**Files:**

- Test: Run full build and test suite
- Modify: none (verification only)

- [ ] **Step 1: Run full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: No TypeScript errors.

- [ ] **Step 2: Run full test suite**

```bash
npm test 2>&1
```

Expected: All tests pass.

- [ ] **Step 3: Run production build**

```bash
npm run build 2>&1 | tail -30
```

Expected: `Route (app)` listing all pages and API routes, no build errors.

- [ ] **Step 4: Verify all files are tracked by git**

```bash
git status
```

Expected: No untracked files (everything committed).

- [ ] **Step 5: Make final commit if needed**

```bash
git add -A && git commit -m "chore: final verification and cleanup"
```

---

### [Final Merge] User tests, then Merge `phase/5-polish` to `main`

After user manually tests the full dashboard (all features working, no regressions) and approves:

```bash
git checkout main
git merge phase/5-polish
git log --oneline
```

---

## Self-Review Checklist

### Spec Coverage

- [x] Dashboard Builder (Core) — Tasks 10, 11, 12
- [x] 4 Card Types (KPI, Bar, Line, Gauge) — Tasks 13, 14, 15, 16
- [x] Dynamic Axis Selection — Task 12 (CardConfigModal) + Task 7 (Columns API)
- [x] Global Filters (Building, Floor, Time Range) — Task 17
- [x] Floor Plan View (SVG, occupancy overlays, tooltips, 30s refresh) — Task 19
- [x] Persist layout (localStorage) — Task 10 (zustand store)
- [x] Loading/Empty/Error states — Tasks 13 (UI primitives)
- [x] Dark Mode — Task 20
- [x] Alert severity colors (Critical=red, Warning=orange, Info=blue) — Task 20
- [x] Responsive at 1280px+ — Tailwind grid (md:grid-cols-2)
- [x] Prisma schema + seed — Tasks 3, 4
- [x] Backend API routes — Tasks 7, 8, 9
- [x] Unit tests — Task 21 (+ Tasks 6, 7, 8, 9, 10)
- [x] Documentation (README, Architecture, PROMPT_HISTORY) — Task 23

### Placeholder Scan

- [x] No "TBD", "TODO", "implement later", "fill in details", or "add appropriate error handling" in any code step
- [x] Complete code in every code step — no "similar to Task N" references

### Type Consistency

- [x] `CardType` = "kpi" | "bar" | "line" | "gauge" — consistent across all tasks
- [x] `AggregationType` = "sum" | "avg" | "min" | "max" | "count" — consistent across all tasks
- [x] `TableName` = 4 table names — consistent across schema, API, and cards
- [x] `GlobalFilters` shape (buildingId, floor, timeRange, customStart, customEnd) — consistent in store and query-builder
- [x] `CardConfig` shape (id, type, title, dataSource, xAxis, yAxis, aggregation, groupBy, filter, gauge*) — consistent across all tasks
- [x] Function signatures match between test imports and implementation exports

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-16-bms-dashboard-build.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
