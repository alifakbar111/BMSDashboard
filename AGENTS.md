# AGENTS.md — BMS Dashboard

## State

Application code exists on `phase/2-infra` branch. Next.js 16 scaffolded with TypeScript, Tailwind v4, Prisma 7, Docker Compose for SQL Server, full audit completed, all 38 findings from the audit fixed. Next phase: backend API.

**Completed phases:** project-setup ✓ → data-explorer ✓ → infra ✓ → full audit + remediation ✓

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

Request: "Execute the audit fix plan" (18 tasks across 5 domains)

```
Round 1 (parallel, no dependencies)
  ├── Task 1: infra-agent — Fix Docker image tag + healthcheck
  ├── Task 2: security-auditor-agent — Remove hardcoded password, create .env.example
  └── Task 3: infra-agent — Add @@index to Prisma models

Round 2 (parallel, independent files)
  ├── Task 4: infra-agent — Create PrismaClient singleton
  ├── Task 5: infra-agent — Rewrite seed script with csv-parse
  ├── Task 6: code-review-agent — Fix package.json deps
  ├── Task 7: code-review-agent — Update radix-ui imports
  └── Task 8: ui-ux-agent — Fix globals.css

Round 3 (parallel, all files independent)
  ├── Task 9:  ui-ux-agent — Create EmptyState/LoadingState/ErrorState
  ├── Task 10: ui-ux-agent — Fix button a11y (focus rings, touch targets)
  ├── Task 11: code-review-agent — Remove duplicate DialogFooter close button
  ├── Task 12: code-review-agent — Update tsconfig target
  ├── Task 13: ui-ux-agent — Add skip-to-content link
  ├── Task 14: security-auditor-agent — Add security warning to chart
  └── Task 15: ui-ux-agent — Create ThemeToggle

Round 4 (parallel, final tasks)
  ├── Task 16: document-writer-agent — Create README.md
  ├── Task 17: testing-agent — Write seed parser tests
  └── Task 18: testing-agent — Write PrismaClient singleton tests
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
- Git repo initialized on branch `phase/2-infra`. Never commit to `main`/`master` directly.
- Audit reports live in `docs/audits/YYYY-MM-DD/` — these ARE committed (human-facing docs)
- All components use `cn()`, `data-slot`, named function exports, and `@/*` alias — preserve these patterns
