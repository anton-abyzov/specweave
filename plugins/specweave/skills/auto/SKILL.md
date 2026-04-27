---
description: Start autonomous execution with stop hook feedback loop. Works until all tasks complete or max iterations reached. Use when you want continuous unattended execution.
version: 1.0.0
argument-hint: "[INCREMENT_IDS...] [OPTIONS]"
---

# Auto Command

## Project Overrides

**Skill Memories**: If `.specweave/skill-memories/auto.md` exists, read and apply its learnings.

## Project Context

**Project Context**: If `.specweave/config.json` exists, read it for testing mode, TDD enforcement, and multi-project settings. Check for active increments in `.specweave/increments/*/metadata.json`.

**Start autonomous execution session using Claude Code's Stop Hook.**

## Usage

```bash
sw:auto [INCREMENT_IDS...] [OPTIONS]
```

- `INCREMENT_IDS`: One or more increment IDs (e.g., `0001`, `0001-feature`). If omitted, finds active increments or intelligently creates new ones.

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--max-turns N` | Max hook invocations before hard stop | 20 |
| `--simple-compat` | **Deprecated**. Equivalent to the legacy `--simple` flag. Emits a deprecation warning and will be removed in v1.3.0. | false |
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

## Context-Adaptive Execution (default)

`sw:auto` no longer exposes `--simple` as a primary execution path. Every session uses context-adaptive execution:

- On large specs (>40KB), `sw:auto` **automatically reduces context re-reads internally** — no manual `--simple` flag needed. Specs are read once at session start; subsequent iterations rely on `tasks.md` plus diffs.
- On smaller specs, spec re-reads stay enabled for maximum coherence.
- Sub-skill loading is decided per-task based on domain signals, not by a global flag.

## Legacy `--simple-compat` (deprecated)

The legacy `--simple` minimal-context mode is retained for one minor release as `--simple-compat`.

- Emits a deprecation warning on invocation.
- Will be removed in v1.3.0.
- Equivalent behaviour (for compatibility with external runbooks):
  1. Skip spec re-reads — read `spec.md` once at session start, rely on `tasks.md` alone afterward.
  2. Minimal task context — read only the current task's section from `tasks.md`.
  3. No sub-skill loading — execute tasks directly using code tools.
  4. Shorter status output — skip banners and progress tables between tasks.
  5. No complexity re-check — skip Step 1.5a (team-lead routing check).

New callers should rely on the context-adaptive default above instead.

## Tool-Use Rationale

- **Read**: Load `.specweave/config.json`, `metadata.json`, `spec.md`, and `tasks.md` to drive the auto loop.
- **Write/Edit**: Update `auto-mode.json` session marker and flip task/AC status as work completes.
- **Glob**: Locate active/planned increments and test files during gate evaluation.
- **Bash**: Run the configured quality gates (tests, build, lint, types, custom commands).

## Native Auto Mode

Claude Code ships with a built-in auto mode, toggled with **Shift+Tab**. That native mode runs the agent autonomously without any SpecWeave-specific orchestration.

**When to use `sw:auto` vs native auto**:

- Use **`sw:auto`** when you need increment-aware gates: spec validation, AC tracking, rubric evaluation, task-level test enforcement, or external sync to GitHub/Jira/ADO.
- Use **Claude Code native auto (Shift+Tab)** for general-purpose autonomous execution without increment tracking — e.g. quick refactors, research loops, exploration.

**One-time advisory**: When invoked in Claude Code, `sw:auto` prints a one-time advisory pointing to Shift+Tab for users who may not need increment gates. The advisory is suppressed after the first acknowledgement.

**Opt-out for power users**: Pass `--force-sw-auto` to suppress the advisory permanently.

## Core Loop

```
IMPLEMENT task -> TEST -> FAIL? -> FIX -> PASS -> mark complete -> NEXT task -> ... -> ALL DONE -> sw:done --auto -> CLOSED
```

Stop hook blocks when tasks/ACs remain. When all work is complete, stop hook blocks with `all_complete_needs_closure` to trigger `sw:done --auto`. Model enforces quality gates (build/tests/lint) before closure.

## Execution

### Step 1: Set Up Auto Session

Use Read/Write/Edit/Glob tools directly (no CLI needed):

**1a. Read config** — `.specweave/config.json`: `auto.enabled`, `auto.maxTurns` (default 20), `testing.defaultTestMode`, `testing.tddEnforcement`

**1b. Find increments:**
- If IDs specified: Glob `.specweave/increments/{ID}*/metadata.json`, verify exists
- If no IDs: find active/in-progress increments. If none, check backlog/planned. If none at all, go to Step 2 (Intelligent Creation).

**1c. Activate increments** — Edit `metadata.json`: set `"status": "active"`, update timestamp

**1c.5. PR-Based Branch Setup (conditional):**
```bash
PUSH_STRATEGY=$(jq -r '.cicd.pushStrategy // "direct"' .specweave/config.json 2>/dev/null)
```
If `pr-based`: create/checkout feature branch before starting work (same logic as `sw:do` Step 2.5). Branch name: `{branchPrefix}{increment-id}`. If `direct`: skip.

**1d. Write session marker** — `.specweave/state/auto-mode.json`:

```json
{
  "active": true,
  "timestamp": "<ISO>",
  "incrementIds": ["0001-feature"],
  "simple": false,
  "tddMode": false,
  "requireTests": false,
  "userGoal": null,
  "successCriteria": [
    { "type": "tasks_complete", "description": "All tasks marked complete", "required": true },
    { "type": "acs_satisfied", "description": "All ACs satisfied", "required": true }
  ],
  "successSummary": "All tasks and acceptance criteria complete"
}
```

Map flags to session marker fields:
- `--simple-compat` -> set `"simple": true` (deprecated — emits warning, removed in v1.3.0)
- `--tests` -> `{ "type": "tests_pass", "required": true }`
- `--build` -> `{ "type": "build_succeeds", "required": true }`
- `--e2e` -> `{ "type": "tests_pass", "description": "E2E tests", "required": true }`
- `--lint` -> `{ "type": "custom_command", "command": "<lint-cmd>", "required": true }`
- `--types` -> `{ "type": "custom_command", "command": "npx tsc --noEmit", "required": true }`
- `--cov N` -> `{ "type": "tests_pass", "threshold": N, "required": true }`
- `--cmd "X"` -> `{ "type": "custom_command", "command": "X", "required": true }`
- `--tdd` -> set `"tddMode": true`

Always include `tasks_complete` and `acs_satisfied` as base criteria. Ensure `.specweave/state/` dir exists.

**`userGoal` field**: Set to the user's stated intent from conversation context. If the user said "fix the auth bug", set `userGoal` to `"fix the auth bug"`. If no clear intent is expressed, set to `null`. This field is read by the stop hook to provide context-aware feedback and guide `sw:do` to the correct increment.

### Step 1.5a: MANDATORY - Complexity Check for Team-Lead Routing

**Before starting autonomous execution, check if this increment needs team-lead:**

1. Count pending tasks in tasks.md (count `[ ]` markers)
2. Detect domains from file paths in tasks.md and plan.md:
   - Frontend: `.tsx`, `src/components/`, `src/pages/`, React/Vue keywords
   - Backend: `src/api/`, `src/services/`, `src/routes/`, Express/NestJS keywords
   - Database: `prisma/`, `migrations/`, SQL keywords
   - DevOps: `Dockerfile`, `.github/`, `k8s/` keywords
   - Testing: `tests/`, `e2e/`, `.test.` keywords
   - Security: `src/auth/`, auth keywords
   - Mobile: `ios/`, `android/`, React Native keywords

3. **If 3+ domains detected OR domain count suggests multi-agent benefit:**

   ```
   ⚠️  COMPLEXITY ASSESSMENT
   ══════════════════════════════════════════
   Tasks: [N] pending | Domains: [N] ([list])
   ──────────────────────────────────────────
   This increment spans 3+ domains. sw:team-lead is recommended
   for parallel execution with higher quality results.
   ⚡ Trade-off: ~2-3x more tokens, but parallel agents
      produce better results for multi-domain work.
   ══════════════════════════════════════════
   ```

   Then use AskUserQuestion:
   - Option A: "Use sw:team-lead (Recommended)" — invoke team-lead and stop auto
   - Option B: "Continue with sw:auto (sequential)" — proceed normally

   **In auto mode** (no user present): Auto-invoke `sw:team-lead` for 3+ domains.
   This is the default behavior per CLAUDE.md execution strategy.

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
COMPLETES WHEN: All tasks done + tests pass + sw:done passes
STOPS IF: 3 consecutive test failures | sw:cancel-auto | max turns
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
- **Create new**: invoke `sw:increment "description"` then set up session
- **Multiple**: activate all matching, include in session marker
- **Ambiguous**: ask user to choose

Then return to Step 1c-1d to set up the session, then Step 1.5 for the banner.

### Step 3: Execute Tasks

1. Run `sw:do` in a loop (stop hook handles continuation)
2. Mark tasks complete in tasks.md, update spec.md ACs
3. Run tests after each task
4. Before `sw:done`: verify all quality gates from `successCriteria`
5. **Closure**: When all tasks are complete (stop hook blocks with `all_complete_needs_closure`):
   - **5a. Claude Code (Agent tool available)**: Spawn `sw-closer` subagent per increment:
     ```typescript
     Agent({
       subagent_type: "sw:sw-closer",
       prompt: "Close increment <ID>. Increment path: .specweave/increments/<ID>/",
       description: "Close increment <ID>"
     })
     ```
     The sw-closer runs grill, judge-llm, PM gates, and `specweave complete` in a fresh context.
   - **5b. Non-cloud fallback**: Run `sw:done --auto <id>` for each increment directly.
6. **On success**: If sw-closer (or `sw:done`) succeeds, clean up session state (`rm -f` auto-mode.json, turn counter, dedup files) and output `<!-- auto-complete:DONE -->`
7. **On failure**: If sw-closer (or `sw:done`) fails (gate failure), report the failure and do NOT clean up session state. The stop hook will block again on the next turn for a retry.

## Credential Auto-Execution

In auto mode, execute deployment commands directly using available credentials. Check `.env`, env vars, CLI auth (`wrangler whoami`, `gh auth status`). If credentials missing, ask user — never output manual steps.

## Session Management

- **Status**: `sw:auto-status`
- **Cancel**: `sw:cancel-auto`
- **Resume after crash**: `sw:do` or `claude --continue`
- **Multi-agent**: use `sw:team-lead` instead

## Safety

| Mechanism | Default |
|-----------|---------|
| Turn limit | 20 |
| Staleness cleanup | 2h |
| Human gates | `deploy`, `migrate`, `publish` patterns |

## Related Commands

| Command | Purpose |
|---------|---------|
| `sw:auto-status` | Check session status |
| `sw:cancel-auto` | Cancel session |
| `sw:do` | Execute tasks (standalone) |
| `sw:progress` | Show progress |
| `sw:team-lead` | Multi-agent orchestration |

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#auto)
