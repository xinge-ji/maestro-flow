---
name: maestro-discuss
description: Bounded discussion gate that clarifies fuzzy intent and hands off to the right maestro command
argument-hint: "\"intent text\" [-y] [--session ID] [--count N]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---
<purpose>
Bounded discussion gate for `maestro`. Use this when the user intent is fuzzy enough that a short clarification will improve routing, but you still want to preserve the current route matrix and automation.

This command does not replace `maestro` or `maestro-brainstorm`. It sits in front of them:
- clear intent -> hand off directly
- small fuzzy feature -> hand off to `maestro-brainstorm`
- large / multi-feature demand -> hand off to `maestro-roadmap`
- direct operational task -> hand off to the appropriate command chain
</purpose>

<required_reading>
@~/.maestro/workflows/discuss.md
@~/.maestro/workflows/maestro.md
</required_reading>

<context>
$ARGUMENTS — user intent text.

**Flags**:
- `-y` / `--yes` — auto mode, skip interactive questions and use heuristics
- `--session ID` — resume an existing discussion session
- `--count N` — maximum number of candidate routes to consider, default 4

**Output boundary**:
- ALL file writes MUST target `.workflow/.maestro/discuss-{timestamp}/` or `.workflow/state.json`
- NEVER modify source code or files outside those paths
</context>

<execution>
Follow `~/.maestro/workflows/discuss.md` completely.

**On completion, hand off to one of these downstream skills**:
- direct operational task -> `maestro-quick`, `maestro-plan`, `maestro-execute`, `maestro-analyze`, `quality-debug`, or `manage-issue`
- small fuzzy feature -> `maestro-brainstorm`
- large demand with known split -> `maestro-roadmap`
- large fuzzy demand -> `maestro-brainstorm`

If `-y` is active, skip interactive questions and use the discussion workflow's heuristics to choose the route.
</execution>

<error_codes>
| Code | Severity | Condition | Recovery |
|------|----------|-----------|----------|
| E001 | error | Topic or intent required | Prompt user for a short intent description |
| E002 | error | No route could be determined after 2 rounds | Show the parsed intent and ask for a clearer goal |
| W001 | warning | Project context missing | Continue without project context |
| W002 | warning | Related work found | Show the related directory/session before asking questions |
</error_codes>

<success_criteria>
- [ ] Intent paraphrased and classified
- [ ] Project state and related work scanned
- [ ] At most 2 clarification rounds were used
- [ ] Final route decision written to `decision.json`
- [ ] `context.md` contains a concise handoff summary
- [ ] Downstream skill chosen explicitly
- [ ] Auto mode (`-y`) skips questions and still produces a route
</success_criteria>

