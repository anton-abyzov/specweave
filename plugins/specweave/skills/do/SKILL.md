---
description: Execute increment tasks following spec and plan with sync hooks. Use when saying "implement", "start working", "execute tasks", or "continue increment".
argument-hint: "<increment-id>"
hooks:
  PostToolUse:
    - matcher: Edit
      hooks:
        - type: command
          command: bash plugins/specweave/hooks/v2/guards/task-ac-sync-guard.sh
    - matcher: Write
      hooks:
        - type: command
          command: bash plugins/specweave/hooks/v2/guards/task-ac-sync-guard.sh
---

# Do Increment

## Project Overrides

!`s="do"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

## Project Context

!`.specweave/scripts/skill-context.sh do 2>/dev/null; true`

Execute a SpecWeave increment by running tasks from tasks.md with automatic AC-sync after every task completion.

## Usage

```
/sw:do <increment-id>    # Execute specific increment
/sw:do                   # Auto-select best candidate
/sw:do <id> --model haiku|sonnet|opus  # Override model for all tasks
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

### Step 2: Load Context

1. **Find increment directory**: Normalize ID to 4-digit format, match `.specweave/increments/NNNN-*/`
2. **Load files**: Read `spec.md`, `plan.md`, `tasks.md`, `tests.md`
3. **Load living docs**: Check ADRs and specs in `.specweave/docs/internal/` for related context
4. **Verify readiness**: Status is planned/in-progress, no blocking deps, tasks exist
5. **Task count validation**: If >25 tasks, warn and offer to split or phase execution
6. **Validate AC presence** (MANDATORY):
   ```bash
   bash plugins/specweave/hooks/pre-increment-start.sh <increment-path>
   ```
   If fails: run `/sw:embed-acs`, then retry. Do NOT proceed without ACs in spec.md.

### Step 3: TDD Setup

Read `testMode` from metadata.json:
```bash
TEST_MODE=$(cat "$INCREMENT_PATH/metadata.json" | jq -r '.testMode // "test-after"')
```

If TDD mode active:
- Show TDD reminder banner (RED > GREEN > REFACTOR)
- Detect phase from task title markers: `[RED]`, `[GREEN]`, `[REFACTOR]`
- **Validate TDD markers exist** in tasks.md. If missing:
  - `strict` enforcement: BLOCK, require regeneration via `/sw:increment`
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

For each task:

1. **Read task details**: ID, model hint, description, ACs, file paths
2. **Select model**: Use task hint or `--model` override
3. **Execute**: Follow plan.md architecture, implement, write clean code
4. **Mark complete**: Change `[ ]` to `[x]` in tasks.md

**After EVERY task completion** (CRITICAL):

- **AC-sync hook fires automatically** (via PostToolUse on Edit/Write) updating spec.md ACs
- **Update docs inline**: CLAUDE.md (new commands/config/skills), README.md (user-facing changes), CHANGELOG.md (API/breaking changes), openapi.yaml (if API task + apiDocs.enabled)
- **GitHub sync** (if plugin enabled): close task issue, check off in epic, post completion comment
- Continue to next incomplete task

### Step 7: Handle Blockers

If task blocked: document in tasks.md, present options to user, skip or pause depending on severity.

### Step 8: Run Tests

After testable tasks: run relevant tests, fix failures immediately, only continue when green.

### Step 9: Completion

When all tasks done:
1. Run `/sw:sync-docs update` to sync living docs
2. Suggest: `npm test` then `/sw:validate <id> --quality` then `/sw:done <id>`

---

## Credentials Auto-Execute

Before deployment tasks, check credentials (NEVER display values):
```bash
grep -qE "SUPABASE|DATABASE_URL|CF_|AWS_|HETZNER" .env 2>/dev/null && echo "Credentials found"
```
If found: execute directly. If missing: ask user for credential.

---

Run `/sw:validate` after execution to ensure quality before closing with `/sw:done`.
