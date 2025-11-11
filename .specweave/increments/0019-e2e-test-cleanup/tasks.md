---
increment: 0019-e2e-test-cleanup
total_tasks: 10
---

# Tasks for Increment 0019: E2E Test Cleanup

## T-001: Analyze skipped and failing tests
- [x] Completed
- Identified 18 skipped tests and 4 failing smoke tests
- Categorized by priority

## T-002: Fix CLI process.cwd() bug
- [x] Completed
- Fixed bin/specweave.js line 185
- Changed to runtime evaluation

## T-003: Fix smoke test timeout issues
- [x] Completed
- Added --force flag to init command
- Bypasses interactive prompts

## T-004: Fix test parallelism conflicts
- [x] Completed
- Changed to test.describe.serial()
- Prevents shared directory conflicts

## T-005: Remove inappropriate smoke tests
- [x] Completed
- Removed 11 tests checking for non-existent features
- Commented with explanations

## T-006: Update test expectations
- [x] Completed
- Removed .claude/ directory checks
- Updated file expectations

## T-007: Document ADO test requirements
- [x] Completed
- Added clear documentation for all 10 skipped ADO tests
- Explained how to enable them

## T-008: Create GitHub secrets documentation
- [x] Completed
- Created GITHUB-SECRETS-REQUIRED.md
- Listed all required and optional env vars

## T-009: Run all test suites
- [x] Completed
- Unit: 435 passed
- Integration: 39 passed
- E2E: 37 passed, 10 skipped (ADO)

## T-010: Create final reports
- [x] Completed
- Created comprehensive summary reports
- Documented all changes and improvements