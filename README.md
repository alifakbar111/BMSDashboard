# BMS Dashboard

Building Management System Dashboard — an interactive dashboard builder for facilities management teams to visualize energy consumption, HVAC performance, occupancy data, and alert events from building management systems.

## Architecture

```
src/
  app/                    # Next.js App Router pages and API routes
    api/                  # RESTful API endpoints (Next.js Route Handlers)
    floor-plan/           # SVG floor plan visualization
    globals.css           # Global styles, CSS custom properties, Tailwind theme
    layout.tsx            # Root layout with providers
    page.tsx              # Main dashboard page
  components/
    cards/                # Card type components (KPI, Bar, Line, Gauge)
    dashboard/            # Dashboard builder components (Canvas, FilterBar, CardConfigModal)
    layout/               # Layout primitives (ThemeProvider, QueryProvider, ThemeToggle)
    ui/                   # Shared UI primitives (shadcn/ui based)
  generated/
    prisma/               # Generated Prisma client (gitignored)
  hooks/                  # Custom React hooks
  lib/                    # Shared business logic
    aggregation.ts        # Data aggregation helpers
    prisma.ts             # PrismaClient singleton
    query-builder.ts      # Dynamic query construction with column allowlisting
    schemas.ts            # Shared TypeScript types (Zod schemas + inferred types)
    utils.ts              # Utility functions (cn)
  store/                  # Zustand state management
    dashboard-store.ts    # Dashboard card layout state
prisma/
  schema.prisma           # Database schema (4 models)
  seed.ts                 # Database seed script
  migrations/             # Version-controlled migrations
tests/                    # Unit and integration tests
docs/
  audits/                 # Security, code quality, UI/UX audit reports
tests/                    # Unit and integration tests
data/                     # CSV source files (copied from TechnicalTest/data/)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Database | SQL Server 2022 (Docker) |
| ORM | Prisma 7 with `@prisma/adapter-mssql` |
| Styling | Tailwind CSS v4, shadcn/ui |
| Charts | Recharts 3 |
| Drag & Drop | dnd-kit |
| State | Zustand, TanStack React Query |
| Icons | Lucide React |
| Testing | Vitest, Testing Library |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 11+
- Docker Desktop (for SQL Server)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file
cp .env.example .env
# Edit .env and set a strong SA_PASSWORD

# 3. Start SQL Server
docker compose up -d

# 4. Generate Prisma client
pnpm prisma:generate

# 5. Run database migration
pnpm prisma:migrate

# 6. Seed database
pnpm prisma:seed

# 7. Start dev server
pnpm dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm test` | Run unit tests |
| `pnpm lint` | Lint with oxlint |
| `pnpm format` | Format code with oxfmt |
| `pnpm prisma:generate` | Generate Prisma client |
| `pnpm prisma:push` | Push schema to DB |
| `pnpm prisma:migrate` | Create and apply a migration |
| `pnpm gen:openapi` | Generate OpenAPI spec |
| `pnpm prisma:seed` | Seed database |
| `pnpm prisma:studio` | Open Prisma Studio |

## Design Decisions

- **No authentication** — Internal facilities tool; auth is by network isolation
- **Zero-radius components** — Utilitarian aesthetic appropriate for facilities management
- **Min-width 1280px** — Optimized for desktop monitoring stations
- **Dark mode** — Via `next-themes` with system preference detection
- **Alert severity colors** — Critical (red), Warning (orange), Info (blue) per spec
- **Prisma 7 config pattern** — URL not in schema; provided via `prisma.config.ts` and `DATABASE_URL` env var
