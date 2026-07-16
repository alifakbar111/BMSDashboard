# AGENTS.md — BMS Dashboard

## State

No application code exists yet. This repo is a spec + agent ecosystem.

## Before building read

`Technical Test/TechnicalTest.md` — the full spec. All requirements and evaluation criteria live here.

## Build order

data-explorer (profile CSVs) → infra (Prisma schema + seed) → backend (API) → frontend (UI) → polish (UX/testing/docs)

Each phase depends on the previous. Do not parallelize.

## Data

CSV source files are in `Technical Test/data/`, not `data/`. The `data/` directory does not exist yet — create it at the project root and copy files there before seeding. See `Technical Test/data/DATA_DICTIONARY.md` for field definitions.

## Commands

No project-level `package.json` or scripts exist yet. Run `project-setup-agent` to scaffold Next.js with TypeScript + Tailwind + App Router and install all deps (Prisma, Recharts, dnd-kit, date-fns, zustand, lucide-react, vitest).

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

Use conventional commits: `type(scope): message`. Types: feat, fix, refactor, style, docs, test, chore, infra. No body, no trailers, no "Co-Authored-By". Single line only.

## opencode.json

Config at root `opencode.json`. References `.opencode/rules/*.md` and `.opencode/skills/*.md` as instructions. 10 agents configured with `mode: all`. If adding agents, register them here.

## Gotchas

- `Technical Test/` directory name has a space — quote paths when referencing
- `.opencode/.gitignore` ignores `node_modules`, `package.json`, `package-lock.json`, `bun.lock`, `.gitignore` itself
- Two agent copies exist (`.opencode/agents/` and `.agents/`) — keep `.opencode/agents/` as source of truth
- No git repo initialized yet — `git init` before first commit
