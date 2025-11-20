---
increment: 0040-vitest-living-docs-mock-fixes
status: draft
created: 2025-11-17
priority: P0
estimated_effort: 8-12 hours
---

# Technical Plan: Fix Vitest Migration Issues in Living Docs Tests

## Overview

Fix remaining Vitest migration failures in the living-docs test suite. Currently 80 test files fail (210/1811 tests), with most failures concentrated in 5 key test files in the `tests/unit/living-docs/` directory.

## Problem Analysis

### Root Causes

1. **Mock Type Syntax**: Tests use invalid `anyed<>` type syntax instead of Vitest's `vi.mocked()`
   - Pattern: `fs as anyed<typeof fs>` → Should be: `vi.mocked(fs)`
   - Affects: All 5 failing test files

2. **Mock Configuration Issues**:
   - `existsSync`, `execSync`, and path mocking inconsistencies
   - Vitest requires explicit mock implementations vs Jest auto-mocking

3. **Import Path Issues**: Some tests may have incorrect relative imports

### Affected Test Files

Based on user context and grep results:

1. **cross-linker.test.ts** (5 failures - Document Updates section)
   - Lines 18-23: Invalid `anyed<typeof fs>` syntax
   - Mock configuration for fs-extra (existsSync, readFile, writeFile)

2. **project-detector.test.ts** (4 failures - fallback logic)
   - Lines 21-27: Invalid `anyed<typeof fs>` syntax
   - execSync mock implementation (line 40-42)
   - readFileSync mock for config loading

3. **content-distributor.test.ts** (3 failures)
   - Lines 22-29: Invalid `anyed<typeof fs>` syntax
   - Multiple fs-extra mock methods

4. **three-layer-sync.test.ts** (4 failures)
   - Simpler: only fs/promises and child_process mocks
   - Uses proper `vi.mocked()` syntax already (lines 16-17)
   - Likely has different issues (execSync/readFile implementation)

5. **hierarchy-mapper-project-detection.test.ts** (1 failure)
   - Contains `anyed` pattern (from grep results)

## Technical Architecture

### Vitest Mocking Pattern (Correct)

```typescript
// Import mocks BEFORE imports that use them
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock module
vi.mock('fs-extra');

// Import after mocking
import fs from 'fs-extra';

// Type-safe mocked functions
const mockReadFile = vi.mocked(fs.readFile);
const mockWriteFile = vi.mocked(fs.writeFile);
const mockExistsSync = vi.mocked(fs.existsSync);

// Usage in tests
beforeEach(() => {
  vi.clearAllMocks();
  mockExistsSync.mockReturnValue(true);
  mockReadFile.mockResolvedValue('content');
});
```

### Jest Pattern (Incorrect - What We Have)

```typescript
// ❌ WRONG - Invalid syntax
vi.mock('fs-extra');
const mockFs = fs as anyed<typeof fs> & {
  existsSync: anyedFunction<typeof fs.existsSync>;
  readFile: anyedFunction<typeof fs.readFile>;
};

// Usage
mockFs.existsSync.mockReturnValue(true);
```

## Implementation Strategy

### Phase 1: Fix Mock Type Syntax (T-001 to T-003)

For each affected file:
1. Remove `anyed<>` type casting
2. Replace with `vi.mocked()` for each mock method
3. Update all mock usage to use the typed mocks
4. Verify imports are in correct order (vi.mock before imports)

### Phase 2: Fix Mock Implementations (T-004)

1. **execSync mocking** (project-detector, three-layer-sync):
   - Ensure proper error handling for "Not a git repository"
   - Return type should match execSync return type (Buffer | string)

2. **fs-extra mocking**:
   - existsSync: Use `vi.mocked(fs.existsSync)` with `mockReturnValue()`
   - readFile/writeFile: Use `mockResolvedValue()` for async
   - readFileSync: Use `mockReturnValue()` for sync

3. **Path mocking**: Verify relative path calculations in tests

### Phase 3: Validation (T-005)

1. Run all living-docs unit tests
2. Verify 100% pass rate
3. Check coverage is maintained (>80%)
4. Update test snapshots if needed

## Test Strategy

**Test Coverage Targets**:
- Unit tests: 100% pass rate (currently ~88% failing in living-docs)
- Integration tests: No impact expected
- E2E tests: No impact expected

**Verification Process**:
```bash
# Run all living-docs tests
npm run test:unit -- tests/unit/living-docs/

# Run specific test file
npm run test:unit -- tests/unit/living-docs/cross-linker.test.ts

# Check coverage
npm run test:coverage -- tests/unit/living-docs/
```

## Dependencies

**Prerequisites**:
- ✅ Vitest is already installed and configured
- ✅ 14 tests already fixed (documented in previous work)
- ✅ Test infrastructure is working

**No External Dependencies**: This is purely a test fix, no production code changes.

## Risk Assessment

**Low Risk**:
- Only test code changes
- No production code modifications
- Can verify each file individually
- Easy rollback if issues arise

**Time Estimates**:
- T-001 (cross-linker): 2 hours (5 mock methods, complex test scenarios)
- T-002 (project-detector): 2 hours (execSync edge cases, config loading)
- T-003 (content-distributor): 2 hours (multiple fs operations)
- T-004 (three-layer-sync + hierarchy): 2 hours (execSync + simpler mocks)
- T-005 (validation): 1 hour (run full suite, verify coverage)

**Total**: 9 hours (within 8-12 hour estimate)

## Success Criteria

1. ✅ All 5 failing test files pass 100% of tests
2. ✅ Overall unit test pass rate: 100% (1811/1811)
3. ✅ No new test failures introduced
4. ✅ Coverage maintained at >80%
5. ✅ All tests use Vitest-compatible mock syntax
6. ✅ CI/CD pipeline passes without warnings

## Rollback Plan

If issues arise:
1. Revert individual test file changes (git checkout)
2. Each file is independent - can be fixed separately
3. No impact on production code or other test suites

## Future Improvements

After this increment:
- Consider creating a test utilities module for common mock patterns
- Document Vitest mocking patterns in CONTRIBUTING.md
- Add pre-commit hook to catch `anyed` syntax
