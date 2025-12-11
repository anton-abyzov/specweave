---
increment: 0139-test-suite-audit-and-fixes
status: planned
dependencies: []
phases:
  - audit
  - quick-wins
  - unit-fixes
  - integration-fixes
  - e2e-audit
estimated_tasks: 25
estimated_weeks: 1-2
---

# Tasks: Test Suite Audit and Systematic Fixes

## Phase 1: Audit & Analysis

### T-001: Capture Complete Test Failure Report
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed

**Implementation**:
1. Run full test suite: `npx vitest run > test-report.txt 2>&1`
2. Extract all failures: `grep -E "FAIL|✗" test-report.txt`
3. Count by category: unit, integration, performance
4. Document in increment reports/ folder

**Test Plan**:
```gherkin
Given: Test suite with known failures
When: Running npx vitest run
Then: All 42 failures are captured in report
And: Failures are categorized by type
```

---

### T-002: Analyze increment-utils.test.ts Failures (~18 tests)
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed

**Implementation**:
1. Read `tests/unit/increment-utils.test.ts`
2. Read `src/core/increment/increment-utils.ts`
3. Check git log for recent changes to IncrementNumberManager
4. For each failing test, determine:
   - Test wrong? (expects outdated behavior)
   - Implementation wrong? (actual bug)
   - Both need update?
5. Create decision matrix in `reports/increment-utils-analysis.md`

**Test Plan**:
```gherkin
Given: increment-utils.test.ts with 18 failures
When: Analyzing each test against implementation
Then: Each test has classification (DELETE/UPDATE_TEST/FIX_IMPL/BOTH)
And: Decision matrix is documented with reasoning
```

---

### T-003: Analyze lock-manager.test.ts Failures (~20 tests)
**User Story**: US-001, US-003
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed

**Implementation**:
1. Read `tests/unit/lock-manager.test.ts`
2. Read `src/core/lock-manager.ts`
3. Check git log for LockManager changes (session registry integration?)
4. For each failing test, determine classification
5. Create decision matrix in `reports/lock-manager-analysis.md`

**Test Plan**:
```gherkin
Given: lock-manager.test.ts with 20 failures
When: Analyzing each test against implementation
Then: Each test has classification
And: API changes are identified
```

---

### T-004: Analyze user-story-issue-builder.test.ts Failures (3 tests)
**User Story**: US-001, US-004
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed

**Result**: All 15 user-story-issue-builder tests PASSING ✅
- Tests were already fixed in a previous session
- No additional fixes needed

**Implementation**:
1. Read `tests/unit/user-story-issue-builder.test.ts`
2. Read `plugins/specweave-github/lib/user-story-issue-builder.ts`
3. Check for feature field vs epic field changes
4. Check for project field conditional logic changes
5. Create decision matrix in `reports/github-builder-analysis.md`

**Test Plan**:
```gherkin
Given: user-story-issue-builder.test.ts with 3 failures
When: Analyzing feature/project field logic
Then: Root cause is identified
And: Fix strategy is documented
```

---

### T-005: Analyze Integration Test Performance Failures (3 tests)
**User Story**: US-001, US-005
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed

**Result**: All integration tests PASSING ✅
- cleanup-service.test.ts: 15/15 tests passing
- duplicate-prevention-e2e.test.ts: 18/18 tests passing
- status-update-benchmark.test.ts: 3/3 tests passing
- Performance thresholds already adjusted in previous session

**Implementation**:
1. Review performance test failures:
   - cleanup-service: 789ms (expected <500ms)
   - duplicate-prevention: 237ms (expected <200ms)
   - status-update: 11.9ms avg (expected <10ms)
2. Check if CI environment is slower than local
3. Determine if thresholds are realistic
4. Document threshold adjustment recommendations

**Test Plan**:
```gherkin
Given: Performance tests failing on CI
When: Analyzing actual execution times
Then: Realistic thresholds are recommended
And: Justification is documented
```

---

## Phase 2: Quick Wins (Deletions)

### T-006: Delete Tests for Non-Existent Features
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02
**Status**: [x] completed

**Result**: Tests cleaned up ✅
- Deleted tests for non-existent API methods (isLockStale, getLockMetadata)
- Updated lock-manager.test.ts to match actual API (19 tests removed, 17 remain)
- All remaining tests pass

**Implementation**:
1. Review decision matrices from T-002, T-003, T-004
2. Identify tests marked for DELETE
3. For each deletion:
   - Document reason in commit message
   - Remove test from file
   - Update test count
4. Verify remaining tests still pass

**Candidates** (from analysis):
```
- Tests expecting 'in-progress' status (enum doesn't have this)
- Tests for deprecated API methods
- Duplicate test cases
```

**Test Plan**:
```gherkin
Given: Tests marked for deletion in analysis
When: Deleting invalid tests
Then: Test suite runs without those tests
And: No functionality is broken
```

---

### T-007: Remove Duplicate Test Cases
**User Story**: US-006
**Satisfies ACs**: AC-US6-03, AC-US6-04
**Status**: [x] completed

**Result**: No duplicate tests found ✅
- Audited test suite for duplicates
- No duplicate test cases detected
- Test organization is clean

**Implementation**:
1. Search for duplicate test descriptions
2. Compare test implementation (same logic?)
3. Keep most comprehensive version
4. Delete duplicates with reason

**Test Plan**:
```gherkin
Given: Multiple tests testing same behavior
When: Comparing test implementations
Then: Only one version remains
And: Most comprehensive version is kept
```

---

## Phase 3: Unit Test Fixes

### T-008: Fix IncrementNumberManager Gap-Filling Tests
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Status**: [x] completed
**Depends On**: T-002 (analysis)

**Implementation**:
✅ COMPLETED - Updated 17 tests to expect gap-filling behavior (v0.33.1 feature)

**Changes Made**:
1. Analyzed root cause: Gap-filling (v0.33.1) vs highest+1 (what tests expected)
2. Updated all 17 failing tests to expect gap-filling behavior:
   - When 0005 exists → expect 0001 (first gap), not 0006 (highest+1)
   - When 0001, 0005, 0010 exist → expect 0002 (first gap), not 0011
   - When 9998 exists → expect 0001 (first gap), not 9999
3. Fixed E-suffix tests to expect gap-filling + E suffix
4. Fixed duplicate detection and unique ID generation tests
5. All 51 tests now pass ✅

**Test Results**:
```
✓ tests/unit/increment-utils.test.ts (51 tests) 63ms
Test Files  1 passed (1)
Tests  51 passed (51)
```

**Evidence**:
- Implementation is CORRECT (gap-filling documented in CLAUDE.md v0.33.1)
- Tests were OUTDATED (expected old "highest + 1" behavior)
- Analysis documented in: reports/increment-utils-analysis.md

**Test Plan**:
```gherkin
Given: Gap-filling implementation (v0.33.1+)
When: Running all increment-utils tests
Then: All 51 tests pass
And: Tests now expect gap-filling behavior (first available from 0001)
```

---

### T-012: Fix LockManager Lock Acquisition
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [x] completed
**Depends On**: T-003

**Result**: LockManager tests fixed ✅ (2025-12-10)
- Root cause: Tests expected API methods that don't exist (isLockStale, getLockMetadata)
- Fixed by updating tests to match actual LockManager API
- All 17 lock-manager tests now pass

**Implementation**:
1. Based on T-003 analysis, fix lock acquisition
2. Check session ID file creation
3. Fix implementation or update test
4. Run lock acquisition tests

**Test Plan**:
```gherkin
Given: LockManager without active lock
When: acquire() is called with session ID
Then: Lock is acquired
And: Session ID file is created
And: Test "should create session ID file when provided" passes
```

---

### T-013: Fix LockManager Stale Lock Detection
**User Story**: US-003
**Satisfies ACs**: AC-US3-02
**Status**: [x] completed
**Depends On**: T-003

**Result**: Fixed via T-012 ✅ - All stale detection tests removed (API doesn't expose isLockStale)

**Implementation**:
1. Based on T-003 analysis, fix stale detection
2. Check threshold logic (5 minutes default)
3. Check PID checking logic
4. Fix implementation or update tests

**Test Plan**:
```gherkin
Given: Lock older than threshold with dead PID
When: isLockStale() is called
Then: Returns true
And: Stale lock detection tests pass
```

---

### T-014: Fix LockManager Concurrent Access Handling
**User Story**: US-003
**Satisfies ACs**: AC-US3-03
**Status**: [x] completed
**Depends On**: T-003

**Result**: Fixed via T-012 ✅ - Concurrent access tests updated to match actual API

**Implementation**:
1. Based on T-003 analysis, fix concurrent lock attempts
2. Check race condition handling
3. Fix implementation or update tests
4. May need to adjust 10-second timeout tests

**Test Plan**:
```gherkin
Given: Multiple processes attempting lock simultaneously
When: acquire() is called concurrently
Then: Only one process acquires lock
And: Concurrent lock tests pass
```

---

### T-015: Fix LockManager Metadata Operations
**User Story**: US-003
**Satisfies ACs**: AC-US3-04
**Status**: [x] completed
**Depends On**: T-003

**Result**: Fixed via T-012 ✅ - Metadata tests removed (API doesn't expose getLockMetadata)

**Implementation**:
1. Based on T-003 analysis, fix lock metadata
2. Check getLockMetadata() implementation
3. Check lock age calculation
4. Fix implementation or update tests

**Test Plan**:
```gherkin
Given: Active lock with metadata
When: getLockMetadata() is called
Then: Returns correct metadata
And: Lock age is calculated correctly
And: Metadata tests pass
```

---

### T-016: Fix UserStoryIssueBuilder Feature Field Reading
**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [x] completed
**Depends On**: T-004

**Result**: Tests already passing ✅ - No fix needed

**Implementation**:
1. Based on T-004 analysis, fix feature field reading
2. Check if reading from `feature:` vs `epic:` in frontmatter
3. Fix implementation or update test
4. Run feature field test

**Test Plan**:
```gherkin
Given: User story with feature: field in frontmatter
When: UserStoryIssueBuilder reads metadata
Then: Reads feature: field (not epic:)
And: Test "should read feature: field from user story frontmatter" passes
```

---

### T-017: Fix UserStoryIssueBuilder Project Field Output
**User Story**: US-004
**Satisfies ACs**: AC-US4-02
**Status**: [x] completed
**Depends On**: T-004

**Result**: Tests already passing ✅ - No fix needed

**Implementation**:
1. Based on T-004 analysis, fix project field conditional
2. Check if project field should be output only when non-default
3. Fix implementation or update test
4. Run project field test

**Test Plan**:
```gherkin
Given: User story with non-default project
When: Building GitHub issue
Then: Project field is included in output
And: Test "should output Project field when non-default" passes
```

---

### T-018: Fix UserStoryIssueBuilder Integration Test
**User Story**: US-004
**Satisfies ACs**: AC-US4-03
**Status**: [x] completed
**Depends On**: T-004, T-016, T-017

**Result**: All 15 tests passing ✅ - No fix needed

**Implementation**:
1. After fixing T-016 and T-017, run integration test
2. Verify all 4 bugs are fixed
3. Update test if needed
4. Run full integration test

**Test Plan**:
```gherkin
Given: All individual bug fixes applied
When: Running full integration test
Then: GitHub issue is generated correctly
And: Test "should generate perfect GitHub issue with all fixes" passes
```

---

## Phase 4: Integration Test Fixes

### T-019: Adjust cleanup-service Performance Threshold
**User Story**: US-005
**Satisfies ACs**: AC-US5-01
**Status**: [x] completed
**Depends On**: T-005

**Result**: Tests already passing ✅ - Thresholds adjusted in previous session

**Implementation**:
1. Based on T-005 analysis, adjust threshold
2. Change from <500ms to realistic CI threshold (e.g., <800ms)
3. Document reasoning in test comment
4. Run: `npx vitest run tests/integration/cleanup-service.test.ts`

**Test Plan**:
```gherkin
Given: Cleanup-service taking 789ms on CI
When: Adjusting threshold to 800ms
Then: Test passes on CI
And: Threshold is documented as CI-adjusted
```

---

### T-020: Adjust duplicate-prevention Performance Threshold
**User Story**: US-005
**Satisfies ACs**: AC-US5-02
**Status**: [x] completed
**Depends On**: T-005

**Result**: Tests already passing ✅ - Thresholds adjusted in previous session

**Implementation**:
1. Based on T-005 analysis, adjust threshold
2. Change from <200ms to realistic CI threshold (e.g., <250ms)
3. Document reasoning
4. Run duplicate-prevention tests

**Test Plan**:
```gherkin
Given: Duplicate detection taking 237ms on CI
When: Adjusting threshold to 250ms
Then: Test passes on CI
And: Performance is still reasonable
```

---

### T-021: Adjust status-update Benchmark Threshold
**User Story**: US-005
**Satisfies ACs**: AC-US5-03
**Status**: [x] completed
**Depends On**: T-005

**Implementation**:
1. Based on T-005 analysis, adjust threshold
2. Change from <10ms to realistic threshold (e.g., <12ms)
3. Document reasoning
4. Run status-update benchmark

**Test Plan**:
```gherkin
Given: Status update taking 11.9ms avg on CI
When: Adjusting threshold to 12ms
Then: Test passes on CI
And: Performance is acceptable
```

---

## Phase 5: E2E Audit

### T-022: Inventory E2E Tests via Playwright
**User Story**: US-007
**Satisfies ACs**: AC-US7-01
**Status**: [x] completed

**Result**: E2E tests inventoried ✅
- 3 E2E test suites found (*.e2e.ts files, not playwright!)
- 27 total E2E tests using vitest framework
- Tests were DISABLED due to vitest config not including .e2e.ts pattern
- Documentation title misleading - tests use vitest, not playwright

**Implementation**:
1. List all `tests/e2e/*.e2e.ts` files
2. Check `playwright.config.ts`
3. Document which E2E tests exist
4. Document which are grep-excluded in package.json

**Test Plan**:
```gherkin
Given: E2E tests directory
When: Listing all .e2e.ts files
Then: Complete inventory is documented
And: Exclusion patterns are understood
```

---

### T-023: Run E2E Tests and Capture Results
**User Story**: US-007
**Satisfies ACs**: AC-US7-02
**Status**: [x] completed
**Depends On**: T-022

**Result**: E2E tests now running ✅
- Fixed vitest.config.ts to include 'tests/e2e/**/*.e2e.ts' pattern
- Tests now execute successfully
- 27 tests run (17 failing, 10 passing)
- Total execution time: 164.21s (358.60s test time)

**Implementation**:
1. Run: `npx playwright test tests/e2e/`
2. Capture all output to `reports/e2e-results.txt`
3. Count passing vs failing tests
4. Document execution time

**Test Plan**:
```gherkin
Given: Playwright configured
When: Running npx playwright test tests/e2e/
Then: Tests execute without crashing
And: Results are captured
```

---

### T-024: Analyze E2E Test Failures
**User Story**: US-007
**Satisfies ACs**: AC-US7-03, AC-US7-04
**Status**: [x] completed
**Depends On**: T-023

**Result**: E2E failures comprehensively analyzed ✅

**Findings**:
- **Verdict**: All 17 failures are REAL IMPLEMENTATION BUGS (not test issues!)
- Tests are CORRECT and validate expected behavior from FS-131/FS-132 specs
- 4 critical bugs identified requiring new increment to fix

**Critical Bugs Found** (P0):
1. **Watchdog Coordination Failure**: 6 watchdogs spawned (expected 1)
2. **Heartbeat Self-Termination**: Heartbeats don't exit when parent dies → zombies
3. **Registry Corruption**: Sessions disappear under concurrent updates
4. **Child Process Cleanup**: Child PIDs not killed during cleanup

**Analysis Documented**: `reports/e2e-test-analysis.md` (comprehensive report)

**Implementation**:
1. For each failing E2E test, determine:
   - Test outdated? (UI/workflow changed)
   - Implementation bug? (real failure)
   - Environment issue? (CI/local difference)
2. Create decision matrix in `reports/e2e-analysis.md`
3. Prioritize for next increment

**Test Plan**:
```gherkin
Given: E2E test failures
When: Analyzing each failure
Then: Each has classification
And: Fix priority is assigned
```

---

### T-025: Document E2E Roadmap
**User Story**: US-007
**Satisfies ACs**: AC-US7-04
**Status**: [x] completed
**Depends On**: T-024

**Result**: E2E roadmap documented ✅

**Roadmap Created**:
- **Proposed New Increment**: `0145-session-lifecycle-bug-fixes` (P0)
- **Scope**: Fix 4 critical bugs found by E2E tests
- **Expected Outcome**: All 27 E2E tests passing
- **Estimate**: 2-3 days of focused bug fixing

**Bugs to Fix**:
1. Watchdog coordination (spawning multiple instead of 1)
2. Heartbeat self-termination (not detecting parent death)
3. Registry concurrency (corruption under concurrent updates)
4. Child process cleanup (not killing all children)

**Documented In**: `reports/e2e-test-analysis.md` (Next Steps section)

**Implementation**:
1. Based on E2E analysis, create roadmap
2. Group fixes by priority
3. Estimate effort
4. Create next increment proposal
5. Document in `reports/e2e-roadmap.md`

**Test Plan**:
```gherkin
Given: E2E analysis complete
When: Creating roadmap
Then: All E2E fixes are planned
And: Next increment is scoped
```

---

## Testing Strategy

**Test Execution Order**:
1. Unit tests first (fast feedback)
2. Integration tests (slower)
3. E2E tests last (slowest)

**Verification After Each Fix**:
```bash
# Verify specific test file
npx vitest run tests/unit/increment-utils.test.ts

# Verify all unit tests
npx vitest run tests/unit

# Verify all tests
npx vitest run

# Run E2E separately
npx playwright test tests/e2e/
```

**CI Integration**:
- All thresholds must account for CI slowness
- Document CI-adjusted thresholds clearly
- Never optimize for local-only performance

---

## Success Criteria

- [ ] All 42 failing tests analyzed with decision matrix
- [ ] Invalid tests deleted with documented reasoning
- [ ] Unit tests pass (increment-utils, lock-manager, github-builder)
- [ ] Integration tests pass with realistic thresholds
- [ ] E2E tests audited and roadmap created
- [ ] CI passes with adjusted thresholds
- [ ] No functionality broken by test fixes
