# E2E Test Failure Analysis

**Date**: 2026-01-08
**Increment**: 0164-e2e-test-infrastructure-fix

## Test Summary

```
Test Files:  2 failed | 3 passed | 1 skipped (6 total)
Tests:       17 failed | 55 passed | 2 skipped (74 total)
Duration:    406ms
```

## Passing Tests ✅

- **tests/e2e/lsp/lsp-performance.test.ts** (3/3 tests) ✅
- **tests/e2e/project-cli.test.ts** (10/10 tests) ✅
- **tests/e2e/plugin-activation/skill-matching.test.ts** (39/39 tests) ✅

**Total Passing**: 52 tests

## Skipped Tests ⏭️

- **tests/e2e/crash-recovery.e2e.ts** (2 tests skipped)
  - Reason: Registry-dependent tests, infrastructure changed

## Failed Test Suites ❌

### 1. tests/e2e/auto/full-workflow.e2e.ts (LOAD FAILURE)

**Error**: `Failed to load url ../../../src/core/auto/session-state.js`

**Root Cause**:
- File does not exist - removed during auto mode simplification (increment 0162)
- Tests import deleted module: `session-state.js`

**Impact**: Entire test suite cannot load (0 tests run)

**Fix Required**:
- Update test imports to use new simplified auto structure
- Remove references to deleted modules (session-state, circuit-breaker, etc.)

### 2. tests/e2e/auto/stop-hook-reliability.e2e.ts (17 failures)

**Common Error Pattern**: `expected '' to contain 'decision'` OR `Unexpected end of JSON input`

**Root Cause**:
- Tests call `stop-auto.sh` hook which was deleted/moved
- Hook returns empty stdout instead of JSON decision
- Error logs show: `bash: /path/to/stop-auto.sh: No such file or directory`

**Failed Test Categories**:

1. **Xcode/iOS Test Parsing** (3 failures)
   - should parse Xcode test results
   - should detect Xcode build failures
   - should handle Swift Package Manager output

2. **Generic Exit Code Detection** (3 failures)
   - should detect failure from non-zero exit code
   - should detect failure from universal patterns
   - should detect success from universal patterns

3. **Failure Classification System** (3 failures)
   - should classify network errors as transient
   - should classify missing file errors as external
   - should classify assertion errors as fixable

4. **Context Size Estimation** (1 failure)
   - should estimate context size from transcript file

5. **Heartbeat Mechanism** (1 failure)
   - should update heartbeat file on each iteration

6. **Stop Hook Active - Ralph Wiggum Pattern** (2 failures)
   - should continue evaluating when incomplete
   - should approve exit when complete

7. **Session Status Checks** (2 failures)
   - should approve exit for paused sessions
   - should approve exit for completed sessions

8. **Max Iterations Check** (1 failure)
   - should complete session when max iterations reached

9. **Completion Promise Detection** (1 failure)
   - should approve exit on completion promise

**Fix Required**:
- Update hook path from `stop-auto.sh` to `stop-dispatcher.sh`
- OR update tests to mock hook execution
- Verify new hook structure matches test expectations

## Hook Infrastructure Issue

**Root Problem**: Hook migration incomplete

```bash
# Old (deleted):
plugins/specweave/hooks/stop-auto.sh

# New (exists):
plugins/specweave/hooks/stop-dispatcher.sh
```

**Impact**: 17 tests fail due to missing hook file

## Categorization by Fix Type

### Type A: Import Errors (Easy)
- `full-workflow.e2e.ts` - Update imports, remove deleted modules
- **Estimated time**: 15 minutes

### Type B: Hook Path Errors (Medium)
- `stop-hook-reliability.e2e.ts` - Update hook paths, verify new hook contract
- **Estimated time**: 30 minutes

### Type C: Hook Contract Changes (Hard)
- If new hook has different input/output format
- May require test rewrite
- **Estimated time**: 1-2 hours (if needed)

## Recommended Fix Order

1. **Fix full-workflow.e2e.ts imports** (quick win, unlocks test suite)
2. **Update stop-hook-reliability.e2e.ts hook paths** (fixes 17 tests)
3. **Verify hook contract compatibility** (may need adjustments)
4. **Re-run full suite** (should achieve 100% pass rate)

## Success Criteria

- ✅ All test files load without errors
- ✅ Hook paths updated to match new structure
- ✅ 72/72 runnable tests passing (100% pass rate)
- ✅ 2 skipped tests remain skipped (expected)

## Related Increments

- **0162-auto-simplification**: Removed auto mode complexity, deleted session-state.js
- **0161-hook-execution-visibility**: Hook system refactoring, moved stop-auto.sh logic

---

**Next Step**: Execute T-016 (Fix Failing E2E Tests)
