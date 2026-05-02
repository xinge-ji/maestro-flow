# Workflow: Discuss

Bounded discussion gate for `maestro`. This workflow sits between intent extraction and command-chain execution. It does not replace routing or execution. It only decides whether the user needs a short clarifying discussion, then hands off to the right downstream command.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    /maestro-discuss                          │
│                Bounded discussion gate                       │
└──────────────────────────────┬───────────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        Clear enough      Small feature    Large / fuzzy
        direct handoff     brainstorm      roadmap or brainstorm
```

## Goals

- Clarify intent without turning the entry point into a long chat.
- Preserve the current `maestro` route matrix and automation.
- Ask one question at a time, with 2-4 concrete choices.
- Stop after at most 2 rounds unless the user explicitly asks to grill harder.
- Produce a structured route decision that downstream commands can consume.

## Input

- `$ARGUMENTS`: raw user intent text, or a short phrase like `discuss`, `brainstorm`, `grill`, `question`.
- `--yes` / `-y`: auto mode, skip interactive questions and use heuristics.
- `--session ID`: reuse an existing discussion session.
- `--count N`: optional cap for how many candidate routes to consider, default 4.

## Output

All output goes to:

```
.workflow/.maestro/discuss-{timestamp}/
```

Session artifacts:

- `discussion.md` - the discussion timeline and summary
- `decision.json` - structured route decision
- `context.md` - compact handoff summary for downstream commands

## Process

### Step 1: Parse & Initialize

Parse flags and intent text. Detect `autoYes`, `session`, and `count`.

If `--session` points to an existing discussion session, resume it.

### Step 2: Read Project State

Read project context before asking anything:

- `.workflow/state.json`
- `.workflow/roadmap.md`
- `.workflow/scratch/*/plan.json`
- `.workflow/.maestro/*/status.json` when a recent session exists

Also scan for related work:

- existing feature / issue / roadmap / brainstorm directories
- recent discussion sessions
- matching command names in current state

### Step 3: Classify Intent

Compute a compact triage record:

- `action`
- `object`
- `scope`
- `issue_id`
- `phase_ref`
- `clarity_score`
- `scope_risk`
- `route_hint`

Use the same semantics as `maestro`:

- `clear` - one command chain is obvious
- `small_feature` - one feature, unclear solution
- `roadmap` - multi-feature, boundaries mostly known
- `deep_brainstorm` - multi-feature, boundaries fuzzy
- `direct_execution` - user wants a concrete operational step

### Step 4: Discussion Rounds

If `autoYes` is off and `clarity_score < 2`, ask up to 2 rounds of questions.

Rules:

- ask one question at a time
- provide 2-4 options
- prefer paraphrase + choice over free-form prompts
- stop when a question adds no new information
- if the user says "差不多了" / "先这样", stop immediately

Question families:

- problem definition
- scope sizing
- direct route vs brainstorm vs roadmap
- explicit non-goals

### Step 5: Route Decision

Return one of these handoffs:

| Case | Route |
|---|---|
| Clear operational intent | direct downstream skill (`maestro-plan`, `maestro-execute`, `manage-issue`, `quality-debug`, etc.) |
| Small feature, solution fuzzy | `maestro-brainstorm` |
| Large demand, split mostly known | `maestro-roadmap` |
| Large demand, split fuzzy | `maestro-brainstorm` |
| Explicit brainstorm / discuss request | `maestro-brainstorm` or `maestro-roadmap` based on scale |

The discussion gate itself does not execute the full product pipeline. It only selects the next command and passes a compact summary.

### Step 6: Persist Handoff

Write the route decision into `decision.json` and summarize it in `context.md`.

The summary should include:

- why the selected route won
- what is still open
- what downstream command should see first
- whether the user explicitly asked to continue discussion

## Question Style

- Rephrase the user's ask in one line first.
- Then ask the minimum question needed to decide route.
- Prefer "which of these is closer?" over "tell me more".
- If the user already gave a route clue, use it.

## Exit Conditions

- Enough clarity to route directly
- User explicitly wants to proceed
- Question budget exhausted
- The input is already a direct execution command

