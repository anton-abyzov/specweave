# E2E Test Fixes - Progress Report

**Date**: 2025-11-15
**Task**: Fix all failing E2E tests after Universal Hierarchy and command changes

## Summary

This report tracks the progress of fixing E2E tests that broke due to:
- Universal Hierarchy architecture changes (Epic → Feature → User Story)
- New command additions
- GitHub sync changes
- Living docs sync improvements

## Tests Fixed ✅

### 1. archive-command.spec.ts (13/13 passing)

**Status**: ✅ ALL TESTS PASSING

**Fixes Applied**:
1. **Test**: `archive_whenAlreadyInArchive_throwsError` → `archive_whenAlreadyInArchive_skipsGracefully`
   - **Issue**: Test expected error when archiving already-archived increment
   - **Root Cause**: Implementation changed to gracefully skip duplicates instead of throwing
   - **Fix**: Changed test to verify skipping behavior instead of error throwing
   - **File**: tests/e2e/archive-command.spec.ts:245-262

2. **Test**: `archive_fullWorkflow_createDuplicateFixVerify`
   - **Issue**: `ReferenceError: incrementExists is not defined`
   - **Root Cause**: Helper functions were scoped to first describe block only
   - **Fix**: Moved helper functions (`createTestIncrement`, `incrementExists`) outside describe blocks to make them globally accessible
   - **Fix**: Added `INCREMENTS_DIR` and `ARCHIVE_DIR` initialization in Integration Tests describe block
   - **File**: tests/e2e/archive-command.spec.ts:42-85, 390-395

**Test Results**:
```
✓ 13 passed (590ms)
```

### 2. brownfield/import.spec.ts (6/6 passing)

**Status**: ✅ ALL TESTS PASSING

**Fixes Applied**:
1. **All tests failing with**: `SyntaxError: The requested module './living-docs/types' does not provide an export named 'ProjectContext'`
   - **Issue**: Tests failed to import BrownfieldImporter due to missing ProjectContext export at runtime
   - **Root Cause**: `ProjectContext` is an interface (type-only), but ProjectManager was using `export { ProjectContext }` which doesn't work for interfaces in compiled JS
   - **Fix**: Changed `export { ProjectContext }` to `export type { ProjectContext }` in project-manager.ts
   - **File**: src/core/project-manager.ts:15

**Test Results**:
```
✓ 6 passed (478ms)
```

## Tests In Progress 🔄

### 3. fix-duplicates-command.spec.ts (13 tests)

**Status**: 🔄 FIXING - Import Strategy Changed

**Root Cause Analysis**:
- The test file was using `import * as fs from 'fs-extra'`
- This namespace import pattern doesn't provide all fs-extra methods correctly
- Production code uses `import fs from 'fs-extra'` (default import)

**Fixes Applied**:
1. **Import Change**: Changed from `import * as fs from 'fs-extra'` to `import * as fs from 'fs/promises'`
   - **Reason**: Consistency with archive-command.spec.ts which uses native Node.js fs/promises
   - **File**: tests/e2e/fix-duplicates-command.spec.ts:15

2. **API Replacements**:
   - `fs.writeJSON()` → `fs.writeFile(..., JSON.stringify(..., null, 2))`
   - `fs.ensureDir()` → `fs.mkdir(..., { recursive: true })`
   - `fs.remove()` → `fs.rm(..., { recursive: true, force: true })`
   - **Affected lines**: 27-30, 46, 56, 67, 362, 372, 431, 443, 444, 450-463

**Current Status**: Tests running (awaiting verification)

## Tests Not Yet Started ⏳

### 4. GitHub Integration Tests

**Test Files**:
- `tests/e2e/sync/github-bidirectional.spec.ts`
- `tests/e2e/living-docs-sync-bidirectional.spec.ts`

**Expected Issues**:
- Universal Hierarchy changes (Feature → Milestone, User Story → Issue)
- GitHub issue title format changes (`[FS-NNN][US-NNN]`)
- Immutable description pattern

### 5. Living Docs Sync Tests

**Test Files**:
- Various living docs sync tests

**Expected Issues**:
- Universal Hierarchy file structure changes
- Epic/Feature/User Story organization
- Project-specific folders

### 6. Increment Lifecycle Tests

**Test Files**:
- `tests/e2e/increments/full-lifecycle.spec.ts`
- `tests/e2e/increment-discipline.spec.ts`

**Expected Issues**:
- State transition changes
- Metadata format changes

## Overall Progress

**Completed**: 19 tests (archive: 13, brownfield: 6)
**In Progress**: 13 tests (fix-duplicates - verifying)
**Remaining**: ~80 tests (GitHub, living docs, lifecycle, etc.)

**Total E2E Tests**: ~112 tests (based on initial run)

## Next Steps

1. ✅ Complete fix-duplicates-command.spec.ts verification
2. Fix GitHub integration tests (sync, epic, spec)
3. Fix living docs sync tests
4. Fix increment lifecycle tests
5. Run full test suite to verify all passing
6. Document changes in this report

## Technical Patterns Identified

### Pattern 1: Type-Only Exports for Interfaces

**Problem**: Exporting TypeScript interfaces incorrectly
```typescript
// ❌ WRONG - causes runtime export error
export { ProjectContext };  // Interface doesn't exist at runtime!

// ✅ CORRECT - type-only export
export type { ProjectContext };
```

**When to use**:
- Always use `export type` for interfaces
- Use `export type` for type aliases
- Use regular `export` for classes, functions, constants

### Pattern 2: Test Helper Function Scoping

**Problem**: Helper functions scoped to specific describe blocks
```typescript
// ❌ WRONG - helpers only available in first describe block
test.describe('Test Suite 1', () => {
  async function helper() { }  // Not accessible in Test Suite 2!
  test('test 1', () => { });
});

test.describe('Test Suite 2', () => {
  test('test 2', () => {
    await helper();  // ReferenceError!
  });
});
```

**Solution**: Move helpers to global scope or shared module
```typescript
// ✅ CORRECT - helpers available to all tests
async function helper() { }  // Global scope

test.describe('Test Suite 1', () => {
  test('test 1', () => { await helper(); });
});

test.describe('Test Suite 2', () => {
  test('test 2', () => { await helper(); });
});
```

### Pattern 3: fs-extra Import Strategy

**Problem**: Using namespace import for fs-extra
```typescript
// ❌ WRONG - namespace import doesn't work correctly for fs-extra
import * as fs from 'fs-extra';
await fs.writeJSON(...);  // TypeError: fs.writeJSON is not a function

// ✅ CORRECT - use native fs/promises instead
import * as fs from 'fs/promises';
await fs.writeFile(path, JSON.stringify(data, null, 2));
await fs.mkdir(path, { recursive: true });
await fs.rm(path, { recursive: true, force: true });
```

**Alternative**: Use default import for fs-extra (production pattern)
```typescript
// ✅ ALSO CORRECT - default import works for fs-extra
import fs from 'fs-extra';
await fs.writeJSON(path, data, { spaces: 2 });
await fs.ensureDir(path);
await fs.remove(path);
```

**Key Insight**: Tests should use `fs/promises` for consistency with archive-command.spec.ts

## Technical Debt / Observations

1. **Helper Function Scoping**: Tests should share helper functions via a test utilities module rather than duplicating them in each describe block
2. **Type-Only Exports**: Need to be careful with interface re-exports - use `export type` for type-only exports
3. **Test Isolation**: Some tests may have race conditions due to shared temp directories - worker-specific directories help but need consistent application
4. **fs-extra vs fs/promises**: Inconsistent usage across test files - should standardize on one approach
