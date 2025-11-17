---
increment: 0040-vitest-living-docs-mock-fixes
total_tasks: 5
completed_tasks: 0
test_mode: standard
coverage_target: 85%
---

# Implementation Tasks

## Overview

Fix remaining Vitest migration issues in living-docs tests by replacing invalid `anyed<>` mock syntax with proper `vi.mocked()` patterns.

---

### T-001: Fix cross-linker.test.ts Mock Syntax

**User Story**: N/A (Technical Debt)
**Acceptance Criteria**: AC-TD-01 (All living-docs tests pass)
**Priority**: P0
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** cross-linker.test.ts uses invalid `anyed<>` syntax for fs-extra mocks
- **When** we replace with `vi.mocked()` pattern
- **Then** all 5 failing tests in "Document Updates" section pass
- **And** mock behavior remains identical (existsSync, readFile, writeFile)

**Test Cases**:
1. **Unit**: `tests/unit/living-docs/cross-linker.test.ts`
   - All existing tests should pass (currently 5 failures)
   - testGenerateLinksToArchitecture(): Verify file mocking works
   - testUpdateDocuments(): Verify writeFile mocking works
   - testDocumentRelationshipDetection(): Verify existsSync mocking works
   - **Coverage Target**: 100% (no new code, just fix existing)

**Implementation**:
1. Open `tests/unit/living-docs/cross-linker.test.ts`
2. Remove lines 18-23 (invalid `anyed<>` type casting):
   ```typescript
   // REMOVE:
   const mockFs = fs as anyed<typeof fs> & {
     readFile: anyedFunction<typeof fs.readFile>;
     writeFile: anyedFunction<typeof fs.writeFile>;
     existsSync: anyedFunction<typeof fs.existsSync>;
   };
   ```
3. Add proper Vitest mocks after imports:
   ```typescript
   // ADD:
   const mockReadFile = vi.mocked(fs.readFile);
   const mockWriteFile = vi.mocked(fs.writeFile);
   const mockExistsSync = vi.mocked(fs.existsSync);
   ```
4. Replace all `mockFs.existsSync` → `mockExistsSync` (throughout file)
5. Replace all `mockFs.readFile` → `mockReadFile`
6. Replace all `mockFs.writeFile` → `mockWriteFile`
7. Verify mock setup in beforeEach (lines 35-41) still works
8. Run tests: `npm run test:unit -- tests/unit/living-docs/cross-linker.test.ts`
9. Verify all tests pass (should fix 5 failures)
10. Check no TypeScript errors: `npm run build`

**Validation**:
- All tests in cross-linker.test.ts pass: ✅
- No TypeScript compilation errors: ✅
- Mock behavior identical to before: ✅

---

### T-002: Fix project-detector.test.ts Mock Syntax

**User Story**: N/A (Technical Debt)
**Acceptance Criteria**: AC-TD-01
**Priority**: P0
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** project-detector.test.ts uses invalid `anyed<>` syntax and has execSync mock issues
- **When** we fix mock syntax and execSync implementation
- **Then** all 4 failing tests in fallback logic section pass
- **And** "Not a git repository" error handling works correctly

**Test Cases**:
1. **Unit**: `tests/unit/living-docs/project-detector.test.ts`
   - All existing tests should pass (currently 4 failures)
   - testDetectProjectFallback(): Verify execSync error handling
   - testLoadProjectsFromConfig(): Verify readFileSync mocking
   - testHandleInvalidConfig(): Verify error handling
   - **Coverage Target**: 100%

**Implementation**:
1. Open `tests/unit/living-docs/project-detector.test.ts`
2. Remove lines 21-27 (invalid `anyed<>` type casting):
   ```typescript
   // REMOVE:
   const mockFs = fs as anyed<typeof fs> & {
     existsSync: anyedFunction<typeof fs.existsSync>;
     readJSON: anyedFunction<typeof fs.readJSON>;
     readFile: anyedFunction<typeof fs.readFile>;
     writeFile: anyedFunction<typeof fs.writeFile>;
     ensureDir: anyedFunction<typeof fs.ensureDir>;
   };
   ```
3. Add proper Vitest mocks:
   ```typescript
   // ADD:
   const mockExistsSync = vi.mocked(fs.existsSync);
   const mockReadJSON = vi.mocked(fs.readJSON);
   const mockReadFile = vi.mocked(fs.readFile);
   const mockWriteFile = vi.mocked(fs.writeFile);
   const mockEnsureDir = vi.mocked(fs.ensureDir);
   const mockExecSync = vi.mocked(execSync);
   ```
4. Replace all `mockFs.*` references with individual mocks
5. Verify execSync mock (lines 40-42) returns proper error:
   ```typescript
   mockExecSync.mockImplementation(() => {
     throw new Error('Not a git repository');
   });
   ```
6. Verify readFileSync mock returns valid JSON string (line 93):
   ```typescript
   mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
   // Should become:
   vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));
   ```
7. Run tests: `npm run test:unit -- tests/unit/living-docs/project-detector.test.ts`
8. Fix any additional mock issues revealed by test output
9. Verify all 4 failures are resolved

**Validation**:
- All tests pass: ✅
- execSync error handling works: ✅
- Config loading works: ✅

---

### T-003: Fix content-distributor.test.ts Mock Syntax

**User Story**: N/A (Technical Debt)
**Acceptance Criteria**: AC-TD-01
**Priority**: P0
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** content-distributor.test.ts uses invalid `anyed<>` syntax for fs-extra
- **When** we replace with `vi.mocked()` pattern for all 6 mock methods
- **Then** all 3 failing tests pass
- **And** file distribution and archiving mocks work correctly

**Test Cases**:
1. **Unit**: `tests/unit/living-docs/content-distributor.test.ts`
   - All existing tests should pass (currently 3 failures)
   - testDistributeSections(): Verify ensureDir + writeFile
   - testArchiveOriginal(): Verify archive path mocking
   - testSkipUnchangedFiles(): Verify readFile comparison
   - **Coverage Target**: 100%

**Implementation**:
1. Open `tests/unit/living-docs/content-distributor.test.ts`
2. Remove lines 22-29 (invalid `anyed<>` type casting):
   ```typescript
   // REMOVE:
   const mockFs = fs as anyed<typeof fs> & {
     readFile: anyedFunction<typeof fs.readFile>;
     writeFile: anyedFunction<typeof fs.writeFile>;
     existsSync: anyedFunction<typeof fs.existsSync>;
     readdir: anyedFunction<typeof fs.readdir>;
     readJSON: anyedFunction<typeof fs.readJSON>;
     ensureDir: anyedFunction<typeof fs.ensureDir>;
   };
   ```
3. Add proper Vitest mocks:
   ```typescript
   // ADD:
   const mockReadFile = vi.mocked(fs.readFile);
   const mockWriteFile = vi.mocked(fs.writeFile);
   const mockExistsSync = vi.mocked(fs.existsSync);
   const mockReaddir = vi.mocked(fs.readdir);
   const mockReadJSON = vi.mocked(fs.readJSON);
   const mockEnsureDir = vi.mocked(fs.ensureDir);
   ```
4. Replace all `mockFs.*` references throughout file
5. Verify async mock usage:
   - `mockReadFile.mockResolvedValue('')` (line 45)
   - `mockWriteFile.mockResolvedValue(undefined)` (line 44)
   - `mockEnsureDir.mockResolvedValue(undefined)` (line 43)
6. Verify sync mock usage:
   - `mockExistsSync.mockReturnValue(false)` (line 42)
7. Check cast removals: `(mockFs.readFile as any)` → `mockReadFile` (lines 164, 176, 204, etc.)
8. Run tests: `npm run test:unit -- tests/unit/living-docs/content-distributor.test.ts`
9. Verify all 3 failures resolved

**Validation**:
- All tests pass: ✅
- File write operations mocked correctly: ✅
- Archive operations work: ✅

---

### T-004: Fix three-layer-sync.test.ts and hierarchy-mapper-project-detection.test.ts

**User Story**: N/A (Technical Debt)
**Acceptance Criteria**: AC-TD-01
**Priority**: P0
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** three-layer-sync.test.ts has execSync mock issues (already uses vi.mocked)
- **And** hierarchy-mapper-project-detection.test.ts uses `anyed<>` syntax
- **When** we fix execSync return types and mock syntax
- **Then** all 5 combined failures (4 + 1) pass
- **And** GitHub sync mocking works correctly

**Test Cases**:
1. **Unit**: `tests/unit/living-docs/three-layer-sync.test.ts`
   - testSyncGitHubToIncrement(): execSync returns string content
   - testValidateCode(): Verify fs/promises mocking
   - **Coverage Target**: 100%

2. **Unit**: `tests/unit/living-docs/hierarchy-mapper-project-detection.test.ts`
   - All tests should pass after mock syntax fix
   - **Coverage Target**: 100%

**Implementation**:
1. **three-layer-sync.test.ts**:
   - File already uses `vi.mocked()` correctly (lines 16-17)
   - Issue likely in execSync return value (line 32-42)
   - Fix execSync mock to return string (not Buffer):
     ```typescript
     vi.mocked(execSync).mockReturnValue(`...content...` as any);
     // Or better:
     vi.mocked(execSync).mockReturnValueOnce(Buffer.from('...content...'));
     ```
   - Verify fs/promises mocks use `mockResolvedValue` (async)
   - Run tests: `npm run test:unit -- tests/unit/living-docs/three-layer-sync.test.ts`

2. **hierarchy-mapper-project-detection.test.ts**:
   - Grep found `anyed` pattern in this file
   - Open file and identify mock declarations
   - Replace `anyed<>` syntax with `vi.mocked()` (same as T-001 to T-003)
   - Run tests: `npm run test:unit -- tests/unit/living-docs/hierarchy-mapper-project-detection.test.ts`

3. Verify both files pass all tests

**Validation**:
- three-layer-sync.test.ts: All tests pass ✅
- hierarchy-mapper-project-detection.test.ts: All tests pass ✅
- execSync mocking works correctly ✅

---

### T-005: Validate All Living Docs Tests Pass

**User Story**: N/A (Technical Debt)
**Acceptance Criteria**: AC-TD-01
**Priority**: P0
**Estimate**: 1 hour
**Status**: [ ] pending

**Test Plan**:
- **Given** all 5 test files have been fixed
- **When** we run the complete living-docs test suite
- **Then** 100% of tests pass (no failures)
- **And** coverage is maintained at >80%
- **And** CI/CD pipeline passes

**Test Cases**:
1. **Integration**: Full living-docs test suite
   - Run all tests: `npm run test:unit -- tests/unit/living-docs/`
   - Verify 0 failures, 0 skipped
   - Check coverage report
   - **Coverage Target**: >80% (maintain existing)

**Implementation**:
1. Run full living-docs test suite:
   ```bash
   npm run test:unit -- tests/unit/living-docs/
   ```
2. Verify output shows 100% pass rate:
   ```
   Test Files: 13 passed (13)
   Tests: XXX passed (XXX)
   ```
3. Check coverage:
   ```bash
   npm run test:coverage -- tests/unit/living-docs/
   ```
4. Verify coverage ≥80% for:
   - cross-linker.ts
   - project-detector.ts
   - content-distributor.ts
   - ThreeLayerSyncManager.ts
   - hierarchy-mapper.ts
5. Run full test suite to ensure no regressions:
   ```bash
   npm test
   ```
6. Verify no new failures in other test files
7. Check TypeScript compilation:
   ```bash
   npm run build
   ```
8. Update increment status to "completed"

**Validation**:
- Living docs tests: 100% pass ✅
- Overall unit tests: No new failures ✅
- Coverage: ≥80% maintained ✅
- Build: No TypeScript errors ✅
- CI/CD: Pipeline passes ✅

**Documentation**:
- Update spec.md with completion status
- Create completion report in `reports/` folder
- Document common mock patterns for future reference

---

## Summary

**Total Tasks**: 5
**Estimated Time**: 9 hours
**Critical Path**: T-001 → T-002 → T-003 → T-004 → T-005

**Test Coverage**: Each task validates its changes immediately, with T-005 as final integration validation.

**Success Metrics**:
- 0 test failures in living-docs suite
- 100% pass rate (currently ~12% failing)
- Coverage maintained >80%
- No production code changes required
