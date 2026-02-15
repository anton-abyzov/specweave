# Tasks: Fix stale .specweave/ folder creation in wrong locations

<!--
====================================================================
  TEMPLATE FILE - MUST BE COMPLETED VIA TASK BUILDER SKILL
====================================================================

This is a TEMPLATE created by increment-planner.
DO NOT manually fill in the tasks below.

To complete this task list, run:
  Tell Claude: "Create tasks for increment [ID]"

This will activate the test-aware planner which will:
- Generate detailed implementation tasks
- Add embedded test plans (BDD format)
- Set task dependencies
- Assign model hints

====================================================================
-->

## Phase 1: Investigation & Root Cause Analysis

### T-001: Investigate .specweave/ folder creation points
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given codebase → When searching for all mkdir/.specweave paths → Then all creation points identified
- Searched all `mkdirSync`, `ensureDir` calls referencing `.specweave`
- Found 10+ creation points across hooks, CLI, adapters
- Identified hook ordering bug as primary cause

### T-002: Identify root cause of stale folder creation
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02 | **Status**: [x] completed
**Test**: Given user-prompt-submit.sh → When tracing execution order → Then scope guard runs before root detection
- Root cause: SCOPE GUARD (line 214) uses `${SW_PROJECT_ROOT:-.}` before `SW_PROJECT_ROOT` is set (line 296)
- Secondary: `findProjectRoot()` in utils doesn't check `config.json`
- Tertiary: `$HOME/.specweave/` hardcoded paths in hooks

## Phase 2: Core Fixes

### T-003: Move project root detection before scope guard
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02 | **Status**: [x] completed
**File**: `plugins/specweave/hooks/user-prompt-submit.sh`
- Moved PROJECT ROOT DETECTION block to run immediately after init guard
- Changed detection from `[[ -d "$_swdir/.specweave" ]]` to `[[ -f "$_swdir/.specweave/config.json" ]]`
- Removed old detection block (replaced with comment)

### T-004: Guard all mkdir calls in hooks
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03, AC-US1-04 | **Status**: [x] completed
**File**: `plugins/specweave/hooks/user-prompt-submit.sh`
- Wrapped scope guard in `if [[ -n "$SW_PROJECT_ROOT" ]]`
- Replaced all `${SW_PROJECT_ROOT:-.}` with `$SW_PROJECT_ROOT`
- Fixed SCOPE_GUARD_RUN double-set bug (P1 from grill review)

### T-005: Fix $HOME/.specweave/ paths
**User Story**: US-001 | **Satisfies ACs**: AC-US1-05 | **Status**: [x] completed
**File**: `plugins/specweave/hooks/user-prompt-submit.sh`
- Lazy load log: uses `$SW_PROJECT_ROOT/.specweave/logs/` or `/dev/null`
- Prompt cache: uses `$SW_PROJECT_ROOT/.specweave/state/prompt-cache/` or `$TMPDIR`
- TDD log: guarded with `if [[ -n "$SW_PROJECT_ROOT" ]]`
- SPECWEAVE_DIR: uses `$SW_PROJECT_ROOT/.specweave` when available

### T-006: Fix findProjectRoot() utility to check config.json
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [x] completed
**File**: `src/utils/find-project-root.ts`
- Added `fs.existsSync(path.join(specweavePath, 'config.json'))` check
- Removed root directory check (no valid project at filesystem root)
- Now matches behavior of `hooks/platform.ts` version

### T-007: Fix update.ts isSpecWeaveProject consistency
**User Story**: US-003 | **Satisfies ACs**: AC-US3-02 | **Status**: [x] completed
**File**: `src/cli/commands/update.ts`
- Changed `fs.existsSync('.specweave')` to `fs.existsSync('.specweave/config.json')`

## Phase 3: Orphan Cleanup

### T-008: Add stale folder cleanup to update command
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04 | **Status**: [x] completed
**File**: `src/cli/commands/update.ts`
- Added `findStaleSpecweaveFolders()` function
- Scans 3 levels up + `$HOME/.specweave`
- Only removes folders without `config.json`
- `$HOME` check: only if contents are exclusively `logs/state/cache`
- Supports `--check` dry-run mode

## Phase 4: Testing

### T-009: Update find-project-root tests for config.json requirement
**User Story**: US-003 | **Satisfies ACs**: AC-US3-03 | **Status**: [x] completed
**File**: `tests/unit/utils/find-project-root.test.ts`
- Updated `createProjectTree()` to write `config.json`
- Added test: stale `.specweave/` (no config.json) returns null
- Added test: stale parent skipped, valid child found
- Updated update.test.ts: `.specweave/` without config.json = not a project

### T-010: Verify all tests pass
**User Story**: US-001, US-002, US-003 | **Status**: [x] completed
- `npm run rebuild` succeeds
- `npx vitest run` passes all 17,890 tests
