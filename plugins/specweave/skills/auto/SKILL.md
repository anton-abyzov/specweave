---
disable-model-invocation: true
description: Start autonomous execution with stop hook feedback loop. Works until all tasks complete or max iterations reached. Use when you want continuous unattended execution.
argument-hint: "[INCREMENT_IDS...] [OPTIONS]"
---

# Auto Command

## Project Overrides

!`s="auto"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

## Project Context

!`.specweave/scripts/skill-context.sh auto 2>/dev/null; true`

**Start autonomous execution session using Claude Code's Stop Hook.**

## Usage

```bash
/sw:auto [INCREMENT_IDS...] [OPTIONS]
```

- `INCREMENT_IDS`: One or more increment IDs (e.g., `0001`, `0001-feature`). If omitted, finds active increments or intelligently creates new ones.

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--max-turns N` | Max hook invocations before hard stop | 20 |
| `--simple` | Minimal context mode | false |
| `--dry-run` | Preview without starting | false |
| `--all-backlog` | Process all backlog items | false |
| `--skip-gates G1,G2` | Pre-approve specific gates | None |
| `--no-increment` | Require existing increments (no auto-creation) | false |
| `--yes`, `-y` | Auto-approve increment plan | false |
| `--tdd`, `--strict` | TDD strict mode (RED->GREEN->REFACTOR enforced) | false |
| `--build` | Build must pass before completion | false |
| `--tests` | Tests must pass before completion | false |
| `--e2e` | E2E tests must pass before completion | false |
| `--lint` | Linting must pass before completion | false |
| `--types` | Type-checking must pass before completion | false |
| `--cov <n>` | Code coverage threshold (%) | 80 |
| `--cmd "<command>"` | Custom command must pass | None |

## Core Loop

```
IMPLEMENT task -> TEST -> FAIL? -> FIX -> PASS -> mark complete -> NEXT task
```

Stop hook gates exit when tasks/ACs remain. Model enforces quality gates (build/tests/lint) before `/sw:done`.

## Execution

### Step 1: Set Up Auto Session

Use Read/Write/Edit/Glob tools directly (no CLI needed):

**1a. Read config** — `.specweave/config.json`: `auto.enabled`, `auto.maxTurns` (default 20), `testing.defaultTestMode`, `testing.tddEnforcement`

**1b. Find increments:**
- If IDs specified: Glob `.specweave/increments/{ID}*/metadata.json`, verify exists
- If no IDs: find active/in-progress increments. If none, check backlog/planned. If none at all, go to Step 2 (Intelligent Creation).

**1c. Activate increments** — Edit `metadata.json`: set `"status": "active"`, update timestamp

**1d. Write session marker** — `.specweave/state/auto-mode.json`:

```json
{
  "active": true,
  "timestamp": "<ISO>",
  "incrementIds": ["0001-feature"],
  "tddMode": false,
  "requireTests": false,
  "userGoal": "optional",
  "successCriteria": [
    { "type": "tasks_complete", "description": "All tasks marked complete", "required": true },
    { "type": "acs_satisfied", "description": "All ACs satisfied", "required": true }
  ],
  "successSummary": "All tasks and acceptance criteria complete"
}
```

Map flags to extra `successCriteria` entries:
- `--tests` -> `{ "type": "tests_pass", "required": true }`
- `--build` -> `{ "type": "build_succeeds", "required": true }`
- `--e2e` -> `{ "type": "tests_pass", "description": "E2E tests", "required": true }`
- `--lint` -> `{ "type": "custom_command", "command": "<lint-cmd>", "required": true }`
- `--types` -> `{ "type": "custom_command", "command": "npx tsc --noEmit", "required": true }`
- `--cov N` -> `{ "type": "tests_pass", "threshold": N, "required": true }`
- `--cmd "X"` -> `{ "type": "custom_command", "command": "X", "required": true }`
- `--tdd` -> set `"tddMode": true`

Always include `tasks_complete` and `acs_satisfied` as base criteria. Ensure `.specweave/state/` dir exists.

### Step 1.5: MANDATORY - Display Stop Conditions

**You MUST output a stop conditions banner BEFORE starting work.** Detect test frameworks, count test files, then show:

```
AUTO MODE STARTING
======================================================================
Increment: [ID] | Tasks: [N] pending
======================================================================
TESTS THAT MUST PASS:
  Unit: [command] - [N] test files ([list key ones])
  E2E: [command] - [N] test files (if applicable)
  [NEW] files to be created during auto mode
======================================================================
COMPLETES WHEN: All tasks done + tests pass + /sw:done passes
STOPS IF: 3 consecutive test failures | /sw:cancel-auto | max turns
======================================================================
```

Fill ALL placeholders with real values. Be specific about test files and commands.

### Step 1.6: TDD Enforcement (if TDD mode enabled)

Check TDD priority: `--tdd` flag > increment `metadata.json` > `config.json`

If TDD enabled, validate tasks.md has `[RED]`/`[GREEN]`/`[REFACTOR]` markers. If no markers found:
- `strict`: BLOCK — cannot proceed, fix tasks first
- `warn`: show warning, continue without enforcement
- `off`: skip silently

Enforcement rules: `[RED]` tasks complete freely. `[GREEN]` requires its `[RED]` done first. `[REFACTOR]` requires its `[GREEN]` done first.

### Step 2: Intelligent Increment Creation (when none found)

Analyze context and decide:
- **Match existing**: find planned/backlog increment matching user intent, activate it
- **Extend existing**: add tasks to active incomplete increment
- **Create new**: invoke `/sw:increment "description"` then set up session
- **Multiple**: activate all matching, include in session marker
- **Ambiguous**: ask user to choose

Then return to Step 1c-1d to set up the session, then Step 1.5 for the banner.

### Step 3: Execute Tasks

1. Run `/sw:do` in a loop (stop hook handles continuation)
2. Mark tasks complete in tasks.md, update spec.md ACs
3. Run tests after each task
4. Before `/sw:done`: verify all quality gates from `successCriteria`
5. On completion output `<!-- auto-complete:DONE -->`

## Credential Auto-Execution

In auto mode, execute deployment commands directly using available credentials. Check `.env`, env vars, CLI auth (`wrangler whoami`, `gh auth status`). If credentials missing, ask user — never output manual steps.

## Session Management

- **Status**: `/sw:auto-status`
- **Cancel**: `/sw:cancel-auto`
- **Resume after crash**: `/sw:do` or `claude --continue`
- **Multi-agent**: use `/sw:team-lead` instead

## Safety

| Mechanism | Default |
|-----------|---------|
| Turn limit | 20 |
| Staleness cleanup | 2h |
| Human gates | `deploy`, `migrate`, `publish` patterns |

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw:auto-status` | Check session status |
| `/sw:cancel-auto` | Cancel session |
| `/sw:do` | Execute tasks (standalone) |
| `/sw:progress` | Show progress |
| `/sw:team-lead` | Multi-agent orchestration |
