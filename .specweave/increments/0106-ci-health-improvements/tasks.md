# Tasks - CI Health Improvements

## Tasks

### T-001: Fix flaky time-based test
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed

Fixed the flaky test in `tests/unit/core/dashboard/dashboard-data.test.ts:209-215` by using `vi.useFakeTimers()` to control time instead of relying on `Date.now()`.

### T-002: Verify unit tests pass
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [x] completed

All 190 test files pass (3441 tests pass, 307 skipped, 1 todo).

### T-003: Make E2E workflow graceful on missing API key
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [x] completed

Updated `e2e-smoke-test.yml` to:
- Check for ANTHROPIC_API_KEY at workflow start
- Run limited smoke test (build validation) if API key missing
- Run full E2E test only when API key is configured
- Made performance benchmark conditional on API key availability

### T-004: Fix DORA metrics scheduled workflow
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02
**Status**: [x] completed

Updated `dora-metrics.yml` to:
- Add build step before metrics calculation
- Use `continue-on-error: true` for metrics calculation
- Provide clear warning messages on failure
- Only commit/push if calculation succeeded
