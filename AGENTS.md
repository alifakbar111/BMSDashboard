# AGENTS.md — BMS Dashboard

## State

Application code on `phase/4-frontend` branch. Next.js 16, TypeScript, Tailwind v4, Prisma 7, Docker Compose for SQL Server. Phase 4 (frontend UI) complete and pending merge to `main`. Next phase: Phase 5 polish (UX/testing/docs).

**Completed phases:** project-setup ✓ → data-explorer ✓ → infra ✓ → full audit (6 reports) + 33-task remediation ✓ → backend API (partial) ✓ → frontend (Phase 4) ✓

**Phase 4 + audit remediation summary (2026-07-17):**
- 81 tests passing across 12 test files
- Zero lint errors
- Prisma initial migration created
- All 44+ findings fixed across security, code quality, UI/UX, infra, testing, spec compliance
- Drag-and-drop dashboard builder with KPI, Bar, Line, and Gauge cards
- Dynamic card configuration with data source and axis selection
- Global filters (building, floor, time range)
- SVG floor plan with occupancy overlays and tooltips
- Dashboard layout persistence (localStorage), export/import, card resizing, duplication, animated transitions
- Dark mode toggle and responsive layout shell

## Before building read

`TechnicalTest/TechnicalTest.md` — the full spec. All requirements and evaluation criteria live here.

## Build order

data-explorer (profile CSVs) → infra (Prisma schema + seed) → backend (API) → frontend (UI) → polish (UX/testing/docs)

Each phase depends on the previous. Do not parallelize.

## Data

CSV source files are in `TechnicalTest/data/`. A `data/` directory exists at project root with copies of the CSVs. See `TechnicalTest/data/DATA_DICTIONARY.md` for field definitions.

## Commands

The project is fully scaffolded. All deps installed (PNPM only). Available scripts:

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm lint` | Lint with oxlint |
| `pnpm prisma:generate` | Generate Prisma client |
| `pnpm prisma:push` | Push schema to DB |
| `pnpm prisma:migrate` | Create a migration |
| `pnpm prisma:seed` | Seed database (`tsx prisma/seed.ts`) |
| `pnpm prisma:studio` | Open Prisma Studio |

## Agents

14 agents in `.opencode/agents/` (source of truth) mirrored to `.agents/`. Always edit `.opencode/agents/`, then sync to `.agents/`.

| Agent            | When to use                                                             |
| ---------------- | ----------------------------------------------------------------------- |
| orchestrator     | Kicking off full build, routing multi-domain work                       |
| project-setup    | Scaffolding project, installing deps, creating structure                |
| data-explorer    | Profiling CSV files before schema design                                |
| infra            | Prisma schema, SQL Server config, seed script                           |
| backend          | API routes, Prisma queries, aggregation, filtering                      |
| frontend         | DnD canvas, card types (KPI/Bar/Line/Gauge), floor plan SVG             |
| ui-ux            | Tailwind polish, alert severity colors, loading/empty states, dark mode |
| security-auditor | OWASP audit, SQL injection, XSS, Prisma safety                          |
| bug-hunter       | Systematic debugging, root-cause analysis                               |
| code-review      | Code quality, naming, structure, dead code                              |
| testing          | Unit/integration tests for aggregation, query builder, API              |
| planner          | Writing implementation plans with TDD steps                             |
| document-writer  | README, Architecture Brief, PROMPT_HISTORY.md                           |
| session-exporter | Packaging opencode setup for backup/migration                           |

## Skills

21 installed skills across 3 locations:

- `.opencode/skills/` — 15 skills
- `.agents/skills/` — 4 project-local skills (installed via `npx skills add`)

Each agent's system prompt lists which skills it synthesizes. Check the "Synthesized Skills" section before working.

## Commit format

CRITICAL: Single line ONLY. No body. No trailers. No "Co-Authored-By".

```
✅ fix(infra): fix Docker image tag and rewrite seed with csv-parse
✅ feat(infra): add db indexes and PrismaClient singleton
✅ fix(deps): migrate radix-ui to scoped @radix-ui packages, fix button a11y
❌ fix(audit): resolve all 38 findings... (long body with paragraphs)
```

Subject must contain enough info on its own — the body is never shown. Keep it under 70 chars if possible. Types: feat, fix, refactor, style, docs, test, chore, infra.

## opencode.json

Config at root `opencode.json`. References `.opencode/rules/*.md` and `.opencode/skills/*.md` as instructions. 10 agents configured with `mode: all`. If adding agents, register them here.

## Agent workflow

When a user request comes in, the orchestrator routes it through this process:

### Request types & routing

| Request type | First action | Example |
|---|---|---|
| **New feature / large work** | Delegate to `planner-agent` → get plan → show user → execute plan | "Add backend API for querying data" |
| **Bug / broken** | Delegate to `bug-hunter-agent` → root cause → route fixes | "The chart isn't rendering" |
| **Small single-domain fix** | Delegate directly to specialist | "Fix button focus ring" |
| **Multi-domain request** | Decompose into per-domain sub-tasks → delegate in dependency order | "Fix endpoint + update page + add tests" |
| **Plan / design** | Delegate to `planner-agent` directly | "How should we build the query builder" |
| **Test / review / audit** | Delegate to `testing-agent` / `code-review-agent` / `security-auditor-agent` | "Audit the codebase for vulnerabilities" |
| **Docs** | Delegate to `document-writer-agent` | "Create README.md" |

### Execution flow for large work (plan-based)

```
User request
    │
    ▼
┌──────────────────────────────┐
│  1. planner-agent            │  Writes implementation plan with TDD steps
│     (delegate with spec)     │
└──────────┬───────────────────┘
           │ plan.md
           ▼
┌──────────────────────────────┐
│  2. Show plan to user        │  User reviews & approves (or revises)
└──────────┬───────────────────┘
           │ approved
           ▼
┌──────────────────────────────┐
│  3. Execute plan per-task    │  Each task: brief → dispatch → review → ledger
│     (subagent-driven)        │
└──────────┬───────────────────┘
           │
           ├── Task 1: brief → dispatch infra-agent → review → ledger
           ├── Task 2: brief → dispatch backend-agent → review → ledger
           └── Task 3: brief → dispatch frontend-agent → review → ledger
           │
           ▼
┌──────────────────────────────┐
│  4. Final verification        │  Build check, test suite, integration check
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  5. Commit per task           │  Single-line conventional commits
└──────────────────────────────┘
```

### Real example from this session (audit remediation)

Request: "Execute the audit fix plan" (33 tasks across 6 rounds)

```
Round 1 (parallel, no dependencies)
  ├── Task 1: infra-agent — Fix .gitignore
  ├── Task 2: infra-agent — Copy DATA_DICTIONARY.md
  ├── Task 3: code-review-agent — Remove unused deps
  └── Task 4: infra-agent — Add Occupancy index

Round 2 (parallel, independent files)
  ├── Task 5:  security-auditor-agent — Fix error leakage
  ├── Task 6:  security-auditor-agent — Add security headers
  ├── Task 7:  security-auditor-agent — Add CSRF + body limits
  ├── Task 8:  backend-agent — Zod field allowlist
  ├── Task 9:  backend-agent — Zod for occupancy params
  └── Task 10: backend-agent — mapFieldName throw on unknown

Round 3 (merged conflicting-files tasks)
  ├── Task 11+14: backend-agent — groupBy fix + type-safe models
  ├── Task 12+13+16: code-review-agent — dual types + test imports
  ├── Task 15: infra-agent — db-config utility
  └── Task 17: code-review-agent — unused import

Round 4 (parallel, all files independent)
  ├── Task 18+24: ui-ux-agent — Skip-link focus + ARIA landmarks
  ├── Task 19: ui-ux-agent — Docs dark mode
  ├── Task 20: ui-ux-agent — Focus rings
  ├── Task 21: ui-ux-agent — ThemeToggle hydration
  ├── Task 22: ui-ux-agent — LoadingState deterministic
  ├── Task 23: ui-ux-agent — Disabled button
  └── Task 25: ui-ux-agent — SeverityBadge

Round 5 (parallel, all files independent)
  ├── Task 26: testing-agent — Zod schema tests
  ├── Task 27: testing-agent — API integration tests
  ├── Task 28: testing-agent — Seed mapper tests
  ├── Task 29: testing-agent — query-builder tests
  ├── Task 30: testing-agent — CI pipeline
  └── Task 31: testing-agent — cn() utility tests

Round 6 (parallel)
  ├── Task 32: infra-agent — Initial migration
  └── Task 33: document-writer-agent — AGENTS.md fix
```

### Batch dispatch rule

Dispatch independent tasks in parallel to save time. Batch by file independence — two tasks that touch different files can run simultaneously. Tasks that modify the same file must run sequentially.

### Agent delegation prompt template

```
task name with description=
prompt="[Context + exact instructions + expected output format]"
subagent_type="correct-agent"
```

The prompt must include:
1. **What files to read/modify** — absolute paths
2. **What changes to make** — exact code or clear specification
3. **What verification to run** — build, test, or type-check command
4. **What to return** — status (DONE/BLOCKED/NEEDS_CONTEXT), commits, test results, concerns

## Commit — single line only
```bash
git add <files> && git commit -m "type(scope): concise description"
```
No body text in the commit. If the subject needs more info, put it in the scope.

### Why this pattern
- **Context stays lean**: task text + report are files, not pasted walls of text
- **Survives compaction**: progress.md + briefs + reports persist on disk when AI context is cleared
- **No re-dispatch waste**: without the ledger, a resumed session may redo completed tasks
- **Durable audit trail**: every task has a brief (requirements), report (results), and ledger entry (commits)

## Gotchas

- `TechnicalTest/` directory name has no space — no need to quote paths
- `.opencode/.gitignore` ignores `node_modules`, `package.json`, `package-lock.json`, `bun.lock`, `.gitignore` itself
- Two agent copies exist (`.opencode/agents/` and `.agents/`) — keep `.opencode/agents/` as source of truth
- Git repo works on feature branches (`phase/*`). Current work is on `phase/4-frontend` and pending merge to `main`.
- Audit reports live in `docs/audits/YYYY-MM-DD/` — these ARE committed (human-facing docs)
- All components use `cn()`, `data-slot`, named function exports, and `@/*` alias — preserve these patterns
