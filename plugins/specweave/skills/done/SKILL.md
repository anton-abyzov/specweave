---
description: Close increment with PM 3-gate validation (tasks, tests, docs). Use when all tasks complete and saying "close increment", "we're done", or "finish up".
argument-hint: "<increment-id> [--auto]"
---

# Close Increment (PM Validated)

## Project Overrides

!`s="done"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

**PM-Led Closure**: Validate tasks, tests, and docs before closing.

**EXPLICIT USER APPROVAL REQUIRED**: Only way to transition `ready_for_review` -> `completed`. Prevents auto-completion without AC checks and user confirmation.

## Usage

```
/sw:done <increment-id> [--auto]
```

Argument: Required increment ID (e.g., "001", "0001", "0042", "0153-feature-name"). Numeric portion extracted and zero-padded to 4 digits.

## Options

| Option | Description |
|--------|-------------|
| `--auto` | Skip user confirmation prompt in Step 4 (for `/sw:auto` and `/sw:team-lead` modes). All quality gates (grill, judge-llm, Gate 0, PM gates) still enforced. |

---

## Workflow

### Step 1: Self-Awareness Check (OPTIONAL)

If closing a SpecWeave framework increment, show post-closure reminders: update CHANGELOG.md, CLAUDE.md, consider version bump, run `npm test && npm run rebuild`, check for breaking changes. Informational only, not blocking.

### Step 2: Inline Grill Review (MANDATORY — STOP GATE)

**The CLI blocks closure if `grill-report.json` is missing.** Do NOT skip this step.

1. Check config: `jq -r '.grill.required // true' .specweave/config.json` — if `false`, skip to Step 3
2. Invoke `Skill({ skill: "sw:grill" })` with incrementId
3. **Verify report written**: `Bash({ command: "test -f .specweave/increments/<id>/reports/grill-report.json && echo OK || echo MISSING" })`
4. If report MISSING: write it manually from grill output using the Write tool
5. BLOCKERs or CRITICALs (shipReadiness: NOT READY) → STOP closure, ask user to fix
6. Passes → continue

### Step 3: Judge LLM Validation (MANDATORY — STOP GATE)

**A report file MUST be written regardless of outcome (even WAIVED if consent denied).**

1. **Consent check**: Check `externalModels` in config. If denied, write WAIVED report and continue
2. Invoke `Skill({ skill: "sw:judge-llm" })` with `--last-commit` (or `--staged`)
3. **Verify report written**: `Bash({ command: "test -f .specweave/increments/<id>/reports/judge-llm-report.json && echo OK || echo MISSING" })`
4. If report MISSING: write a WAIVED report with reason "Skill did not produce report"
5. **APPROVED** → continue | **CONCERNS** → show, allow continuation | **REJECTED** → STOP closure
6. No ANTHROPIC_API_KEY or consent denied → write WAIVED report, continue

### Step 4: Status Validation

- `ready_for_review` -> Proceed
- `active` -> Check all tasks done, transition to `ready_for_review` first
- `completed` -> Already closed, warn user
- `backlog` / `paused` / `abandoned` -> BLOCK with error

**User confirmation**: If `--auto` flag is present, skip the explicit user confirmation and proceed directly to closure. Otherwise, require explicit user confirmation before closure ("yes" to close, "no" to cancel). Note: `--auto` does NOT bypass any quality gates (grill, judge-llm, Gate 0, PM gates) — it only skips the interactive confirmation prompt.

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
2. Run completion via CLI: `Bash({ command: "specweave complete <id> --yes" })` — the CLI re-verifies quality gate reports (grill-report.json, judge-llm-report.json) exist. It also triggers `LifecycleHookDispatcher.onIncrementDone()` for living docs sync, GitHub Project sync, and issue closure.
3. Remove marker file: `rm -f .specweave/state/.sw-done-in-progress`
4. Generate completion report, update backlog

**CRITICAL**: Do NOT directly edit metadata.json to set status. Always use the `specweave complete` CLI command — it is the single completion path that triggers all post-closure hooks.

**Any gate fails**:
- Show failures and blockers with estimated fix effort
- If GitHub issue exists, reopen it with failure details
- Increment remains in-progress

### Step 9: Post-Closure Sync (AUTOMATIC via CLI hooks)

The `specweave complete` call in Step 8 triggers `LifecycleHookDispatcher.onIncrementDone()` which automatically handles:

- **Living docs sync** (`sync_living_docs` flag): Updates feature specs and user story files
- **GitHub Project sync** (`sync_to_github_project` flag): Pushes spec to GitHub Project
- **Issue closure** (`close_github_issue` flag): Closes GitHub/JIRA/ADO issues via SyncCoordinator

After the CLI completes, display the sync result summary:

```
| Hook                     | Result                    |
|--------------------------|---------------------------|
| Living docs sync         | OK / FAILED: {reason}     |
| GitHub Project sync      | OK / SKIPPED              |
| Issue closure            | OK / SKIPPED              |
```

If any operation failed, display: "Run `/sw:progress-sync` to retry failed sync operations."

**Supplemental closure** (not handled by hooks — run manually if applicable):

**A) Close external-origin issue** (E-suffix increments only): Parse `metadata.external_ref` (format: `github#owner/repo#number`). Check `sync.settings.canUpdateStatus` permission. Close via `gh issue close -R`.

**B) Close ALL per-user-story GitHub issues**: If the hook-based closure missed any, search by title pattern:
1. Read `sync.github.owner` and `sync.github.repo` from config.json
2. Extract the feature ID from spec.md frontmatter or increment ID
3. For EACH user story in spec.md, search: `gh issue list -R {owner}/{repo} --search "[{feature_id}][{us_id}]" --state open --json number`
4. Close each: `gh issue close {number} -R {owner}/{repo} -c "Completed as part of increment {increment_id}"`

### Step 10: Sync Living Docs (MANDATORY)

Execute: `Skill({ skill: "sw:sync-docs" })` with the increment ID. Do NOT just mention it -- actually invoke it. This serves as a verification pass to confirm living docs are up to date after closure.

### Step 10b: Update Links in Docs (MANDATORY)

After living docs sync, update cross-references and bidirectional links so existing docs reference the newly created feature specs.

Execute: `Skill({ skill: "sw:docs-updater" })` — this verifies and repairs links between living docs, feature specs, and increment references. Do NOT skip this step. The docs-updater:
1. Reads the feature spec files created by Step 10
2. Updates existing docs (FEATURE-CATALOG, module docs, etc.) with links to the new specs
3. Verifies bidirectional links between increment → feature spec → living docs
4. Changes `[DRAFT]` → `[COMPLETE]` on doc sections matching completed ACs

If `sw:docs-updater` is unavailable, manually verify that `.specweave/docs/internal/specs/{project}/FS-XXX/` contains `FEATURE.md` and `us-*.md` files. If missing, re-run Step 10.

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
