# Completion Validation Architecture

**Status**: Implementation In Progress
**Date**: 2025-11-18
**Context**: Increments are being closed with unchecked ACs and tasks - need comprehensive validation system

---

## Problem Statement

**CRITICAL GAPS IDENTIFIED**:
1. Increments marked "completed" with numerous unchecked ACs and tasks
2. No easy way to reopen an increment when bugs are found
3. No mechanism to scan all increments for false completions
4. Status line only shows task completion, not AC completion
5. Validation can be bypassed by direct metadata.json editing (though pre-commit hook should catch this)

**User Impact**:
- False completion → Status line shows wrong increment
- GitHub sync broken → Issues marked closed with open work
- Data integrity violation → Source of truth is inconsistent
- Stakeholder confusion → External tools show wrong status

---

## Current State

### Existing Components (Good Foundation)

1. **IncrementCompletionValidator** (`src/core/increment/completion-validator.ts`):
   - ✅ Validates ACs: `countOpenACs(incrementId)`
   - ✅ Validates tasks: `countPendingTasks(incrementId)`
   - ✅ Returns `ValidationResult { isValid, errors[] }`

2. **`/specweave:done` Command** (Gate 0 validation):
   - ✅ Runs `IncrementCompletionValidator` BEFORE PM validation
   - ✅ Blocks completion if validation fails
   - ✅ Shows detailed error messages

3. **Pre-commit Hook** (`validate-increment-completion.sh`):
   - ✅ Validates ALL increments before commit
   - ✅ Blocks commits with open ACs/tasks in completed increments
   - ✅ Can be bypassed with `--no-verify` (intentional escape hatch)

### Identified Gaps

1. **Status Line** - Only shows `X/Y tasks`, missing AC metrics
2. **No Reopen Command** - Can't easily reopen completed increments
3. **No Scan Command** - Can't find all false completions
4. **No intelligent reopening** - No bug detection or smart reopen suggestions

---

## Solution Architecture

### Component 1: Enhanced Status Line

**Goal**: Show BOTH task and AC completion metrics

**Current**:
```
[inc-name] ████░░░░ 15/20 tasks
```

**Proposed**:
```
[inc-name] ████░░░░ 15/20 tasks | 8/12 ACs
```

**Implementation**:

1. **Update StatusLineCache Type** (`src/core/status-line/types.ts`):
   ```typescript
   export interface IncrementStatus {
     id: string;
     name: string;
     completed: number;  // tasks completed
     total: number;      // total tasks
     acsCompleted: number;  // NEW: ACs completed
     acsTotal: number;      // NEW: total ACs
   }
   ```

2. **Update Hook** (`plugins/specweave/hooks/post-task-completion.sh`):
   - Use `IncrementCompletionValidator.countOpenACs()` to count ACs
   - Calculate `acsCompleted = acsTotal - openACs`
   - Write to cache

3. **Update Manager** (`src/core/status-line/status-line-manager.ts`):
   - Read AC metrics from cache
   - Format: `X/Y tasks | A/B ACs`
   - Keep under 100 chars total

**Priority**: P1 (user explicitly requested)

---

### Component 2: /specweave:reopen Command

**Goal**: Manually reopen a completed increment when bugs are found

**Usage**:
```bash
/specweave:reopen 0043 --reason="Bug in AC sync implementation"
/specweave:reopen 0043 --auto  # Auto-detect if should reopen based on incomplete work
```

**Workflow**:

1. **Load Increment**:
   - Find `.specweave/increments/0043-*/`
   - Load `spec.md`, `tasks.md`, `metadata.json`

2. **Validate Status**:
   - Check current status is "completed"
   - If not completed, show error: "Increment is already active"

3. **Analyze Incomplete Work** (if `--auto` flag):
   - Run `IncrementCompletionValidator.validateCompletion()`
   - Count open ACs and pending tasks
   - If ALL complete, suggest: "Increment appears complete. Use explicit --reason to reopen anyway"

4. **Reopen Increment**:
   - Update `spec.md` frontmatter: `status: active`
   - Update `metadata.json`: `status: "active"`
   - Add reopen log entry to metadata
   - Update timestamp

5. **Report**:
   ```
   ✅ Reopened increment 0043-spec-md-desync-fix

   Reason: Bug in AC sync implementation

   Incomplete work detected:
   • 17 acceptance criteria still open
   • 13 tasks still pending

   Status: completed → active
   ```

**Implementation** (`plugins/specweave/commands/specweave-reopen.md`):
- Invoke reopen logic
- Update all relevant files
- Clear status line cache (force update)
- Report results

**Priority**: P1 (core functionality gap)

---

### Component 3: /specweave:scan-completeness Command

**Goal**: Scan ALL increments and find false completions

**Usage**:
```bash
/specweave:scan-completeness              # Scan and report
/specweave:scan-completeness --auto-fix   # Scan and reopen invalid ones
```

**Workflow**:

1. **Scan All Increments**:
   - Find all in `.specweave/increments/` (exclude `_archived/`)
   - Filter by status="completed"

2. **Validate Each**:
   - Run `IncrementCompletionValidator.validateCompletion()`
   - Track: `{ incrementId, openACs, pendingTasks, errors[] }`

3. **Report Results**:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   COMPLETION SCAN RESULTS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Scanned: 12 completed increments
   Valid: 10 increments ✅
   Invalid: 2 increments ❌

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   INVALID COMPLETIONS (should be reopened)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   ❌ 0037-project-specific-tasks
      • 5 acceptance criteria still open
      • 3 tasks still pending
      • Marked completed: 2025-11-15

   ❌ 0041-living-docs-test-fixes
      • 12 acceptance criteria still open
      • 8 tasks still pending
      • Marked completed: 2025-11-16

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   RECOMMENDATIONS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Option 1: Auto-fix (reopen invalid increments)
     /specweave:scan-completeness --auto-fix

   Option 2: Manual reopen
     /specweave:reopen 0037 --reason="False completion - has open work"
     /specweave:reopen 0041 --reason="False completion - has open work"
   ```

4. **Auto-Fix** (if `--auto-fix`):
   - For each invalid increment:
   - Call `/specweave:reopen` with auto-generated reason
   - Report each reopen

**Implementation** (`plugins/specweave/commands/specweave-scan-completeness.md`):
- Loop through all increments
- Use IncrementCompletionValidator
- Generate detailed report
- Optionally auto-fix

**Priority**: P1 (critical for finding existing issues)

---

### Component 4: Smart Reopen Detection

**Goal**: Intelligently detect when an increment should be reopened based on user prompts

**Trigger Patterns**:
- "There's a bug in increment 0043"
- "0043 implementation is broken"
- "Need to fix 0043"
- "Reopen 0043"

**Implementation**:
- New skill: `specweave:smart-reopen-detector` (already exists!)
- Activates on bug reports for completed increments
- Suggests `/specweave:reopen` command
- Shows what's incomplete

**Priority**: P2 (nice-to-have, skill already exists)

---

## Implementation Plan

### Phase 1: Core Validation Enhancement (P1)

1. ✅ **Enhance IncrementCompletionValidator** (already done)
   - Already has `countOpenACs()` and `countPendingTasks()`
   - Already returns detailed errors

2. **Create /specweave:reopen Command**
   - File: `plugins/specweave/commands/specweave-reopen.md`
   - Reopen logic in command markdown
   - Update spec.md and metadata.json
   - Clear status cache

3. **Create /specweave:scan-completeness Command**
   - File: `plugins/specweave/commands/specweave-scan-completeness.md`
   - Scan all increments
   - Use validator
   - Generate report

4. **Enhance Status Line**
   - Update types: Add `acsCompleted`, `acsTotal`
   - Update hook: Count ACs using validator
   - Update manager: Show AC metrics

### Phase 2: Testing (P1)

5. **Unit Tests**
   - `tests/unit/increment/completion-validator.test.ts` (already exists)
   - Add edge case tests

6. **Integration Tests**
   - `tests/integration/commands/reopen.test.ts`
   - `tests/integration/commands/scan-completeness.test.ts`
   - `tests/integration/status-line/ac-metrics.test.ts`

7. **E2E Test**
   - `tests/e2e/completion-validation-workflow.test.ts`
   - Test: Close → Reopen → Scan → Fix → Close again

### Phase 3: Documentation (P2)

8. **Update CLAUDE.md**
   - Document new commands
   - Update validation section
   - Add troubleshooting

9. **Update Command Help**
   - `/specweave:reopen --help`
   - `/specweave:scan-completeness --help`

---

## Command Reference

### /specweave:reopen

**Syntax**:
```bash
/specweave:reopen <increment-id> [--reason="..."] [--auto]
```

**Arguments**:
- `<increment-id>`: Required. Increment to reopen (e.g., "0043", "43")
- `--reason="text"`: Optional. Reason for reopening
- `--auto`: Optional. Only reopen if incomplete work detected

**Examples**:
```bash
/specweave:reopen 0043 --reason="Bug in AC sync - needs fix"
/specweave:reopen 0043 --auto  # Reopen only if work is incomplete
```

---

### /specweave:scan-completeness

**Syntax**:
```bash
/specweave:scan-completeness [--auto-fix]
```

**Arguments**:
- `--auto-fix`: Optional. Automatically reopen invalid increments

**Examples**:
```bash
/specweave:scan-completeness           # Scan and report
/specweave:scan-completeness --auto-fix  # Scan and reopen invalid
```

---

## Data Flow

```
User creates increment
  ↓
Work on tasks (/specweave:do)
  ↓
Try to close (/specweave:done)
  ↓
Gate 0: IncrementCompletionValidator
  ├─ PASS → PM validation (Gates 1-3)
  │   ├─ PASS → Close increment
  │   │   ├─ Update spec.md: status=completed
  │   │   ├─ Update metadata.json: status="completed"
  │   │   └─ Update status line cache (tasks + ACs)
  │   └─ FAIL → Block closure, show errors
  └─ FAIL → Block closure (before PM even runs)

Later: Bug found
  ↓
/specweave:reopen 0043 --reason="Bug X"
  ├─ Update spec.md: status=active
  ├─ Update metadata.json: status="active"
  ├─ Clear status cache
  └─ Report incomplete work

Or: Periodic audit
  ↓
/specweave:scan-completeness
  ├─ Scan all completed increments
  ├─ Run validator on each
  ├─ Report false completions
  └─ Optionally auto-fix
```

---

## Validation Enforcement Layers

**Layer 1: /specweave:done Command** (Gate 0)
- Runs `IncrementCompletionValidator` before PM validation
- Blocks if validation fails
- Exit code 1 (halts command)

**Layer 2: Pre-commit Hook**
- Runs on every `git commit`
- Validates ALL completed increments
- Blocks commit if any have open work
- Can bypass with `--no-verify` (intentional escape hatch)

**Layer 3: Periodic Scans**
- Manual: `/specweave:scan-completeness`
- Finds issues that slipped through
- Suggests reopening

**Layer 4: Status Line**
- Shows completion metrics (tasks + ACs)
- Visual indicator of progress
- Red flag if increment shows "completed" but metrics incomplete

---

## Success Metrics

**Before**:
- ❌ Increments closed with 17 open ACs, 13 pending tasks
- ❌ No way to detect false completions
- ❌ No easy reopen mechanism
- ❌ Status line incomplete (tasks only)

**After**:
- ✅ Cannot close increment with open work (enforced by Gate 0)
- ✅ Pre-commit hook blocks false completions
- ✅ `/specweave:scan-completeness` finds existing issues
- ✅ `/specweave:reopen` makes fixing easy
- ✅ Status line shows full metrics: `X/Y tasks | A/B ACs`

---

## Related Documents

- IncrementCompletionValidator: `src/core/increment/completion-validator.ts`
- /specweave:done: `plugins/specweave/commands/specweave-done.md`
- Pre-commit hook: `plugins/specweave/hooks/validate-increment-completion.sh`
- Status line: `src/core/status-line/status-line-manager.ts`
