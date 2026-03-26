---
description: Close increment with PM 3-gate validation (tasks, tests, docs). Use when all tasks complete and saying "close increment", "we're done", or "finish up".
argument-hint: "<increment-id> [--auto]"
---

# Close Increment (PM Validated)

## Project Overrides

!`s="done"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

**PM-Led Closure**: Validate tasks, tests, and docs before closing.

**AUTO-CLOSURE DEFAULT**: After `sw:do` completes all tasks, `sw:done` runs automatically — no user confirmation needed. Quality gates (code-review, simplify, grill, judge-llm, PM validation) provide the safety net. If something is wrong, the user can re-open the increment.

## Context Overflow Prevention

For large multi-agent sessions (via `sw:team-lead`), running `sw:done` directly may cause context overflow due to loading 4+ skill definitions into an already-full context. Instead, `sw:team-merge` spawns `sw:sw-closer` subagents that run the full closure pipeline in isolated fresh contexts -- one per increment. The `sw-closer` agent definition is at `plugins/specweave/agents/sw-closer.md`.

If you are closing an increment from a normal (non-team) session, use `sw:done` directly as documented below.

## Usage

```
sw:done <increment-id> [--auto]
```

Argument: Required increment ID (e.g., "001", "0001", "0042", "0153-feature-name"). Numeric portion extracted and zero-padded to 4 digits.

## Options

| Option | Description |
|--------|-------------|
| `--auto` | Legacy flag, now a no-op. Auto-closure is the default for all modes. All quality gates (code-review, simplify, grill, judge-llm, Gate 0, PM gates) always enforced. |

---

## Workflow

### Step 1: Self-Awareness Check (OPTIONAL)

If closing a SpecWeave framework increment, show post-closure reminders: update CHANGELOG.md, CLAUDE.md, consider version bump, run `npm test && npm run rebuild`, check for breaking changes. Informational only, not blocking.

### Step 2: Code Review (MANDATORY — STOP GATE with Fix Loop)

**The CLI blocks closure if `code-review-report.json` is missing (when required).** Do NOT skip this step.

1. Check config: `jq -r '.codeReview.required // true' .specweave/config.json` — if `false`, skip to Step 3
2. Read max iterations: `MAX_ITER=$(jq -r '.codeReview.maxFixIterations // 3' .specweave/config.json 2>/dev/null)`
3. Read blocking severities: defaults are `critical`, `high`, `medium` (configurable via `codeReview.blockingSeverities`)
4. **Iteration loop** (ITERATION=1):
   a. Invoke `Skill({ skill: "sw:code-reviewer", args: "--increment <id>" })`
   b. **Verify report written**: `Bash({ command: "test -f .specweave/increments/<id>/reports/code-review-report.json && echo OK || echo MISSING" })`
   c. If report MISSING: write it manually from code-reviewer output using the Write tool
   d. Read the report JSON: parse the `summary` object for severity counts
   e. **Evaluate blocking findings**: Sum counts for `critical` + `high` + `medium` (or configured severities)
   f. If no blocking findings → PASS, continue to Step 3
   g. If blocking findings exist AND ITERATION < MAX_ITER:
      - Display findings summary
      - Implement fixes for all critical/high/medium issues from the report
      - Increment ITERATION
      - Delete the stale report: `rm -f .specweave/increments/<id>/reports/code-review-report.json`
      - Go back to step 4a (re-run code-reviewer)
   h. If blocking findings exist AND ITERATION >= MAX_ITER:
      - **STOP closure** — display remaining findings
      - Log: "Code review failed after {N} fix iterations. {X} findings remain."
      - Increment stays in-progress

### Step 3: Simplify (Non-Blocking Cleanup)

Code review passed. Run simplify to clean up code before the grill examines it.

1. Invoke `Skill({ skill: "simplify" })` — this is a built-in Claude Code skill, NOT a `sw:` skill
2. `/simplify` spawns 3 parallel agents checking: duplication, readability, efficiency
3. Apply any suggested improvements
4. **Non-blocking**: Even if simplify finds issues, proceed to Step 4 (Grill)
5. Purpose: Clean code before grill reduces grill findings and improves ship readiness

### Step 4: Inline Grill Review (MANDATORY — STOP GATE)

**The CLI blocks closure if `grill-report.json` is missing.** Do NOT skip this step.

1. Check config: `jq -r '.grill.required // true' .specweave/config.json` — if `false`, skip to Step 5
2. Invoke `Skill({ skill: "sw:grill" })` with incrementId
3. **Verify report written**: `Bash({ command: "test -f .specweave/increments/<id>/reports/grill-report.json && echo OK || echo MISSING" })`
4. If report MISSING: write it manually from grill output using the Write tool
5. BLOCKERs or CRITICALs (shipReadiness: NOT READY) → STOP closure, ask user to fix
6. Passes → continue

### Step 5: Judge LLM Validation (MANDATORY — STOP GATE)

**A report file MUST be written regardless of outcome (even WAIVED if consent denied).**

1. **Consent check**: Check `externalModels` in config. If denied, write WAIVED report and continue
2. Invoke `Skill({ skill: "sw:judge-llm" })` with `--last-commit` (or `--staged`)
3. **Verify report written**: `Bash({ command: "test -f .specweave/increments/<id>/reports/judge-llm-report.json && echo OK || echo MISSING" })`
4. If report MISSING: write a WAIVED report with reason "Skill did not produce report"
5. **APPROVED** → continue | **CONCERNS** → show, allow continuation | **REJECTED** → STOP closure
6. No ANTHROPIC_API_KEY or consent denied → write WAIVED report, continue

### Step 6: Status Validation

- `ready_for_review` -> Proceed
- `active` -> Check all tasks done, transition to `ready_for_review` first
- `completed` -> Already closed, warn user
- `backlog` / `paused` / `abandoned` -> BLOCK with error

**No confirmation needed**: Proceed directly to closure. Quality gates (code-review, simplify, grill, judge-llm, Gate 0, PM gates) are the safety net — NOT user confirmation prompts. NEVER stop to ask "should I close this?" — just close it. If a gate fails, the increment stays open automatically. If the user disagrees with closure, they can re-open.

### Step 7: Load Increment Context

1. Find increment directory: normalize ID to 4-digit, match `.specweave/increments/0001-*/`
2. Load: `spec.md`, `plan.md`, `tasks.md`, `tests.md`

### Step 8: Automated Completion Validation (Gate 0)

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

### Step 9: PM Validation (3 Gates)

PM validation report goes in: `.specweave/increments/####-name/reports/PM-VALIDATION-REPORT.md`

**Gate 1 - Tasks Completed**: All P1 done, P2 done or deferred with reason, P3 done/deferred/backlogged, no blocked tasks, ACs met.

**Gate 2a - E2E Tests (AUTOMATED, BLOCKING)**: Detect playwright/cypress configs (including `repositories/*/*-e2e`). If found, run them. E2E failure blocks closure. No E2E detected -> skip.

**Gate 2 - Tests Passing**: All suites passing, coverage >80% critical paths, no unexplained skips, tests align with ACs.

**Gate 3 - Documentation Updated**: CLAUDE.md, README.md, CHANGELOG.md updated as needed. Inline docs complete. No stale references.

### Step 10: PM Decision

**All gates pass**:
1. Create marker file: `mkdir -p .specweave/state && touch .specweave/state/.sw-done-in-progress`
2. Run completion via CLI: `Bash({ command: "specweave complete <id> --yes" })` — the CLI re-verifies quality gate reports (code-review-report.json, grill-report.json, judge-llm-report.json) exist. It also triggers `LifecycleHookDispatcher.onIncrementDone()` for living docs sync, GitHub Project sync, and issue closure.
3. Remove marker file: `rm -f .specweave/state/.sw-done-in-progress`
4. Generate completion report, update backlog

**CRITICAL**: Do NOT directly edit metadata.json to set status. Always use the `specweave complete` CLI command — it is the single completion path that triggers all post-closure hooks.

**Any gate fails**:
- Show failures and blockers with estimated fix effort
- If GitHub issue exists, reopen it with failure details
- Increment remains in-progress

### Step 10.5: Pull Request Creation (pr-based only)

Check push strategy:
```bash
PUSH_STRATEGY=$(jq -r '.cicd.pushStrategy // "direct"' .specweave/config.json 2>/dev/null)
```

**If `pr-based`:**
1. Invoke `sw:pr` skill: `Skill({ skill: "sw:pr", args: "<increment-id>" })`
2. Verify PR was created: check metadata.json for `prRefs` with `state: "open"`
3. If PR creation failed: **warn but do NOT block closure**. The increment is already completed. PR is a distribution mechanism, not a quality gate.
4. Display PR URL(s) for human review.

**If `direct`:** Skip this step entirely (existing behavior unchanged).

### Step 11: Post-Closure Sync (AUTOMATIC via CLI hooks)

The `specweave complete` call in Step 10 triggers `LifecycleHookDispatcher.onIncrementDone()` which automatically handles:

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

If any operation failed, display: "Run `sw:progress-sync` to retry failed sync operations."

**Supplemental closure** (not handled by hooks — run manually if applicable):

**A) Close external-origin issue** (E-suffix increments only): Parse `metadata.external_ref` (format: `github#owner/repo#number`). Check `sync.settings.canUpdateStatus` permission. Close via `gh issue close -R`.

**B) Close ALL per-user-story GitHub issues**: If the hook-based closure missed any, search by title pattern:
1. Read `sync.github.owner` and `sync.github.repo` from config.json
2. Extract the feature ID from spec.md frontmatter or increment ID
3. For EACH user story in spec.md, search: `gh issue list -R {owner}/{repo} --search "[{feature_id}][{us_id}]" --state open --json number`
4. Close each: `gh issue close {number} -R {owner}/{repo} -c "Completed as part of increment {increment_id}"`

### Step 12: Sync Living Docs (MANDATORY)

Execute: `Skill({ skill: "sw:sync-docs" })` with the increment ID. Do NOT just mention it -- actually invoke it. This serves as a verification pass to confirm living docs are up to date after closure.

### Step 12b: Update Links in Docs (MANDATORY)

After living docs sync, update cross-references and bidirectional links so existing docs reference the newly created feature specs. Do NOT skip this step:

1. Read the feature spec files created by Step 12 (`.specweave/docs/internal/specs/{project}/FS-XXX/FEATURE.md` and `us-*.md`)
2. Update existing docs (FEATURE-CATALOG, module docs, etc.) with links to the new specs
3. Verify bidirectional links between increment → feature spec → living docs
4. Change `[DRAFT]` → `[COMPLETE]` on doc sections matching completed ACs

Verify that `.specweave/docs/internal/specs/{project}/FS-XXX/` contains `FEATURE.md` and `us-*.md` files. If missing, re-run Step 12.

### Step 13: Post-Closure Quality Assessment

Runs ONLY if closure succeeded. Invoke: `sw:qa ${incrementId}`

Evaluates 7 dimensions: Clarity, Testability, Completeness, Feasibility, Maintainability, Edge Cases, Risk Assessment.

- Score >=80 -> PASS, proceed
- Score 60-79 -> CONCERNS, log and suggest improvements
- Score <60 -> FAIL, recommend follow-up increment

Report saved to: `.specweave/increments/####/reports/qa-post-closure.md`

Quality assessment runs AFTER closure (not blocking delivery). Critical issues trigger follow-up increment creation.

### Step 14: Handle Incomplete Work

If scope creep detected, offer options:
- A) Complete all tasks (estimate effort)
- B) Move extra tasks to next increment (close now)
- C) Split into 2 increments (recommended)

Transfer tasks creates new increment with dependencies on current one.

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#done)
