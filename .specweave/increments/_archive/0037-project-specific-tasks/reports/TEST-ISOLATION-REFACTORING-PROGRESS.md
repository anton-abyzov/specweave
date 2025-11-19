# Test Isolation Refactoring - Progress Report

**Date**: 2025-11-17
**Goal**: Eliminate ALL usage of real `.specweave/` folder in tests
**Status**: 🚧 IN PROGRESS (1/8 files completed)

---

## Principle

**ZERO TOLERANCE**: No test shall EVER use the real `.specweave/` folder.

**Rationale**:
- Test isolation is not negotiable
- Even "low risk" pollution is unacceptable
- Repository must remain clean after tests
- Tests must be parallel-safe
- `.specweave/` is production data, not test data

---

## Refactoring Pattern Applied

### ❌ Before (Dangerous)

```typescript
class MyTest {
  private async someTest(): Promise<void> {
    // ❌ Uses REAL .specweave/ folder in repository
    const incrementsDir = path.join(process.cwd(), '.specweave', 'increments');
    fs.mkdirSync(incrementsDir, { recursive: true });
    // Creates pollution in real repository!
  }
}
```

### ✅ After (Safe & Isolated)

```typescript
class MyTest {
  // ✅ ISOLATED TEST PROJECT (NOT real .specweave/)
  private testProjectRoot: string;

  constructor() {
    // Use isolated test directory OUTSIDE .specweave/
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.testProjectRoot = path.join(__dirname, '../../../fixtures', `test-${timestamp}`);
  }

  private async setupTestEnvironment(): Promise<void> {
    // Create isolated test .specweave/ structure
    const specweaveDir = path.join(this.testProjectRoot, '.specweave');
    const incrementsDir = path.join(specweaveDir, 'increments');
    fs.mkdirSync(incrementsDir, { recursive: true });
  }

  private async cleanupTestEnvironment(): Promise<void> {
    // Clean up isolated test directory
    if (fs.existsSync(this.testProjectRoot)) {
      fs.rmSync(this.testProjectRoot, { recursive: true, force: true });
    }
  }

  private async someTest(): Promise<void> {
    // ✅ Uses ISOLATED test directory
    const incrementsDir = path.join(this.testProjectRoot, '.specweave', 'increments');
    fs.mkdirSync(incrementsDir, { recursive: true });
    // No pollution - all in isolated directory!
  }
}
```

---

## Progress Tracker

### Group A: JIRA Integration Tests

| # | File | Status | Notes |
|---|------|--------|-------|
| 1 | `tests/integration/external-tools/jira/jira-incremental-sync.test.ts` | ✅ **DONE** | All 4 refs to `.specweave/` replaced |
| 2 | `tests/integration/external-tools/jira/jira-bidirectional-sync.test.ts` | 🚧 TODO | Similar structure to #1 |
| 3 | `tests/integration/jira-sync/jira-incremental-sync.test.ts` | 🚧 TODO | Duplicate of #1 |
| 4 | `tests/integration/jira-sync/jira-bidirectional-sync.test.ts` | 🚧 TODO | Duplicate of #2 |

### Group B: ML Pipeline Tests

| # | File | Status | Notes |
|---|------|--------|-------|
| 5 | `tests/integration/generators/ml/ml-pipeline-soccer-detection.test.ts` | 🚧 TODO | Uses `.specweave/test-runs/` |
| 6 | `tests/integration/generators/ml/ml-pipeline-real-video.test.ts` | 🚧 TODO | Uses `.specweave/test-runs/` |
| 7 | `tests/integration/ml-pipeline-workflow/ml-pipeline-soccer-detection.test.ts` | 🚧 TODO | Duplicate of #5 |
| 8 | `tests/integration/ml-pipeline-workflow/ml-pipeline-real-video.test.ts` | 🚧 TODO | Duplicate of #6 |

---

## Changes Made to File #1

**File**: `tests/integration/external-tools/jira/jira-incremental-sync.test.ts`

### Added Class Members

```typescript
// ✅ ISOLATED TEST PROJECT (NOT real .specweave/)
private testProjectRoot: string;
```

### Added Constructor Logic

```typescript
// Use isolated test directory OUTSIDE .specweave/
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
this.testProjectRoot = path.join(__dirname, '../../../fixtures', `jira-test-${timestamp}`);
```

### Added Setup Method

```typescript
private async setupTestEnvironment(): Promise<void> {
  console.log('🔧 Setting up isolated test environment...');

  // Create test .specweave/ structure
  const specweaveDir = path.join(this.testProjectRoot, '.specweave');
  const incrementsDir = path.join(specweaveDir, 'increments');
  const docsDir = path.join(specweaveDir, 'docs');
  const rfcsDir = path.join(docsDir, 'rfcs');

  fs.mkdirSync(incrementsDir, { recursive: true });
  fs.mkdirSync(rfcsDir, { recursive: true });

  console.log('✅ Test environment ready\n');
}
```

### Added Cleanup Method

```typescript
private async cleanupTestEnvironment(): Promise<void> {
  console.log('\n🧹 Cleaning up test environment...');

  if (fs.existsSync(this.testProjectRoot)) {
    fs.rmSync(this.testProjectRoot, { recursive: true, force: true });
    console.log('✅ Test environment cleaned');
  }
}
```

### Updated 4 References

**Line 201**: (test4_FindOrCreateTestIncrement)
```typescript
// Before:
const incrementsDir = path.join(process.cwd(), '.specweave', 'increments');

// After:
const incrementsDir = path.join(this.testProjectRoot, '.specweave', 'increments');
```

**Line 391**: (test8_VerifyIncrementStructure)
```typescript
// Before:
const incrementFolder = path.join(process.cwd(), '.specweave', 'increments', this.testIncrementId);

// After:
const incrementFolder = path.join(this.testProjectRoot, '.specweave', 'increments', this.testIncrementId);
```

**Line 460**: (test9_VerifyRFCUpdates)
```typescript
// Before:
const rfcFolder = path.join(process.cwd(), '.specweave', 'docs', 'rfcs');

// After:
const rfcFolder = path.join(this.testProjectRoot, '.specweave', 'docs', 'rfcs');
```

**Line 562**: (test11_VerifyCherryPickStructure)
```typescript
// Before:
const incrementFolder = path.join(process.cwd(), '.specweave', 'increments', this.cherryPickIncrementId);

// After:
const incrementFolder = path.join(this.testProjectRoot, '.specweave', 'increments', this.cherryPickIncrementId);
```

### Updated Cleanup Test

Changed `test12_Cleanup` to actually clean up the test environment:

```typescript
// Clean up test environment
await this.cleanupTestEnvironment();

this.results.push({
  name: testName,
  status: 'PASS',
  duration: Date.now() - start,
  message: 'Test environment cleaned up successfully'
});
```

### Verification

```bash
# Verify no more references to real .specweave/
$ grep -n "process.cwd().*\.specweave" tests/integration/external-tools/jira/jira-incremental-sync.test.ts
# No matches found ✅
```

---

## Remaining Work

### Immediate (Files 2-4: JIRA Tests)

**Same pattern for**:
- `jira-bidirectional-sync.test.ts` (2 locations)

**Steps**:
1. Add `testProjectRoot` member
2. Initialize in constructor with unique timestamp
3. Add `setupTestEnvironment()` and `cleanupTestEnvironment()` methods
4. Find and replace all `process.cwd()/.specweave/` → `this.testProjectRoot/.specweave/`
5. Update cleanup method to call `cleanupTestEnvironment()`
6. Verify with grep

### Next (Files 5-8: ML Pipeline Tests)

**Pattern for ML tests**:
```typescript
// Before:
this.testRunDir = path.join(process.cwd(), '.specweave', 'test-runs', 'ml-pipeline', timestamp);

// After:
this.testRunDir = path.join(__dirname, '../../../fixtures', `ml-test-${timestamp}`);
// Or use tests/tmp/ for large artifacts:
this.testRunDir = path.join(__dirname, '../../../tmp', `ml-test-${timestamp}`);
```

---

## Testing Strategy

### Per-File Testing

After each file refactoring:
```bash
# Verify no references to real .specweave/
grep -n "process\.cwd().*\.specweave" <test-file>
# Should return: No matches found

# Run individual test (if applicable)
npm test -- <test-file>
```

### Final Verification

After all 8 files refactored:
```bash
# 1. Verify NO test files use real .specweave/
grep -r "process\.cwd().*\.specweave" tests/integration/external-tools/jira/
grep -r "process\.cwd().*\.specweave" tests/integration/jira-sync/
grep -r "process\.cwd().*\.specweave" tests/integration/generators/ml/
grep -r "process\.cwd().*\.specweave" tests/integration/ml-pipeline-workflow/
# Should return: No matches found

# 2. Run all integration tests
npm run test:integration

# 3. Verify git status clean
git status .specweave/
# Should show: nothing to commit, working tree clean
```

---

## Success Metrics

✅ **Will be considered complete when**:
- [ ] All 8 files refactored
- [ ] Zero references to `process.cwd()/.specweave/` in integration tests
- [ ] All tests pass independently
- [ ] All tests pass in parallel
- [ ] `git status .specweave/` shows clean working tree
- [ ] No test artifacts in real `.specweave/` folder

---

## Current Status

**Completed**: 1/8 files (12.5%)
**Remaining**: 7 files (87.5%)

**Next File**: `tests/integration/external-tools/jira/jira-bidirectional-sync.test.ts`

---

**Last Updated**: 2025-11-17
**Status**: 🚧 IN PROGRESS
**Expected Completion**: Within 2 hours
