# Implementation Plan: E2E Test Cleanup

## Phase 1: Analysis
- Identify all skipped and failing tests
- Categorize tests by importance
- Determine which tests are inappropriate

## Phase 2: Smoke Test Fixes
- Fix CLI timeout issues (add --force flag)
- Fix test parallelism (use serial execution)
- Fix process.cwd() bug in CLI
- Update test expectations

## Phase 3: Test Cleanup
- Remove/comment inappropriate tests
- Document reasons for removal
- Update test structure

## Phase 4: Documentation
- Document ADO test requirements
- Add skip reasons for all skipped tests
- Create GitHub secrets documentation

## Phase 5: Verification
- Run all test suites
- Verify no failures
- Confirm CI/CD compatibility

## Technical Decisions

- Use `test.describe.serial()` for smoke tests to prevent conflicts
- Add `--force` flag to init command to bypass interactivity
- Fix process.cwd() to be evaluated at runtime, not module load
- Remove tests for .claude/ directories (plugin system)
- Document all environment variable requirements