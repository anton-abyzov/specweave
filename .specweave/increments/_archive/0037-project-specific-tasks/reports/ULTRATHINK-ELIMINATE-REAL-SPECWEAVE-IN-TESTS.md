# ULTRATHINK: Eliminate Real .specweave/ Usage in ALL Tests

**Date**: 2025-11-17
**Severity**: 🔴 HIGH (Principle Violation)
**Status**: 🚧 IN PROGRESS

---

## Problem Statement

**8 integration tests use the REAL `.specweave/` folder**, violating fundamental test isolation principles:

```typescript
// ❌ WRONG: Using production .specweave/ folder
const incrementsDir = path.join(process.cwd(), '.specweave', 'increments');
const testRunDir = path.join(process.cwd(), '.specweave', 'test-runs');
```

**Why This is Unacceptable** (even without deletion risk):

1. **Repository Pollution**: Test data accumulates in production folder
2. **Git Noise**: Test artifacts appear in `git status`
3. **Test Interference**: Tests can affect each other through shared state
4. **CI/CD Issues**: Parallel test runs conflict
5. **Principle Violation**: Tests MUST be isolated, period

**User Directive**: "`.specweave` folder MUST never be used in test as it's a part of real repo to use!"

---

## Current Offenders (8 Files)

### Group A: JIRA Integration Tests (4 files)

**Problem**: Create test increments in real `.specweave/increments/`

1. `tests/integration/external-tools/jira/jira-incremental-sync.test.ts`
   ```typescript
   // Line 201
   const incrementsDir = path.join(process.cwd(), '.specweave', 'increments');
   ```

2. `tests/integration/external-tools/jira/jira-bidirectional-sync.test.ts`
   ```typescript
   // Line 250
   const incrementFolder = path.join(process.cwd(), '.specweave', 'increments', this.testIncrementId);
   ```

3. `tests/integration/jira-sync/jira-incremental-sync.test.ts` (duplicate)
4. `tests/integration/jira-sync/jira-bidirectional-sync.test.ts` (duplicate)

**Impact**:
- Creates real increments: `0040-test`, `0041-test`, etc.
- Pollutes real `.specweave/increments/` folder
- Left behind after test (no cleanup)

### Group B: ML Pipeline Tests (4 files)

**Problem**: Create test runs in real `.specweave/test-runs/`

1. `tests/integration/generators/ml/ml-pipeline-soccer-detection.test.ts`
   ```typescript
   // Line 53
   this.testRunDir = path.join(process.cwd(), '.specweave', 'test-runs', 'ml-pipeline', timestamp);
   ```

2. `tests/integration/generators/ml/ml-pipeline-real-video.test.ts`
   ```typescript
   // Line 57
   this.testRunDir = path.join(process.cwd(), '.specweave', 'test-runs', 'ml-pipeline-real', timestamp);
   ```

3. `tests/integration/ml-pipeline-workflow/ml-pipeline-soccer-detection.test.ts` (duplicate)
4. `tests/integration/ml-pipeline-workflow/ml-pipeline-real-video.test.ts` (duplicate)

**Impact**:
- Creates test run artifacts in real `.specweave/`
- Accumulates large files (datasets, models)
- Left behind after test

---

## Solution Architecture

### Principle: Complete Test Isolation

**Rule**: ALL tests MUST use directories OUTSIDE `.specweave/`

**Approved Test Locations**:
- ✅ `tests/fixtures/temp-{test-name}/`
- ✅ `tests/tmp/test-${timestamp}/`
- ✅ `.specweave-test/` (note the dash - different folder)

**Forbidden Locations**:
- ❌ `.specweave/` (production folder)
- ❌ `.specweave/test-*` (still inside production folder)
- ❌ `.specweave/increments/` (production increments)

### Pattern A: Persistent Fixtures (JIRA Tests)

**Use Case**: Tests need stable structure, shared across test runs

**Implementation**:
```typescript
// ✅ CORRECT: Isolated test project
const testProjectRoot = path.join(__dirname, '../../../fixtures/jira-integration-test');
const incrementsDir = path.join(testProjectRoot, '.specweave', 'increments');

beforeEach(async () => {
  // Clean and recreate test structure
  await fs.remove(testProjectRoot);
  await fs.ensureDir(path.join(testProjectRoot, '.specweave', 'increments'));
  await fs.ensureDir(path.join(testProjectRoot, '.specweave', 'docs'));
});

afterEach(async () => {
  // Optional: Clean up test data
  await fs.remove(testProjectRoot);
});
```

**Benefits**:
- Complete isolation from real `.specweave/`
- Predictable test structure
- Easy cleanup
- No git pollution

### Pattern B: Temporary Timestamped (ML Tests)

**Use Case**: Tests need unique directories per run (large artifacts)

**Implementation**:
```typescript
// ✅ CORRECT: Temporary test directory
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const testRunDir = path.join(__dirname, '../../../tmp', `ml-test-${timestamp}`);
const datasetDir = path.join(testRunDir, 'dataset');
const modelsDir = path.join(testRunDir, 'models');

beforeEach(async () => {
  await fs.ensureDir(testRunDir);
  await fs.ensureDir(datasetDir);
  await fs.ensureDir(modelsDir);
});

afterEach(async () => {
  // Clean up large artifacts
  await fs.remove(testRunDir);
});
```

**Benefits**:
- Unique directory per test run
- No conflicts in parallel execution
- Complete isolation
- Automatic cleanup

---

## Refactoring Plan

### Phase 1: JIRA Integration Tests

**Files to Refactor**: 4 files (2 originals + 2 duplicates)

**Changes**:
1. Replace `process.cwd()/.specweave/` with isolated test fixture path
2. Add `beforeEach` cleanup
3. Add `afterEach` cleanup
4. Update all path references

**Original**:
```typescript
const incrementsDir = path.join(process.cwd(), '.specweave', 'increments');
```

**Fixed**:
```typescript
const testRoot = path.join(__dirname, '../../../fixtures/jira-test');
const incrementsDir = path.join(testRoot, '.specweave', 'increments');
```

### Phase 2: ML Pipeline Tests

**Files to Refactor**: 4 files (2 originals + 2 duplicates)

**Changes**:
1. Replace `.specweave/test-runs/` with `tests/tmp/ml-test-${timestamp}/`
2. Add cleanup in `afterEach`
3. Update all path references

**Original**:
```typescript
this.testRunDir = path.join(process.cwd(), '.specweave', 'test-runs', 'ml-pipeline', timestamp);
```

**Fixed**:
```typescript
this.testRunDir = path.join(__dirname, '../../../tmp', `ml-test-${timestamp}`);
```

### Phase 3: Verification

**Checklist**:
- [ ] All 8 tests refactored
- [ ] No references to `process.cwd()/.specweave/`
- [ ] All tests pass independently
- [ ] All tests pass in parallel
- [ ] No test artifacts in real `.specweave/`
- [ ] `git status` clean after test run

---

## Implementation Steps

### Step 1: Refactor JIRA Tests (4 files)

**File 1**: `tests/integration/external-tools/jira/jira-incremental-sync.test.ts`

**Changes Required**:
1. Add `testProjectRoot` constant
2. Replace all `process.cwd()/.specweave/` references
3. Add `beforeEach` setup
4. Add `afterEach` cleanup
5. Update cleanup method to use test directory

**File 2**: `tests/integration/external-tools/jira/jira-bidirectional-sync.test.ts`

**Changes Required**: (same as File 1)

**File 3 & 4**: Duplicates in `tests/integration/jira-sync/`

**Strategy**: Check if duplicates, if so, consider removing or ensure both use isolated paths

### Step 2: Refactor ML Pipeline Tests (4 files)

**File 1**: `tests/integration/generators/ml/ml-pipeline-soccer-detection.test.ts`

**Changes Required**:
1. Change constructor to use `tests/tmp/` instead of `.specweave/test-runs/`
2. Add cleanup in test lifecycle
3. Update all path references

**File 2**: `tests/integration/generators/ml/ml-pipeline-real-video.test.ts`

**Changes Required**: (same as File 1)

**File 3 & 4**: Duplicates in `tests/integration/ml-pipeline-workflow/`

**Strategy**: (same as JIRA duplicates)

### Step 3: Add Cleanup Utilities

**Create**: `tests/integration/test-utils.ts`

```typescript
/**
 * Test Utilities for Integration Tests
 */
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Create isolated test project structure
 */
export async function createTestProject(testName: string): Promise<string> {
  const testRoot = path.join(__dirname, '../fixtures', `temp-${testName}`);

  // Clean if exists
  await fs.remove(testRoot);

  // Create structure
  await fs.ensureDir(path.join(testRoot, '.specweave', 'increments'));
  await fs.ensureDir(path.join(testRoot, '.specweave', 'docs'));
  await fs.ensureDir(path.join(testRoot, '.specweave', 'state'));

  return testRoot;
}

/**
 * Clean up test project
 */
export async function cleanupTestProject(testRoot: string): Promise<void> {
  await fs.remove(testRoot);
}

/**
 * Create temporary test directory with timestamp
 */
export function createTempTestDir(prefix: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(__dirname, '../tmp', `${prefix}-${timestamp}`);
}

/**
 * Validate no pollution in real .specweave/
 */
export function validateNoSpecweavePollution(): void {
  const realSpecweave = path.join(process.cwd(), '.specweave');

  // Check for test artifacts
  const testIncrements = fs.readdirSync(path.join(realSpecweave, 'increments'))
    .filter(name => name.includes('test'));

  if (testIncrements.length > 0) {
    throw new Error(`Test pollution detected in real .specweave/: ${testIncrements.join(', ')}`);
  }
}
```

### Step 4: Update Test Documentation

**Create**: `tests/INTEGRATION-TEST-GUIDELINES.md`

```markdown
# Integration Test Guidelines

## Test Isolation Requirements

**RULE**: ALL tests MUST use isolated directories OUTSIDE `.specweave/`

### Approved Patterns

1. **Persistent Fixtures**
   ```typescript
   const testRoot = path.join(__dirname, '../../fixtures/temp-test-name');
   ```

2. **Temporary Directories**
   ```typescript
   const testDir = createTempTestDir('my-test');
   ```

3. **Test-Specific Root**
   ```typescript
   const testRoot = path.join(process.cwd(), '.specweave-test');
   ```

### Forbidden Patterns

❌ NEVER use real `.specweave/` folder:
```typescript
// FORBIDDEN
const dir = path.join(process.cwd(), '.specweave', 'increments');
```

### Cleanup Requirements

Always clean up in `afterEach`:
```typescript
afterEach(async () => {
  await fs.remove(testRoot);
});
```
```

---

## Testing Strategy

### Pre-Refactor Verification

1. Run all 8 tests to establish baseline
2. Document current behavior
3. Take snapshot of `.specweave/` state

### Post-Refactor Verification

**For Each Test**:
1. Run test independently
2. Verify test passes
3. Verify no files in real `.specweave/`
4. Check `git status` is clean

**For All Tests**:
1. Run all 8 tests in parallel
2. Verify all pass
3. Verify no conflicts
4. Verify no pollution

**Commands**:
```bash
# Run individual test
npm test -- tests/integration/external-tools/jira/jira-incremental-sync.test.ts

# Run all JIRA tests
npm test -- tests/integration/external-tools/jira/

# Run all ML tests
npm test -- tests/integration/generators/ml/

# Verify no pollution
git status .specweave/
# Should show: nothing to commit, working tree clean
```

---

## Risk Assessment

### Refactoring Risks

**Low Risk**:
- Tests are integration tests (not production code)
- Tests have no external dependencies on `.specweave/` location
- Tests create their own data structures

**Medium Risk**:
- Tests might have hardcoded assumptions about file locations
- Some tests might check absolute paths

**Mitigation**:
- Thorough testing after each refactor
- Verify test behavior unchanged
- Keep original tests as reference until confirmed working

### Rollback Plan

If refactoring causes issues:
1. Revert commits
2. Investigate specific failures
3. Fix incrementally (one test at a time)

---

## Success Criteria

**All 8 tests refactored when**:
- ✅ All tests use isolated directories
- ✅ Zero references to `process.cwd()/.specweave/`
- ✅ All tests pass independently
- ✅ All tests pass in parallel
- ✅ `git status` clean after tests
- ✅ No test artifacts in real `.specweave/`
- ✅ Test documentation updated

---

## Timeline

**Estimated Effort**: 2-3 hours

**Phase 1** (JIRA Tests): 1 hour
- Refactor 4 files
- Test individually
- Test together

**Phase 2** (ML Tests): 1 hour
- Refactor 4 files
- Test individually
- Test together

**Phase 3** (Verification): 30 minutes
- Run full test suite
- Verify isolation
- Update documentation

**Phase 4** (Cleanup): 30 minutes
- Remove duplicate tests if found
- Update test utilities
- Update CLAUDE.md

---

## Next Steps

1. **Immediate**: Refactor JIRA tests (4 files)
2. **Immediate**: Refactor ML tests (4 files)
3. **Short-term**: Add pre-test validation (check for .specweave/ usage)
4. **Short-term**: Add ESLint rule to prevent future violations
5. **Long-term**: Document test isolation patterns in CONTRIBUTING.md

---

## Conclusion

**Zero Tolerance Policy**: NO tests should EVER use real `.specweave/` folder.

**Principle**: Test isolation is not negotiable. Even "low risk" pollution is unacceptable.

**Action**: Refactor all 8 tests to use proper isolation immediately.

---

**Status**: 🚧 **IN PROGRESS** - Refactoring underway
**Next**: Implement Phase 1 (JIRA tests refactoring)
