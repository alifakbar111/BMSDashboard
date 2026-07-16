# Prompt History

This document logs the AI-assisted workflow used to build the BMS Dashboard Builder application.

---

## Session 1: Project Scaffolding

**Prompt 1.1**

> I need to set up a Next.js project with App Router, TypeScript, Tailwind CSS, and Prisma with SQL Server. The project is a Building Management System dashboard. Give me the exact commands to initialize the project and install all dependencies including Recharts, dnd-kit, and papaparse.

**Response Summary:**

- Recommended `npx create-next-app@latest` with flags `--typescript --tailwind --app`
- Listed all dependencies: `prisma`, `@prisma/client`, `recharts`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `papaparse`
- Showed `.env.local` setup for SQL Server connection string
- Suggested `prisma init` with `sqlserver` provider

**Follow-up 1.2**

> What should my `.env.local` look like for a local SQL Server running in Docker with SA password?

**Response Summary:**

- Provided `DATABASE_URL="sqlserver://localhost:1433;database=BMS_Dashboard;user=sa;password=YourPassword123!;trustServerCertificate=true"`
- Noted `trustServerCertificate=true` is needed for local dev

**My Decision:**

- Used the exact env format provided. Added `docker-compose.yml` for SQL Server container as my own addition.

---

## Session 2: Prisma Schema Design

**Prompt 2.1**

> Based on these CSV files, design a Prisma schema for a BMS dashboard. The tables are energy_consumption, hvac_performance, occupancy, and alerts_events. Here's the data dictionary: [pasted DATA_DICTIONARY.md content]

**Response Summary:**

- Generated 4 Prisma models with all columns typed correctly (`DateTime`, `Float`, `Int`, `String`)
- Suggested `@id` using `alert_id` for alerts table, auto-increment for others
- Recommended composite indexes on `(building_id, timestamp)` for query performance
- Noted `@default(0)` for nullable numeric fields

**Follow-up 2.2**

> Can you also create a seed.ts file that reads the CSV files from the data/ directory and imports them into SQL Server using Prisma?

**Response Summary:**

- Provided a seed script using `papaparse` to parse CSV files
- Used `prisma.energyConsumption.createMany()` for batch inserts
- Handled date parsing with `new Date(row.timestamp)`
- Showed how to configure `prisma/seed` in `package.json`

**My Decision:**

- Adopted the seed script almost entirely. Modified error handling to log which row failed instead of crashing. Added a `--reset` flag to drop and recreate tables before seeding.

---

## Session 3: Database Query Layer

**Prompt 3.1**

> I need a dynamic query builder using Prisma that takes a card configuration object (data source, x-axis, y-axis, aggregation type, group-by, filters) and returns the correct data. The aggregation types are sum, avg, min, max, count. How do I do dynamic groupBy with Prisma?

**Response Summary:**

- Explained that Prisma's `groupBy` supports `_sum`, `_avg`, `_min`, `_max`, `_count`
- Showed how to dynamically construct the `by` array and aggregation select
- Provided a helper function `buildQuery(config)` that returns the Prisma query object
- Noted Prisma limitations: raw SQL may be needed for complex aggregations

**Follow-up 3.2**

> Prisma's groupBy doesn't support GROUP BY on timestamp with hour truncation. How do I group energy data by hour?

**Response Summary:**

- Suggested using Prisma's `$queryRaw` for date truncation: `DATEPART(hour, timestamp) AS hour`
- Provided raw SQL template with parameterized filters
- Noted this is a common Prisma limitation with date functions

**My Decision:**

- Used `$queryRaw` for time-based aggregations only. Kept Prisma Client for all other queries. Wrapped raw queries in a typed helper to maintain type safety.

---

## Session 4: API Routes

**Prompt 4.1**

> Design the API routes for my BMS dashboard. I need endpoints to: get schema metadata (tables and columns), execute dynamic queries for cards, get distinct buildings, and get distinct floors. All using Next.js App Router Route Handlers.

**Response Summary:**

- Designed 5 routes: `GET /api/schema`, `POST /api/query`, `GET /api/buildings`, `GET /api/floors`, `POST /api/seed`
- Showed route handler structure with `export async function GET/POST(req: NextRequest)`
- Provided input validation using Zod schemas
- Added proper error responses with status codes

**Follow-up 4.2**

> How should I structure the POST /api/query endpoint to accept card config and return data for any of the 4 tables?

**Response Summary:**

- Suggested a unified request body: `{ source, xAxis, yAxis, aggregation, groupBy, filters }`
- Showed switch statement on `source` to route to correct Prisma model
- Recommended returning `{ data: [...], meta: { columns, rowCount } }`

**My Decision:**

- Implemented the unified query endpoint. Added a `validateQueryConfig()` helper that checks if the requested columns actually exist in the selected table before executing. This prevents runtime errors from invalid axis selections.

---

## Session 5: Frontend — Dashboard Canvas

**Prompt 5.1**

> Build a drag-and-drop dashboard canvas using @dnd-kit that supports adding cards from a palette, rearranging them, and removing them. Cards should be stored in React state. Show me the component structure.

**Response Summary:**

- Provided `DashboardCanvas.tsx` with `DndContext`, `SortableContext`
- Created `CardPalette.tsx` with draggable card type buttons
- Created `SortableCard.tsx` wrapper for each card on the canvas
- Showed `useSortable` hook integration

**Follow-up 5.2**

> How do I persist the dashboard layout to localStorage so it survives page refreshes?

**Response Summary:**

- Suggested `useEffect` to save cards state to localStorage on change
- Showed `JSON.parse(localStorage.getItem('dashboard') || '[]')` for loading
- Recommended debouncing the save to avoid excessive writes

**My Decision:**

- Implemented localStorage persistence with a debounce of 500ms. Added a "Reset Layout" button that clears localStorage and restores default empty state.

---

## Session 6: Frontend — Card Configuration Modal

**Prompt 6.1**

> Build a modal component for configuring a dashboard card. The user should: select a data source (dropdown), then see available columns for that source (fetched from /api/schema), map columns to axes (X, Y, group-by), choose aggregation type, and add optional filters. The modal should update in real-time as selections change.

**Response Summary:**

- Provided `CardConfigModal.tsx` with controlled form state
- Showed cascading dropdowns: source → columns filtered by source
- Demonstrated `useEffect` to refetch columns when source changes
- Showed aggregation dropdown that filters based on column type (numeric only for Y-axis)

**Follow-up 6.2**

> The column dropdowns should only show numeric columns for the Y-axis and any column for the X-axis. How do I filter based on column type from the schema API?

**Response Summary:**

- Suggested returning column type info from `/api/schema`: `{ name, type, isNumeric }`
- Showed filter logic: `columns.filter(c => isYAxis ? c.isNumeric : true)`

**My Decision:**

- Extended the schema API to return `isNumeric` flag by checking Prisma field types. Used this to dynamically filter axis options. This was a key improvement that made the UX much smoother.

---

## Session 7: Chart Components

**Prompt 7.1**

> Create 4 card components: KPICard (shows single number with label), BarChartCard (Recharts BarChart), LineChartCard (Recharts LineChart with optional group-by), and GaugeChartCard (custom SVG gauge). Each receives data from the API and a config object.

**Response Summary:**

- Provided all 4 components with Recharts integration
- KPICard: formatted number with label and trend indicator
- BarChartCard: responsive `BarChart` with `XAxis`, `YAxis`, `Tooltip`
- LineChartCard: `LineChart` with dynamic `Line` elements based on group-by
- GaugeChartCard: custom SVG arc with value, min, max, target markers

**Follow-up 7.2**

> The gauge chart value label is overlapping with the target marker when values are close. How do I adjust the positioning?

**Response Summary:**

- Suggested adjusting `textAnchor` based on value position relative to target
- Showed conditional `dx` offset calculation

**My Decision:**

- Implemented the conditional offset. Also added color thresholds: green when value ≤ target, yellow when 10-20% over, red when >20% over.

---

## Session 8: Global Filters

**Prompt 8.1**

> Add a global filter bar at the top of the dashboard with building selector, floor selector, and date range picker. When filters change, all cards on the canvas should re-fetch their data with the new filters applied.

**Response Summary:**

- Provided `FilterBar.tsx` with dropdowns for building and floor
- Showed date range picker using native HTML `<input type="date">`
- Demonstrated passing filters down via React context or props
- Showed `useEffect` on each card to refetch when filters change

**Follow-up 8.2**

> Should I use React context or pass filters as props to each card?

**Response Summary:**

- Recommended React context for global state like filters to avoid prop drilling
- Showed `FilterContext` with provider wrapping the dashboard

**My Decision:**

- Created `FilterContext` with `useReducer` for filter state. Each card component consumes the context and triggers a refetch when filters change. This kept the data flow clean and predictable.

---

## Session 9: UI Polish

**Prompt 9.1**

> How should I style the severity levels for alerts? Critical should be red, Warning orange, Info blue. Also add loading skeletons for cards while data is fetching.

**Response Summary:**

- Provided Tailwind color classes: `bg-red-100 text-red-800` for Critical, `bg-orange-100 text-orange-800` for Warning, `bg-blue-100 text-blue-800` for Info
- Showed skeleton component with `animate-pulse` for loading states

**My Decision:**

- Applied the color scheme. Created a reusable `SeverityBadge` component. Added skeleton loaders to all 4 card types.

---

## Summary

| Session | Topic            | AI Contribution | My Decisions                              |
| ------- | ---------------- | --------------- | ----------------------------------------- |
| 1       | Scaffolding      | 90%             | Added Docker compose                      |
| 2       | Prisma Schema    | 85%             | Improved error handling in seed           |
| 3       | Query Layer      | 70%             | Decided to mix raw SQL with Prisma Client |
| 4       | API Routes       | 80%             | Added input validation helper             |
| 5       | Dashboard Canvas | 85%             | Added debounce and reset button           |
| 6       | Config Modal     | 75%             | Extended schema API with isNumeric flag   |
| 7       | Chart Components | 90%             | Added color thresholds for gauge          |
| 8       | Global Filters   | 80%             | Chose React context over prop drilling    |
| 9       | UI Polish        | 85%             | Created reusable SeverityBadge component  |

**Overall AI Usage:** ~82% of boilerplate and structure was AI-assisted. Architecture decisions, edge case handling, and UX refinements were my own. The iterative follow-up prompts were the most valuable — they turned generic solutions into project-specific implementations.
