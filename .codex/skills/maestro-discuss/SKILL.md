---
name: maestro-discuss
description: Bounded discussion gate for maestro that clarifies fuzzy intent and hands off to the right downstream command
argument-hint: "[intent text] [--yes] [--session ID] [--count N]"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

<purpose>
Bounded discussion gate for `maestro`. It performs a short clarification loop, then hands off to the right downstream command without disturbing the existing routing and execution pipeline.
</purpose>

<required_reading>
@~/.maestro/workflows/discuss.md
@~/.maestro/workflows/maestro.codex.md
</required_reading>

<context>
$ARGUMENTS — user intent text.

**Flags**:
- `--yes` / `-y` — auto mode, skip interactive questions and use heuristics
- `--session ID` — resume an existing discussion session
- `--count N` — cap the number of candidate routes considered

**Output boundary**:
- ALL file writes MUST target `.workflow/.maestro/discuss-{timestamp}/` or `.workflow/state.json`
</context>

<execution>
Follow `~/.maestro/workflows/discuss.md` completely.

On completion:
- clear operational intent -> direct downstream skill
- small fuzzy feature -> `maestro-brainstorm`
- large / split-ready demand -> `maestro-roadmap`
- large fuzzy demand -> `maestro-brainstorm`

If `-y` is active, skip questions and route using heuristics.
</execution>

<success_criteria>
- [ ] Intent paraphrased and classified
- [ ] Project state and related work scanned
- [ ] At most 2 clarification rounds were used
- [ ] Route decision written to session artifacts
- [ ] Downstream skill selected explicitly
- [ ] Auto mode skips questions but still routes
</success_criteria>

