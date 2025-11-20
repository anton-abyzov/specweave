# ULTRATHINK: Test Deletion Investigation

## Problem Statement

A unit test is deleting everything from `.specweave/increments` and `.specweave/docs` folders!!!

## Investigation Strategy

### 1. Characteristics of the Destructive Test
- Most likely linked to "sync living docs"
- Deletes `.specweave/increments` and `.specweave/docs`
- Must be using the REAL `.specweave/` directory instead of isolated test directory

### 2. Test Patterns Analyzed

**SAFE Pattern** (All tests reviewed so far):
```typescript
// Pattern 1: Explicit test directory
testDir = path.join(__dirname, '__test_data__');
// Creates: tests/integration/living-docs/__test_data__/.specweave/

// Pattern 2: Temp directory with timestamp
testDir = path.join(process.cwd(), 'tests', 'tmp', `sync-test-${Date.now()}`);
// Creates: <project-root>/tests/tmp/sync-test-12345/.specweave/

// Pattern 3: Fixtures folder
testDir = path.join(__dirname, '../../fixtures/temp-distributor-tasks-test');
// Creates: tests/fixtures/temp-distributor-tasks-test/.specweave/
```

**DANGEROUS Pattern** (What we're looking for):
```typescript
// Direct reference to .specweave/ without test directory
const incrementPath = '.specweave/increments/0001-test';

// OR: Wrong path resolution
testDir = '.';  // Current directory = project root!
await fs.remove(path.join(testDir, '.specweave'));  // DELETES REAL DATA!

// OR: Missing testDir variable
beforeEach(async () => {
  // testDir not set properly
});
afterEach(async () => {
  await fs.remove('.specweave');  // DANGER!
});
```

### 3. Tests Reviewed (ALL SAFE)

1. ✅ `tests/unit/living-docs/spec-distributor.test.ts`
   - Uses: `.specweave/test-living-docs` (isolated)

2. ✅ `tests/integration/living-docs/intelligent-sync.test.ts`
   - Uses: `__dirname/__test_data__` (isolated)

3. ✅ `tests/integration/core/living-docs/intelligent-sync.test.ts`
   - Uses: `__dirname/__test_data__` (isolated)

4. ✅ `tests/integration/living-docs/spec-distributor-tasks.test.ts`
   - Uses: `__dirname/../../fixtures/temp-distributor-tasks-test` (isolated)

5. ✅ `tests/integration/core/living-docs/spec-distributor-tasks.test.ts`
   - Uses: `__dirname/../../fixtures/temp-distributor-tasks-test` (isolated)

6. ✅ `tests/integration/living-docs-sync/bidirectional-sync.test.ts`
   - Uses: `process.cwd()/tests/tmp/sync-test-${Date.now()}` (isolated)

### 4. Root Cause Hypothesis

**Hypothesis #1: Path Resolution Bug**
- A test creates `testDir` but it resolves to project root `.`
- Example: `testDir = path.resolve('.')` → project root
- Cleanup: `await fs.remove(path.join(testDir, '.specweave'))` → DELETES REAL DATA!

**Hypothesis #2: Missing testDir in beforeEach**
- `beforeEach` fails to set `testDir`
- `testDir` remains `undefined` or empty string
- Cleanup uses fallback path that targets real `.specweave/`

**Hypothesis #3: SpecDistributor Constructor Bug**
- Constructor accepts `basePath` parameter
- If `basePath` is `.` or empty, operates on real `.specweave/`
- Test doesn't pass explicit basePath

**Hypothesis #4: Duplicate Test Files**
- Found duplicate test files in different locations
- One copy might have buggy path resolution
- File paths:
  - `tests/integration/living-docs/spec-distributor-tasks.test.ts`
  - `tests/integration/core/living-docs/spec-distributor-tasks.test.ts`

### 5. Next Investigation Steps

1. ✅ Search for tests with `fs.remove('.specweave')`
2. ✅ Search for tests with `testDir = '.'`
3. ✅ Search for tests using `SpecDistributor` without basePath
4. ✅ Check if SpecDistributor has any cleanup/delete methods
5. ❌ Run tests in isolation to reproduce the issue
6. ❌ Add defensive checks to SpecDistributor
7. ❌ Add test safeguards to prevent deletion

### 6. Key Finding

**SpecDistributor.ts Analysis**:
- NO delete operations in the class
- Only reads and writes files
- Constructor in tests: `new SpecDistributor(testDir)`
- If `testDir` is wrong, file operations target wrong directory!

### 7. Critical Test Pattern to Find

```typescript
// DANGEROUS: Constructor without explicit basePath
new SpecDistributor();  // Uses default basePath (might be project root!)

// OR: Wrong basePath
new SpecDistributor('.');  // Explicitly uses project root!

// OR: testDir not initialized
let testDir: string;  // undefined!
beforeEach(async () => {
  // Forgot to set testDir
});
new SpecDistributor(testDir);  // testDir is undefined!
```

## ACTION: Run Targeted Search

Need to find tests that:
1. Use `SpecDistributor` WITHOUT passing `testDir`
2. Use `.` as testDir
3. Have empty/undefined `testDir` in `beforeEach`

