---
increment: 0032-prevent-increment-number-gaps
total_tasks: 15
completed_tasks: 0
test_mode: TDD
coverage_target: 95%
---

# Implementation Tasks

## Phase 1: Core Utility (Priority P1)

### T-001: Create IncrementNumberManager Class Structure

**User Story**: [US-001: Scan All Increment Directories (P1 - Critical)](../../docs/internal/specs/default/FS-032/us-001-scan-all-increment-directories-p1-critical.md)
**AC**: AC-US1-01, AC-US1-02
**Priority**: P1
**Estimate**: 1 hour
**Status**: [x] (100% - Completed)

**Test Plan**:
- **Given** a new TypeScript project with existing increment structure
- **When** IncrementNumberManager is imported and instantiated
- **Then** the class should be available with all public methods
- **And** private cache should be initialized as empty Map

**Test Cases**:
1. **Unit**: `tests/unit/increment-utils.test.ts`
   - testClassStructure(): Verify class exports and method signatures
   - testCacheInitialization(): Verify cache starts empty
   - testStaticMethods(): Verify all methods are static
   - **Coverage Target**: 100% (class structure)

**Overall Coverage Target**: 100%

**Implementation**:
1. Create file: `src/core/increment-utils.ts`
2. Define IncrementNumberManager class with static methods
3. Add private cache: Map<string, number>
4. Add CACHE_TTL constant (5000ms)
5. Define method signatures:
   - `getNextIncrementNumber(projectRoot?, useCache?): string`
   - `incrementNumberExists(incrementNumber, projectRoot?): boolean`
   - `clearCache(): void`
   - `scanAllIncrementDirectories(incrementsDir): number` (private)
6. Add TypeScript type definitions and JSDoc comments
7. Build project: `npm run build`
8. Verify compilation: Check `dist/src/core/increment-utils.js` exists

**TDD Workflow**:
1. Write test for class structure (should fail)
2. Run tests: `npm test increment-utils.test` (0/3 passing)
3. Implement class skeleton
4. Run tests: `npm test increment-utils.test` (3/3 passing)
5. Refactor: Add JSDoc comments
6. Final check: Coverage 100%

---
### T-002: Implement Comprehensive Directory Scanning Logic

**User Story**: Core infrastructure for increment number management
**Acceptance Criteria**: AC-US1-01 (Scan all directories), AC-US1-03 (Handle 3-digit and 4-digit IDs)
**Priority**: P1
**Estimate**: 1.5 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** increments exist in main and _archive directories
- **When** scanAllIncrementDirectories() is called
- **Then** it should find the highest increment number across both directories
- **And** handle both 3-digit (001) and 4-digit (0001) formats
- **And** log which directory contained the highest number

**Test Cases**:
1. **Unit**: `tests/unit/increment-utils.test.ts`
   - testScanMainDirectory(): Finds increments in main directory
   - testScanArchiveDirectory(): Finds increments in _archive/
   - testFindHighestAcrossAll(): Returns highest from both directories
   - testHandle3DigitIDs(): Correctly parses 001-feature format
   - testHandle4DigitIDs(): Correctly parses 0001-feature format
   - testHandleMixedFormats(): Handles mix of 3-digit and 4-digit
   - testGracefulMissingDirs(): Continues when subdirectories missing
   - testIgnoreInvalidFolders(): Skips folders without number prefix
   - testEmptyDirectories(): Returns 0 when all directories empty
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. Implement `scanAllIncrementDirectories(incrementsDir: string): number`
2. Define directories to scan: main, _archive
3. For each directory:
   - Check if exists using fs.existsSync()
   - If missing, continue gracefully
   - Read entries using fs.readdirSync()
   - Match pattern: /^(\d{3,4})-/
   - Parse number and track highest
   - Log highest number found with directory label
4. Return highest number (0 if none found)
5. Add error handling for permission issues
6. Write unit tests: 9 test cases
7. Run tests: `npm test increment-utils.test` (should pass: 9/9)
8. Verify coverage: `npm run coverage` (should be 95%+)

**TDD Workflow**:
1. Write all 9 tests above (should fail)
2. Run tests: `npm test increment-utils.test` (0/9 passing)
3. Implement scanAllIncrementDirectories() step-by-step
4. Run tests: `npm test increment-utils.test` (9/9 passing)
5. Refactor: Extract directory list to constant
6. Final check: Coverage 95%+

---

### T-003: Implement getNextIncrementNumber with Caching

**User Story**: Core infrastructure for increment number management
**Acceptance Criteria**: AC-US1-01 (Next number generation), AC-US1-04 (Caching with TTL)
**Priority**: P1
**Estimate**: 1 hour
**Status**: [ ] pending

**Test Plan**:
- **Given** a project with existing increments
- **When** getNextIncrementNumber() is called
- **Then** it should return the next available 4-digit increment number
- **And** cache the result for 5 seconds
- **And** return cached value on repeated calls within TTL
- **And** respect useCache=false parameter to bypass cache

**Test Cases**:
1. **Unit**: `tests/unit/increment-utils.test.ts`
   - testReturns4DigitFormat(): Output is always 4 digits (0001, not 1)
   - testReturnsNextNumber(): Returns highest + 1
   - testUsesCacheOnRepeatedCalls(): Second call uses cache (no filesystem scan)
   - testRespectsUseCacheFalse(): Bypasses cache when useCache=false
   - testCacheExpiresAfterTTL(): Cache clears after 5 seconds
   - testDefaultProjectRoot(): Uses process.cwd() when not specified
   - testCustomProjectRoot(): Uses provided project root
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. Implement `getNextIncrementNumber(projectRoot = process.cwd(), useCache = true): string`
2. Construct incrementsDir path: `path.join(projectRoot, '.specweave', 'increments')`
3. Cache logic:
   - If useCache is true, check cache.get(incrementsDir)
   - If cached value exists, return padded string
   - If cache miss or useCache=false, continue
4. Call scanAllIncrementDirectories(incrementsDir)
5. Calculate next = highest + 1
6. Update cache: cache.set(incrementsDir, next)
7. Set TTL: setTimeout(() => cache.delete(incrementsDir), CACHE_TTL)
8. Return String(next).padStart(4, '0')
9. Write unit tests: 7 test cases (use Jest fake timers for TTL test)
10. Run tests: `npm test increment-utils.test` (should pass: 7/7)
11. Verify coverage: `npm run coverage` (should be 95%+)

**TDD Workflow**:
1. Write all 7 tests above (should fail)
2. Run tests: `npm test increment-utils.test` (0/7 passing)
3. Implement getNextIncrementNumber() step-by-step
4. Run tests: `npm test increment-utils.test` (7/7 passing)
5. Refactor: Extract padding logic to helper
6. Final check: Coverage 95%+

---

### T-004: Implement incrementNumberExists Validation

**User Story**: Core infrastructure for increment number management
**Acceptance Criteria**: AC-US1-01 (Existence check), AC-US1-03 (ID normalization)
**Priority**: P1
**Estimate**: 1 hour
**Status**: [ ] pending

**Test Plan**:
- **Given** increments exist across main and subdirectories
- **When** incrementNumberExists() is called with a number
- **Then** it should return true if the number exists ANYWHERE
- **And** normalize 3-digit to 4-digit for comparison (001 equals 0001)
- **And** return false if the number doesn't exist

**Test Cases**:
1. **Unit**: `tests/unit/increment-utils.test.ts`
   - testDetectsInMainDirectory(): Finds increment in main directory
   - testDetectsInAbandonedDirectory(): Finds increment in _archive/
   - testDetectsInPausedDirectory(): Finds increment in _archive/
   - testNormalizes3DigitTo4Digit(): '001' matches '0001-feature'
   - testAcceptsStringInput(): Works with '0032' string
   - testAcceptsNumberInput(): Works with 32 number
   - testReturnsFalseForNonExistent(): Returns false when not found
   - testHandlesMissingSubdirectories(): Graceful when subdirs missing
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. Implement `incrementNumberExists(incrementNumber: string | number, projectRoot = process.cwd()): boolean`
2. Normalize input: `const normalized = String(incrementNumber).padStart(4, '0')`
3. Construct incrementsDir path
4. Define directories to check: main, _archive, _archive
5. For each directory:
   - Check if exists using fs.existsSync()
   - If missing, continue
   - Read entries using fs.readdirSync()
   - Match pattern: /^(\d{3,4})-/
   - Normalize matched number to 4 digits
   - Compare with normalized input
6. Return true if any match found, false otherwise
7. Write unit tests: 8 test cases
8. Run tests: `npm test increment-utils.test` (should pass: 8/8)
9. Verify coverage: `npm run coverage` (should be 95%+)

**TDD Workflow**:
1. Write all 8 tests above (should fail)
2. Run tests: `npm test increment-utils.test` (0/8 passing)
3. Implement incrementNumberExists() step-by-step
4. Run tests: `npm test increment-utils.test` (8/8 passing)
5. Refactor: Extract directory list constant
6. Final check: Coverage 95%+

---

### T-005: Implement Cache Management

**User Story**: Core infrastructure for increment number management
**Acceptance Criteria**: AC-US1-04 (Cache control)
**Priority**: P1
**Estimate**: 0.5 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** cached increment numbers exist
- **When** clearCache() is called
- **Then** all cache entries should be removed
- **And** subsequent calls should trigger fresh filesystem scans

**Test Cases**:
1. **Unit**: `tests/unit/increment-utils.test.ts`
   - testClearCacheRemovesAllEntries(): Cache is empty after clear
   - testClearCacheForcesFreshScan(): Next call scans filesystem
   - testMultipleProjectCaches(): Can cache multiple projects simultaneously
   - testCacheSizeLimit(): No memory leak (entries auto-expire)
   - **Coverage Target**: 100%

**Overall Coverage Target**: 100%

**Implementation**:
1. Implement `clearCache(): void`
2. Simply call: `this.cache.clear()`
3. Add test to verify cache is empty after clear
4. Add test to verify next getNextIncrementNumber() triggers scan
5. Write unit tests: 4 test cases
6. Run tests: `npm test increment-utils.test` (should pass: 4/4)
7. Verify coverage: `npm run coverage` (should be 100%)

**TDD Workflow**:
1. Write all 4 tests above (should fail)
2. Run tests: `npm test increment-utils.test` (0/4 passing)
3. Implement clearCache()
4. Run tests: `npm test increment-utils.test` (4/4 passing)
5. Final check: Coverage 100%

---

### T-006: Add Comprehensive JSDoc Documentation

**User Story**: Core infrastructure for increment number management
**Acceptance Criteria**: AC-US3-01 (Documentation)
**Priority**: P2
**Estimate**: 0.5 hours
**Status**: [ ] pending

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: JSDoc comments for all public methods
- TSDoc checker: Run `npx typedoc --emit none` (should succeed)
- IDE tooltips: Verify IntelliSense shows documentation
- Build check: `npm run build` (should succeed without warnings)

**Implementation**:
1. Add class-level JSDoc comment explaining purpose, problem solved, usage
2. Add JSDoc for `getNextIncrementNumber()`:
   - Description, @param projectRoot, @param useCache, @returns, @example
3. Add JSDoc for `incrementNumberExists()`:
   - Description, @param incrementNumber, @param projectRoot, @returns, @example
4. Add JSDoc for `clearCache()`:
   - Description, @example
5. Add JSDoc for private `scanAllIncrementDirectories()`:
   - Description, @param incrementsDir, @returns, @private
6. Add inline comments for complex logic (cache TTL, ID normalization)
7. Reference ADR-0032 in class JSDoc: `@see ADR-0032`
8. Run TSDoc validation: `npx typedoc --emit none`
9. Verify IntelliSense works in VS Code

---

## Phase 2: Migration (Priority P1)

### T-007: Update feature-utils.js with Delegation

**User Story**: Backward compatible migration
**Acceptance Criteria**: AC-US2-01 (Update feature-utils.js), AC-US2-04 (Deprecation warnings)
**Priority**: P1
**Estimate**: 0.5 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** existing code calls getNextFeatureNumber() from feature-utils.js
- **When** the function is invoked
- **Then** it should delegate to IncrementNumberManager
- **And** log a deprecation warning
- **And** return the same result as before (backward compatible)

**Test Cases**:
1. **Unit**: `tests/unit/feature-utils.test.ts`
   - testDelegatesToNewUtility(): Calls IncrementNumberManager internally
   - testReturns4DigitString(): Output matches new utility format
   - testLogsDeprecationWarning(): Console.warn called with deprecation message
   - testBackwardCompatible(): Existing behavior preserved
   - testExtractsProjectRootCorrectly(): Converts featuresDir to projectRoot
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Open file: `plugins/specweave/skills/increment-planner/scripts/feature-utils.js`
2. Add import at top (line 6):
   ```javascript
   import { IncrementNumberManager } from '../../../../../src/core/increment-utils.js';
   ```
3. Update `getNextFeatureNumber()` function (lines 63-85):
   - Add deprecation warning: `console.warn('[DEPRECATED] ...')`
   - Extract projectRoot: `const projectRoot = path.resolve(featuresDir, '../..')`
   - Delegate: `return IncrementNumberManager.getNextIncrementNumber(projectRoot, true)`
4. Update `incrementNumberExists()` function (lines 108-126):
   - Add deprecation warning
   - Extract projectRoot
   - Delegate: `return IncrementNumberManager.incrementNumberExists(incrementNumber, projectRoot)`
5. Build project: `npm run build`
6. Write unit tests: 5 test cases (mock IncrementNumberManager)
7. Run tests: `npm test feature-utils.test` (should pass: 5/5)
8. Verify CLI still works: `node feature-utils.js next .specweave/increments`

**TDD Workflow**:
1. Write all 5 tests above (should fail)
2. Run tests: `npm test feature-utils.test` (0/5 passing)
3. Update feature-utils.js step-by-step
4. Run tests: `npm test feature-utils.test` (5/5 passing)
5. Verify CLI: `node feature-utils.js next`
6. Final check: Coverage 90%+

---

### T-008: Update jira-mapper.ts with Delegation

**User Story**: Backward compatible migration
**Acceptance Criteria**: AC-US2-02 (Update jira-mapper.ts), AC-US2-04 (Deprecation warnings)
**Priority**: P1
**Estimate**: 0.5 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** JiraMapper calls getNextIncrementId()
- **When** importEpicAsIncrement() is invoked
- **Then** it should delegate to IncrementNumberManager
- **And** log a deprecation warning
- **And** return the same 4-digit format as before

**Test Cases**:
1. **Unit**: `tests/unit/jira-mapper.test.ts`
   - testDelegatesToNewUtility(): Calls IncrementNumberManager internally
   - testLogsDeprecationWarning(): Console.warn called
   - testReturns4DigitFormat(): Output is '0033' format
   - testUsesProjectRoot(): Passes correct projectRoot parameter
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Open file: `src/integrations/jira/jira-mapper.ts`
2. Add import at top (line 18):
   ```typescript
   import { IncrementNumberManager } from '../../core/increment-utils';
   ```
3. Update `getNextIncrementId()` method (lines 395-406):
   - Add deprecation warning
   - Replace implementation: `return IncrementNumberManager.getNextIncrementNumber(this.projectRoot, true)`
4. Verify importEpicAsIncrement() method (line 120) still works
5. Build project: `npm run build`
6. Write unit tests: 4 test cases
7. Run tests: `npm test jira-mapper.test` (should pass: 4/4)
8. Verify integration: Run JIRA import test (if available)

**TDD Workflow**:
1. Write all 4 tests above (should fail)
2. Run tests: `npm test jira-mapper.test` (0/4 passing)
3. Update jira-mapper.ts
4. Run tests: `npm test jira-mapper.test` (4/4 passing)
5. Final check: Coverage 90%+

---

### T-009: Update jira-incremental-mapper.ts with Delegation

**User Story**: Backward compatible migration
**Acceptance Criteria**: AC-US2-03 (Update jira-incremental-mapper.ts), AC-US2-04 (Deprecation warnings)
**Priority**: P1
**Estimate**: 0.5 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** JiraIncrementalMapper calls getNextIncrementId()
- **When** createIncrementFromItems() is invoked
- **Then** it should delegate to IncrementNumberManager
- **And** log a deprecation warning
- **And** return the same 4-digit format as before

**Test Cases**:
1. **Unit**: `tests/unit/jira-incremental-mapper.test.ts`
   - testDelegatesToNewUtility(): Calls IncrementNumberManager internally
   - testLogsDeprecationWarning(): Console.warn called
   - testReturns4DigitFormat(): Output is '0033' format
   - testUsesProjectRoot(): Passes correct projectRoot parameter
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Open file: `src/integrations/jira/jira-incremental-mapper.ts`
2. Add import at top (line 12):
   ```typescript
   import { IncrementNumberManager } from '../../core/increment-utils.js';
   ```
3. Update `getNextIncrementId()` method (lines 517-528):
   - Add deprecation warning
   - Replace implementation: `return IncrementNumberManager.getNextIncrementNumber(this.projectRoot, true)`
4. Verify createIncrementFromItems() method (line 135) still works
5. Build project: `npm run build`
6. Write unit tests: 4 test cases
7. Run tests: `npm test jira-incremental-mapper.test` (should pass: 4/4)
8. Verify integration: Run JIRA import test (if available)

**TDD Workflow**:
1. Write all 4 tests above (should fail)
2. Run tests: `npm test jira-incremental-mapper.test` (0/4 passing)
3. Update jira-incremental-mapper.ts
4. Run tests: `npm test jira-incremental-mapper.test` (4/4 passing)
5. Final check: Coverage 90%+

---

## Phase 3: Testing (Priority P1)

### T-010: Write Integration Tests for Real-World Workflows

**User Story**: Comprehensive testing
**Acceptance Criteria**: AC-US3-02 (Integration tests)
**Priority**: P1
**Estimate**: 1 hour
**Status**: [ ] pending

**Test Plan**:
- **Given** a realistic project structure with increments
- **When** increments are created, abandoned, paused, and resumed
- **Then** increment numbers should never collide
- **And** all operations should maintain number uniqueness

**Test Cases**:
1. **Integration**: `tests/integration/increment-numbering.test.ts`
   - testPreventsDuplicatesWhenAbandoning(): Abandon 0002 → next is 0004, not 0002
   - testPreventsDuplicatesWhenPausing(): Pause 0003 → next is 0005, not 0003
   - testHandlesMultipleAbandonments(): Abandon 0001, 0002, 0003 → next is 0004
   - testDetectsDuplicatesViaExists(): incrementNumberExists() finds all numbers
   - testConcurrentCreationPrevention(): Two processes don't create duplicate
   - testCacheClearOnRestart(): Simulate restart, verify fresh scan
   - testMixedStateIncrements(): Mix of active, abandoned, paused
   - testResumeAbandonedIncrement(): Resume doesn't cause collision
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create file: `tests/integration/increment-numbering.test.ts`
2. Setup test fixture: Create temporary project structure
3. Helper functions:
   - createIncrement(id, name) → creates folder
   - abandonIncrement(id) → moves to _archive/
   - pauseIncrement(id) → moves to _archive/
4. Write integration tests: 8 scenarios
5. Use real filesystem (not mocks) for integration tests
6. Clean up temp directories in afterEach()
7. Run tests: `npm run test:integration` (should pass: 8/8)
8. Verify coverage: `npm run coverage` (should be 85%+)

**TDD Workflow**:
1. Write all 8 integration tests (should fail)
2. Run tests: `npm run test:integration` (0/8 passing)
3. Verify core utility implementation handles all scenarios
4. Run tests: `npm run test:integration` (8/8 passing)
5. Final check: Coverage 85%+

---

### T-011: Write Edge Case Tests

**User Story**: Comprehensive testing
**Acceptance Criteria**: AC-US3-02 (Edge case coverage)
**Priority**: P1
**Estimate**: 0.5 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** unusual or error conditions
- **When** IncrementNumberManager is invoked
- **Then** it should handle gracefully without crashes
- **And** provide clear error messages

**Test Cases**:
1. **Unit**: `tests/unit/increment-utils.test.ts` (add to existing suite)
   - testHandlesMissingSpecweaveDirectory(): Returns '0001' when no .specweave/
   - testHandlesMissingIncrementsDirectory(): Returns '0001' when no increments/
   - testHandlesInvalidDirectoryNames(): Ignores folders like 'README.md'
   - testHandlesEmptyDirectories(): Returns '0001' when all dirs empty
   - testHandlesPermissionErrors(): Throws clear error message
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. Add edge case tests to existing test suite
2. Test missing directories (don't create .specweave/)
3. Test invalid folder names (create 'README.md', 'docs/')
4. Test empty directories (create subdirs but no increments)
5. Test permission errors (mock fs.readdirSync to throw)
6. Write 5 edge case tests
7. Run tests: `npm test increment-utils.test` (should pass: all tests)
8. Verify coverage: `npm run coverage` (should be 95%+)

**TDD Workflow**:
1. Write all 5 edge case tests (may fail or pass depending on implementation)
2. Run tests: `npm test increment-utils.test`
3. Fix any failing edge cases in implementation
4. Run tests: All passing
5. Final check: Coverage 95%+

---

### T-012: Performance Benchmarking

**User Story**: Comprehensive testing
**Acceptance Criteria**: AC-US3-03 (Performance validation)
**Priority**: P2
**Estimate**: 0.5 hours
**Status**: [ ] pending

**Test Plan**: N/A (performance validation task)

**Validation**:
- Benchmark: Uncached scan completes in <50ms (with 100 increments)
- Benchmark: Cached lookup completes in <1ms
- Memory check: Cache uses <10KB memory (100 projects)
- TTL check: Cache expires after 5 seconds

**Implementation**:
1. Create benchmark script: `tests/benchmarks/increment-numbering.bench.ts`
2. Setup: Create 100 test increments across all directories
3. Benchmark 1: Measure uncached scan time (clear cache first)
4. Benchmark 2: Measure cached lookup time (call twice)
5. Benchmark 3: Measure memory usage (process.memoryUsage())
6. Benchmark 4: Measure TTL expiry (wait 6 seconds, verify scan)
7. Run benchmarks: `npm run benchmark`
8. Expected results:
   - Uncached: <50ms
   - Cached: <1ms
   - Memory: <10KB
   - TTL: Cache cleared after 5s
9. Document results in completion report

---

## Phase 4: Documentation (Priority P2)

### T-013: Update User Guide with Subdirectory Explanation

**User Story**: Documentation
**Acceptance Criteria**: AC-US3-01 (User guide update)
**Priority**: P2
**Estimate**: 0.5 hours
**Status**: [ ] pending

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Section explains _archive/ and _archive/ folders
- Grammar check: Run spell checker
- Link checker: All internal links work
- User testing: Ask user to follow guide and create/abandon increment

**Implementation**:
1. Open file: `.specweave/docs/public/guides/increment-lifecycle.md`
2. Add new section: "Understanding Increment Subdirectories"
3. Add table explaining main, _archive, _archive folders
4. Add example showing increment number reservation
5. Add "Why" explanation (prevents duplicate IDs, maintains audit trail)
6. Add visual diagram (ASCII art or Mermaid)
7. Update related sections to reference subdirectories
8. Run spell checker: `npx cspell *.md`
9. Run link checker: `npx markdown-link-check *.md`
10. Preview in Docusaurus: `cd docs-site && npm run start`

---

### T-014: Add Inline Code Comments for Complex Logic

**User Story**: Documentation
**Acceptance Criteria**: AC-US3-01 (Code documentation)
**Priority**: P2
**Estimate**: 0.5 hours
**Status**: [ ] pending

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: All complex logic has comments
- TSDoc validation: `npx typedoc --emit none` (no warnings)
- Peer review: Another developer can understand code
- Build check: `npm run build` (no warnings)

**Implementation**:
1. Open file: `src/core/increment-utils.ts`
2. Add inline comments for:
   - Cache TTL logic (why 5 seconds?)
   - ID normalization (why padStart(4, '0')?)
   - Directory scanning order (why main, then _archive, then _archive?)
   - Regex pattern (why /^(\d{3,4})-/?)
   - Graceful fallbacks (why not throw errors?)
3. Add TODO comments for future enhancements:
   - TODO: Add _archived/ support
   - TODO: Consider async version
   - TODO: Add listAllIncrements() method
4. Run TSDoc validation: `npx typedoc --emit none`
5. Build project: `npm run build`

---

### T-015: Update ADR with Implementation Notes

**User Story**: Documentation
**Acceptance Criteria**: AC-US3-01 (ADR completion)
**Priority**: P2
**Estimate**: 0.5 hours
**Status**: [ ] pending

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: ADR reflects actual implementation
- Accuracy check: Code matches ADR descriptions
- Completeness check: All sections filled
- Link checker: References to other ADRs work

**Implementation**:
1. Open file: `.specweave/docs/internal/architecture/adr/0032-increment-number-gap-prevention.md`
2. Update "Implementation Plan" checkboxes (mark completed)
3. Add "Implementation Notes" section:
   - Actual performance benchmarks (from T-012)
   - Any deviations from original plan
   - Lessons learned
   - Future enhancements discovered
4. Update "Validation" section with test results:
   - Test coverage achieved (should be 95%+)
   - Performance metrics (uncached/cached times)
   - Edge cases handled
5. Add "Related PRs" section with PR number
6. Update "Last Updated" date
7. Run link checker: `npx markdown-link-check adr/*.md`
8. Commit ADR update with PR

---

## Summary

**Total Estimated Effort**: 10 hours

**Phase Breakdown**:
- Phase 1 (Core Utility): 5 hours - 6 tasks
- Phase 2 (Migration): 1.5 hours - 3 tasks
- Phase 3 (Testing): 2 hours - 3 tasks
- Phase 4 (Documentation): 1.5 hours - 3 tasks

**Test Coverage Breakdown**:
- Unit tests: 40 test cases (T-001 through T-009, T-011)
- Integration tests: 8 test cases (T-010)
- Benchmarks: 4 scenarios (T-012)
- **Total**: 52 tests

**Expected Coverage**:
- IncrementNumberManager: 95%+
- feature-utils.js: 90%+
- jira-mapper.ts: 90%+
- jira-incremental-mapper.ts: 90%+
- **Overall**: 95%+

**Success Criteria**:
- ✅ Zero duplicate increment IDs (100% prevention)
- ✅ Scan performance <50ms uncached, <1ms cached
- ✅ Test coverage >95%
- ✅ Backward compatibility 100%
- ✅ Clear deprecation warnings guide migration
- ✅ Comprehensive documentation

**Next Steps After Completion**:
1. Monitor deprecation warnings in production
2. Plan v2.0.0 breaking change (remove deprecated functions)
3. Consider async version if performance becomes bottleneck
4. Add _archived/ support if users request long-term archiving
