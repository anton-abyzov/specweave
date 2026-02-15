---
description: Close increment with PM 3-gate validation (tasks, tests, docs). Use when all tasks complete and saying "close increment", "we're done", or "finish up".
argument-hint: "<increment-id>"
hooks:
  Stop:
    - hooks:
        - type: command
          command: bash plugins/specweave/hooks/v2/guards/completion-guard.sh
---

# Close Increment (PM Validated)

## Project Overrides

!`s="done"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

**PM-Led Closure**: Validate tasks, tests, and docs before closing.

**EXPLICIT USER APPROVAL REQUIRED**: Only way to transition `ready_for_review` -> `completed`. Prevents auto-completion without AC checks and user confirmation.

## Usage

```
/sw:done <increment-id>
```

Argument: Required increment ID (e.g., "001", "0001", "0042", "0153-feature-name"). Numeric portion extracted and zero-padded to 4 digits.

---

## Workflow

### Step 1: Self-Awareness Check (OPTIONAL)

If closing a SpecWeave framework increment, show post-closure reminders: update CHANGELOG.md, CLAUDE.md, consider version bump, run `npm test && npm run rebuild`, check for breaking changes. Informational only, not blocking.

### Step 2: Inline Grill Review (MANDATORY)

1. Check config: `jq -r '.grill.required // true' .specweave/config.json` -- if `false`, skip
2. Invoke `Skill({ skill: "sw:grill" })` with incrementId
3. BLOCKERs or CRITICALs found -> STOP closure, show findings, ask user to fix
4. Passes -> continue

### Step 3: Judge LLM Validation (MANDATORY)

1. Invoke `Skill({ skill: "sw:judge-llm" })` with `--last-commit` (or `--staged`)
2. Uses ultrathink extended thinking via separate Opus API call
3. **APPROVED** -> continue | **CONCERNS** -> show, allow continuation | **REJECTED** -> STOP closure
4. No ANTHROPIC_API_KEY -> falls back to pattern matching, does not block

### Step 4: Status Validation

- `ready_for_review` -> Proceed
- `active` -> Check all tasks done, transition to `ready_for_review` first
- `completed` -> Already closed, warn user
- `backlog` / `paused` / `abandoned` -> BLOCK with error

Require explicit user confirmation before closure ("yes" to close, "no" to cancel).

### Step 5: Load Increment Context

1. Find increment directory: normalize ID to 4-digit, match `.specweave/increments/0001-*/`
2. Load: `spec.md`, `plan.md`, `tasks.md`, `tests.md`

### Step 6: Automated Completion Validation (Gate 0)

MANDATORY, cannot be bypassed. Runs BEFORE PM validation.

1. **Sync ACs first**: `ACStatusManager.syncACStatus(incrementId)` -- prevents race conditions with background hooks
2. **Desync check**: `DesyncDetector.validateOrThrow(incrementId)` -- blocks if metadata.json/spec.md inconsistent
3. **Completion validation**: `IncrementCompletionValidator.validateCompletion(incrementId)`

**Gate 0 validates**:
- All ACs checked in spec.md (`- [x] **AC-...`)
- All tasks completed in tasks.md (`**Status**: [x] completed`)
- Required files exist (spec.md, tasks.md)
- Tasks count in frontmatter matches checked tasks (source of truth)
- AC coverage: all ACs covered by tasks (100%), no orphan tasks, all US linkage valid

If validation fails -> increment stays in-progress, command exits.

### Step 7: PM Validation (3 Gates)

PM validation report goes in: `.specweave/increments/####-name/reports/PM-VALIDATION-REPORT.md`

**Gate 1 - Tasks Completed**: All P1 done, P2 done or deferred with reason, P3 done/deferred/backlogged, no blocked tasks, ACs met.

**Gate 2a - E2E Tests (AUTOMATED, BLOCKING)**: Detect playwright/cypress configs (including `repositories/*/*-e2e`). If found, run them. E2E failure blocks closure. No E2E detected -> skip.

**Gate 2 - Tests Passing**: All suites passing, coverage >80% critical paths, no unexplained skips, tests align with ACs.

**Gate 3 - Documentation Updated**: CLAUDE.md, README.md, CHANGELOG.md updated as needed. Inline docs complete. No stale references.

### Step 8: PM Decision

**All gates pass**:
1. Create marker file: `mkdir -p .specweave/state && touch .specweave/state/.sw-done-in-progress`
2. Update metadata.json status to `completed`, set completion date
3. Remove marker file
4. Generate completion report, update backlog

**Any gate fails**:
- Show failures and blockers with estimated fix effort
- If GitHub issue exists, reopen it with failure details
- Increment remains in-progress

### Step 9: Post-Closure Sync (AUTOMATIC)

Runs automatically after successful closure:

**A) Sync spec.md status** to `completed` (frontmatter + status line cache). Always runs.

**B) Sync living docs to GitHub Project**: If `hooks.post_increment_done.sync_to_github_project` enabled, find living docs spec and run `/sw-github:sync-spec`.

**C) Close GitHub issue**: If `hooks.post_increment_done.close_github_issue` enabled and metadata has `github.issue`, close via `gh issue close`.

**D) Close external-origin issue** (E-suffix increments only): Parse `metadata.external_ref` (format: `github#owner/repo#number`). Check `sync.settings.canUpdateStatus` permission. Close via `gh issue close -R`.

**E) Sync to external tools**: If `sync.statusSync.enabled`, use `syncACProgressToProviders()` to sync to all enabled providers (GitHub, JIRA, ADO).

### Step 10: Sync Living Docs (MANDATORY)

Execute: `Skill({ skill: "sw:sync-docs" })` with "review" mode. Do NOT just mention it -- actually invoke it.

### Step 11: Post-Closure Quality Assessment

Runs ONLY if closure succeeded. Invoke: `/sw:qa ${incrementId}`

Evaluates 7 dimensions: Clarity, Testability, Completeness, Feasibility, Maintainability, Edge Cases, Risk Assessment.

- Score >=80 -> PASS, proceed
- Score 60-79 -> CONCERNS, log and suggest improvements
- Score <60 -> FAIL, recommend follow-up increment

Report saved to: `.specweave/increments/####/reports/qa-post-closure.md`

Quality assessment runs AFTER closure (not blocking delivery). Critical issues trigger follow-up increment creation.

### Step 12: Handle Incomplete Work

If scope creep detected, offer options:
- A) Complete all tasks (estimate effort)
- B) Move extra tasks to next increment (close now)
- C) Split into 2 increments (recommended)

Transfer tasks creates new increment with dependencies on current one.
