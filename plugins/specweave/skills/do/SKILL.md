---
description: Execute increment tasks following spec and plan with sync hooks. Use when saying "implement", "start working", "execute tasks", or "continue increment". IMPORTANT - Before starting, check task count and domain count. If 3+ domains or 15+ tasks, recommend sw:team-lead instead (ask user for confirmation, or auto-invoke in auto mode).
argument-hint: "<increment-id>"
---

# Do Increment

## Project Overrides

!`s="do"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

## Project Context

!`.specweave/scripts/skill-context.sh do 2>/dev/null; true`

Execute a SpecWeave increment by running tasks from tasks.md with automatic AC-sync after every task completion.

## Usage

```
sw:do <increment-id>    # Execute specific increment
sw:do                   # Auto-select best candidate
sw:do <id> --model haiku|sonnet|opus  # Override model for all tasks
```

- `<increment-id>`: Optional. Supports "001", "0001", "1", "0042", or "0153-feature-name" formats.
- `--model <tier>`: Optional. Overrides per-task model hints.

---

## Workflow

### Step 1: Smart Increment Auto-Selection

When no ID provided, auto-select (NEVER ask user for ID):

1. Scan by priority: `in-progress` > `planned` > `ready_for_review` (with incomplete tasks) > `backlog` (with incomplete tasks)
2. For each candidate, count incomplete tasks: `grep -c '^\- \[ \]'` + `grep -c '\*\*Status\*\*: \[ \]'` in tasks.md
3. Select best candidate and auto-promote to in-progress if needed
4. If no candidates, show status summary and offer: create new, close ready_for_review, resume backlog, or view status

### Step 1.5: Auto-Mode Context Override

When running inside an active auto session (`.specweave/state/auto-mode.json` has `active: true`):

1. **Explicit ID takes priority**: If an explicit increment ID was passed (e.g., `sw:do 0252`), use it directly — skip this step
2. **Stop hook guidance**: If the stop hook feedback in the current conversation mentions a specific increment ID (e.g., "Continue: sw:do 0252"), use that ID
3. **Read incrementIds**: If no ID from above, read `incrementIds` array from `auto-mode.json` and use the **first entry** — this is the increment prioritized by scoring at session start
4. **Skip filesystem scanning**: When auto-mode context provides an increment ID via steps 2 or 3, skip Step 1's filesystem scanning entirely — auto-mode context takes priority

This ensures the execution loop stays focused on the contextually correct increment rather than re-scanning the filesystem each iteration.

### Step 2: Load Context

1. **Find increment directory**: Normalize ID to 4-digit format, match `.specweave/increments/NNNN-*/`
2. **Load files**: Read `spec.md`, `plan.md`, `tasks.md`, `tests.md`
3. **Load living docs**: Check ADRs and specs in `.specweave/docs/internal/` for related context
4. **Verify readiness**: Status is planned/in-progress, no blocking deps, tasks exist
5. **Task count validation**: If >25 tasks, warn and offer to split, phase, or use `sw:auto`/`sw:team-lead`
6. **Validate AC presence** (MANDATORY):
   Check that spec.md contains AC-IDs (e.g., `AC-US1-01`). If missing: add ACs to spec.md before proceeding. Do NOT proceed without ACs in spec.md.

### Step 2.5: PR-Based Branch Setup (conditional)

Check push strategy:
```bash
PUSH_STRATEGY=$(jq -r '.cicd.pushStrategy // "direct"' .specweave/config.json 2>/dev/null)
```

**If `pr-based`:**
1. Read git config:
   ```bash
   BRANCH_PREFIX=$(jq -r '.cicd.git.branchPrefix // "sw/"' .specweave/config.json 2>/dev/null)
   ```
2. Compute branch name: `BRANCH_NAME="${BRANCH_PREFIX}${INCREMENT_ID}"`
3. Check current branch: `CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)`
4. If not on the feature branch:
   - Branch exists? `git branch --list ${BRANCH_NAME}` → `git checkout ${BRANCH_NAME}`
   - Branch doesn't exist? `git checkout -b ${BRANCH_NAME}`
5. For umbrella/multi-repo: repeat in each `repositories/*/*/` that has a `.git` directory
6. Log: `"Working on feature branch: ${BRANCH_NAME}"`

**If `direct`:** Skip this step entirely (no-op, current behavior preserved).

### Step 2.7: Execution Strategy Check

**Skip this step if already running inside `sw:auto` or `sw:team-lead`.** Check `.specweave/state/auto-mode.json` — if `active: true`, skip.

Assess increment complexity to recommend the best execution mode:

1. **Count pending tasks**: `grep -c '^\- \[ \]\|Status\*\*: \[ \]' tasks.md`
2. **Count domains**: Scan spec.md and plan.md for distinct technology areas (frontend, backend, database, API, DevOps, security, mobile, ML/AI). Each distinct area = 1 domain.
3. **Count ACs**: `grep -c 'AC-US' spec.md`

**Recommendation matrix** (see CLAUDE.md Execution Strategy):

| Tasks | Domains | Action |
|-------|---------|--------|
| ≤8 | 1 | Proceed with `sw:do` silently |
| 9-15 | 1-2 | Suggest `sw:auto` for unattended execution |
| >15 | 1-2 | Recommend `sw:auto` (many tasks benefit from autonomous loop) |
| any | 3+ | Recommend `sw:team-lead` for parallel multi-agent execution |

**When recommending (non-auto mode)**, use `AskUserQuestion` with these options:
- `sw:do` — Continue manual step-by-step (current mode)
- `sw:auto` — Autonomous sequential execution (unattended, stop-hook loop)
- `sw:team-lead` — Parallel multi-agent execution (higher quality for multi-domain, uses more tokens)

Include trade-off note: "Team-lead and auto modes consume more tokens but deliver higher precision and quality for complex work."

If user chooses auto or team-lead, invoke the chosen skill with the increment ID and **stop sw:do execution**.

**In auto mode (`.specweave/state/auto-mode.json` active)**: If 3+ domains detected, automatically invoke `sw:team-lead` instead of proceeding sequentially.

### Step 3: TDD Setup

Read `testMode` from metadata.json:
```bash
TEST_MODE=$(cat "$INCREMENT_PATH/metadata.json" | jq -r '.testMode // "test-after"')
```

If TDD mode active:
- Show TDD reminder banner (RED > GREEN > REFACTOR)
- Detect phase from task title markers: `[RED]`, `[GREEN]`, `[REFACTOR]`
- **Validate TDD markers exist** in tasks.md. If missing:
  - `strict` enforcement: BLOCK, require regeneration via `sw:increment`
  - `warn` (default): warn and proceed
  - `off`: silent pass
- **Enforce order**: GREEN requires RED complete; REFACTOR requires GREEN complete
  - Read enforcement: `jq -r '.testing.tddEnforcement // "warn"' .specweave/config.json`
  - `strict`: block violations; `warn`: warn but allow; `off`: no check

### Step 4: Smart Resume

1. Parse tasks.md, find first incomplete task (`[ ]`)
2. Extract model hints per task (haiku/sonnet/opus)
3. Show resume context with completion percentage

### Step 5: Update Status

If status is "planned", update to "in-progress" with start date in spec.md frontmatter.

### Step 6: Execute Tasks Sequentially

#### Iron Law: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE

Before marking ANY task `[x]`, you MUST run verification and see it pass:

1. **Run the task's test command** — if the task has a `**Test**:` or `**Test Plan**:` block, execute the test command specified there. Capture the output.
2. **Fallback to project-level tests** — if no task-specific test exists, run the project test command (e.g., `npx vitest run`, `pytest`, `go test ./...`).
3. **Failing test = task stays `[ ]`** — if the test command fails, the task is NOT complete. Present the failure output, diagnose, fix, and re-run until green.
4. **Evidence is mandatory** — "should work" is not evidence. "Tests pass" without running them is not evidence. Only fresh command output counts.

---

For each task:

1. **Read task details**: ID, model hint, description, ACs, file paths
2. **Select model**: Use task hint or `--model` override
3. **Execute**: Follow plan.md architecture, implement, write clean code
4. **Verify**: Run the task's test command (see Iron Law above). Only proceed if green.
5. **Mark complete**: Change `[ ]` to `[x]` in tasks.md — ONLY after verification passes

**After EVERY task completion** (CRITICAL):

- **AC-sync hook fires automatically** (via PostToolUse on Edit/Write) updating spec.md ACs
- **Update docs inline**: CLAUDE.md (new commands/config/skills), README.md (user-facing changes), CHANGELOG.md (API/breaking changes), openapi.yaml (if API task + apiDocs.enabled)
- **GitHub sync** (if plugin enabled): close task issue, check off in epic, post completion comment
- Continue to next incomplete task

### Step 6.5: Per-Task Review Gate (Opt-In)

**Check config flag**:
```bash
PER_TASK_REVIEW=$(jq -r '.quality.perTaskReview // false' .specweave/config.json 2>/dev/null)
```

**Skip this gate entirely if**:
- `quality.perTaskReview` is absent or `false` (default — backward compatible)
- Running inside `sw:team-lead` (team-lead has its own review flow). Detect via: `ls ~/.claude/teams/ 2>/dev/null | head -1` — if any entries exist, skip.

**When the gate is active** (`perTaskReview: true`), after each task passes verification (Step 6) but before moving to the next task:

#### Sub-review 1: Spec Compliance

Dispatch a lightweight review checking whether this task's implementation satisfies its linked ACs:

- Read the task's `**Satisfies ACs**:` field to get the relevant AC IDs
- For each AC, verify the implementation matches the spec requirement
- Adversarial framing: "Prove each AC is satisfied with evidence from the code diff"
- If any AC is not satisfied: fix before proceeding

#### Sub-review 2: Code Quality

Dispatch a focused code quality review of ONLY this task's diff:

- Review only files changed by this task (not the entire codebase)
- Check: correctness, error handling, naming, no obvious security issues
- Severity threshold: only CRITICAL and HIGH findings block progress
- MINOR and SUGGESTION findings are noted but don't block

#### Gate Rule

Both sub-reviews must pass before marking the task `[x]` and moving to the next task. If either review finds blocking issues (CRITICAL/HIGH), fix them first. This prevents drift from accumulating across tasks.

### Step 7: Handle Blockers

If task blocked: document in tasks.md, present options to user, skip or pause depending on severity.

### Step 8: Run Tests

After testable tasks: run relevant tests, fix failures immediately, only continue when green.

### Step 9: Completion (MANDATORY AUTO-CHAIN — NEVER STOP HERE)

**CRITICAL**: When all tasks are done, IMMEDIATELY chain to closure. Do NOT stop to ask for review, do NOT report "all tasks complete" and wait. The quality gates inside `sw:done` (grill, judge-llm, PM validation) ARE the review. If the user wants to re-open, they can.

When all tasks done:
1. Run `sw:sync-docs update` to sync living docs
2. Run tests: `npx vitest run` (if test framework detected)

#### Step 9a: Closure via Subagent (Claude Code — preferred)

If the `Agent` tool is available, spawn a closure subagent for a fresh context:

```typescript
Agent({
  subagent_type: "sw:sw-closer",
  prompt: "Close increment <ID>. Increment path: .specweave/increments/<ID>/",
  description: "Close increment <ID>"
})
```

The sw-closer runs grill, judge-llm, PM gates, and `specweave complete` in an isolated context.
Do NOT invoke `sw:grill` or `sw:done` inline when using the subagent path.

#### Step 9b: Direct Closure (Non-cloud tools / fallback)

If the `Agent` tool is NOT available (Cursor, Copilot, Aider, OpenCode), invoke closure directly:

1. Invoke `Skill({ skill: "sw:grill" })` with increment ID — writes required `grill-report.json`
2. Invoke `Skill({ skill: "sw:done" })` with increment ID — runs judge-llm, PM gates, closes, and syncs to GitHub/Jira/ADO

Non-cloud tools typically have fresh context per skill invocation, so inline closure works without overflow.

**Anti-pattern** (NEVER do this): "All tasks are complete. Would you like me to close the increment?" — Just close it.

---

## Credentials Auto-Execute

Before deployment tasks, check credentials (NEVER display values):
```bash
grep -qE "SUPABASE|DATABASE_URL|CF_|AWS_|HETZNER" .env 2>/dev/null && echo "Credentials found"
```
If found: execute directly. If missing: ask user for credential.

---

Run `sw:validate` after execution to ensure quality before closing with `sw:done`.

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#do)
