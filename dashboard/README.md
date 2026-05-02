# Maestro-Flow Dashboard

Real-time project orchestration dashboard for Maestro-Flow. Linear-style Kanban board, multi-agent execution control, and autonomous Commander supervision. Runs at `http://127.0.0.1:3001`.

## Views

The Kanban page (`/kanban`) provides four views:

| View | Shortcut | Description |
|------|----------|-------------|
| **Board** | `K` | Kanban columns (Backlog → In Progress → Review → Done) with Phase cards, Issue cards, and Linear integration |
| **Timeline** | `T` | Gantt-style phase timeline with progress indicators |
| **Center** | `C` | Command center — active executions, Issue queue, quality summary |
| **Table** | `L` | Sortable tabular view with all phase/issue metadata |

## Issue Lifecycle on Kanban

Issues have a **dual status system**:

- **IssueStatus** (`open` / `in_progress` / `resolved` / `closed`) — determines which **column** the card appears in
- **DisplayStatus** (`open` / `analyzing` / `planned` / `in_progress` / `resolved` / `closed`) — determines the **label color** on the card

An Issue with `status=open` always stays in the Backlog column, but its label changes from "open" → "analyzing" → "planned" as analysis and solution data are attached.

| Status | Kanban Column |
|--------|---------------|
| `open` | Backlog |
| `in_progress` | In Progress |
| `resolved` | Review |
| `closed` | Done |

### Issue Card Actions

- **Click** — Open detail modal (analysis, solution steps, execution results)
- **Executor dropdown** — Select agent: Claude Code / Codex / Gemini
- **Play button** — Dispatch execution via WebSocket
- **Multi-select** — Batch execution with floating toolbar
- **Create** — `C` shortcut or `+` button on column header

## Commander Agent

The autonomous supervisor runs a tick loop (`assess → decide → dispatch`) and automatically:

- Analyzes un-analyzed Issues (`open` + no `analysis`)
- Plans analyzed Issues (`analysis` exists, no `solution`)
- Executes planned Issues via ExecutionScheduler
- Profiles: `conservative` / `balanced` / `aggressive`

## Wiki Endpoint (`/api/wiki`)

Turbovault-inspired knowledge-graph view of `.workflow/` treating markdown files and JSONL rows as a single document network. Complementary to `/api/specs` (see "Relationship with /api/specs" below).

### Sources

| Kind | Path | Id format |
|------|------|-----------|
| File | `project.md`, `roadmap.md` | `project-project`, `roadmap-roadmap` |
| File | `specs/<slug>.md` | `spec-<slug>` |
| File | `phases/NN-<slug>/<slug>.md` | `phase-<slug>` |
| File | `memory/MEM-<slug>.md` | `memory-<slug>` |
| File | `memory/TIP-<slug>.md` | `note-<slug>` |
| Virtual | `issues/*.jsonl` rows | `issue-<row-id>` (read-only) |
| Virtual | `learning/*.jsonl` rows | `lesson-<row-id>` (read-only) |

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/wiki` | List/filter entries (`type`, `tag`, `phase`, `status`, `q` for BM25, `group=true` for type-grouped) |
| GET | `/api/wiki/stats` | Totals per type + tag counts |
| GET | `/api/wiki/health` | Health score (0-100) + orphans + broken links + top hubs |
| GET | `/api/wiki/graph` | Full `{ forwardLinks, backlinks, brokenLinks }` |
| GET | `/api/wiki/orphans` | Entries with no incoming or outgoing resolved links |
| GET | `/api/wiki/hubs?limit=N` | Top-N entries ranked by in-degree |
| GET | `/api/wiki/:id` | Single entry |
| GET | `/api/wiki/:id/backlinks` | Incoming edges |
| GET | `/api/wiki/:id/forward` | Outgoing resolved edges |
| POST | `/api/wiki` | Create `.md` entry — body: `{ type, slug, title, body, category?, createdBy?, sourceRef?, parent?, frontmatter? }` |
| PUT | `/api/wiki/:id` | Update `.md` entry — body: `{ title?, body?, frontmatter?, expectedHash? }` |
| DELETE | `/api/wiki/:id` | Remove `.md` entry |

Writes are restricted to real markdown files under `specs/` and `memory/`. Virtual JSONL rows, `project.md`, and `roadmap.md` are read-only. `expectedHash` provides sha256 optimistic concurrency (409 on mismatch). Per-path mutex serializes concurrent updates so race conditions return deterministic conflicts.

### Capabilities

- **BM25-lite search** — Unicode tokenizer with stop-word filtering (k1=1.5, b=0.75). Used when `q=` is present; composed with structural filters.
- **Graph analysis** — forwardLinks from body `[[wikilinks]]` + frontmatter `related:`. Backlinks mirrored from indexer. Orphans/hubs/broken links computed on demand, memoized until invalidation.
- **Health score** — `100 − 2×broken − 1×orphans − 3×missing_titles`, floored at 0.
- **Markdown rendering** — Client-side `react-markdown` + `remark-gfm` with a custom `wiki:` URL scheme that intercepts `[[target]]` and renders as clickable `WikiLink` chips. Preprocessing respects fenced code blocks.
- **Cache model** — `WikiIndexer` holds `{ index, graphCache, searchCache }` with single-flight `rebuild()`. `invalidate()` clears all three. `fs-watcher` emits `wiki:invalidated` for any matching file change and re-triggers indexer rebuild on next read.

### Relationship with `/api/specs`

Both endpoints read the same `.workflow/specs/*.md` files but at different granularities and never conflict.

| Aspect | `/api/specs` | `/api/wiki` |
|--------|-------------|-------------|
| Granularity | Intra-file **sub-entries** — one `### [type] [YYYY-MM-DD] Title` section = one entry | File-level **node** — one `.md` file = one wiki entry |
| Scope | `specs/*.md` only | `project.md` + `roadmap.md` + `specs/` + `phases/` + `memory/` + JSONL rows |
| Id format | `<file-stem>-<nnn>` (e.g. `learnings-003`) | `<type>-<slug>` (e.g. `spec-auth`) |
| Write model | POST appends a heading block to an existing file | POST creates a new file; PUT rewrites body with hash guard; DELETE unlinks |
| Concurrency | Global `withWriteLock` for all specs writes | Per-path async mutex keyed by absolute path |
| Shared infra | Reuses `parseFrontmatter` from `server/wiki/frontmatter-util.ts` (re-exported by `specs.ts` for legacy imports) | Primary owner of `frontmatter-util.ts` |
| Invalidation | `fs-watcher` picks up the file mtime change → emits `wiki:invalidated` → wiki indexer rebuilds on next read | Same watcher; wiki PUT/DELETE call `indexer.invalidate()` directly |

Both endpoints can safely operate on the same file because specs writes go through `withWriteLock` and wiki writes go through a per-path mutex. Interleaved specs-POST + wiki-PUT against the same file is still a theoretical cross-endpoint race, but in practice users pick one endpoint per file — specs is for append-only learning logs, wiki is for structured knowledge documents.

## Phase Pipeline Commands

| Status | Display Label | Recommended Command |
|--------|--------------|---------------------|
| `pending` | Pending | `/maestro-analyze {N}` |
| `exploring` | Explore | `/maestro-plan {N}` |
| `planning` | Plan | `/maestro-execute {N}` |
| `executing` | Execute | *(running)* |
| `verifying` | Verify | `/quality-review {N}` |
| `testing` | Test | `/quality-test {N}` |
| `completed` | Done | `/maestro-milestone-audit` |
| `blocked` | Blocked | `/quality-debug` |

## Pre-Pipeline Setup

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `/maestro-init` | Initialize `.workflow/` directory |
| 2 | `/maestro-brainstorm` *(optional)* | Multi-role brainstorming |
| 3a | `/maestro-roadmap` | Lightweight interactive roadmap |
| 3b | `/maestro-spec-generate` | Full spec pipeline (PRD → architecture → roadmap) |
| 4 | `/maestro-plan 1` | Create Phase 1 execution plan |

## Development

```bash
cd dashboard
npm install
npm run dev        # Vite dev server + Hono API on port 3001
```

### Build

```bash
npm run build      # TypeScript + Vite build
npm start          # Production server
```

### Test

```bash
npm test           # Vitest
npm run test:watch # Watch mode
```

## Architecture

```
dashboard/src/
├── client/                  # React 19 + Zustand + Tailwind CSS 4
│   ├── components/
│   │   └── kanban/          # 19 components (Board, Column, PhaseCard, IssueCard, ...)
│   ├── pages/               # KanbanPage, WorkflowPage, SpecsPage, ArtifactsPage, McpPage
│   ├── store/               # 5 Zustand stores (board, issue, execution, linear, ui-prefs)
│   └── hooks/               # Custom React hooks
├── server/                  # Hono API + WebSocket + SSE
│   ├── agents/              # AgentManager + adapters (Claude SDK, Codex CLI, OpenCode)
│   ├── commander/           # CommanderAgent (tick loop, prompts, config, profiles)
│   ├── execution/           # ExecutionScheduler + WaveExecutor + WorkspaceManager
│   ├── routes/              # 14 route modules (issues, board, phases, agents, mcp, ...)
│   ├── state/               # StateManager, EventBus, FSWatcher
│   ├── ws/                  # WebSocket manager
│   └── sse/                 # Server-Sent Events hub
└── shared/                  # Types shared between client and server
    ├── types.ts             # PhaseCard, BoardState, PhaseStatus
    ├── issue-types.ts       # Issue, IssueAnalysis, IssueSolution
    ├── agent-types.ts       # AgentType, AgentProcess, AgentConfig
    ├── commander-types.ts   # CommanderConfig, PriorityAction, Assessment
    └── constants.ts         # Status colors, display status derivation, API endpoints
```

### Key Data Flow

```
.workflow/ files ──→ StateManager ──→ SSE ──→ Zustand stores ──→ React UI
                                                      ↑
WebSocket ←── IssueCard actions ←── User interaction ─┘
    │
    ↓
AgentManager.spawn() / ExecutionScheduler.dispatch()
    │
    ↓
Agent process (Claude SDK / Codex CLI / Gemini CLI)
    │
    ↓
PATCH /api/issues/:id ──→ JSONL file ──→ StateManager ──→ SSE ──→ UI update
```
