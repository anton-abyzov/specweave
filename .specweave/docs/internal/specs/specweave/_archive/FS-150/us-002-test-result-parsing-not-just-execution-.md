---
id: US-002
feature: FS-150
title: Test Result Parsing (Not Just Execution)
status: not_started
priority: P0
created: 2025-12-30
project: specweave
external:
  github:
    issue: 984
    url: https://github.com/anton-abyzov/specweave/issues/984
---

# US-002: Test Result Parsing (Not Just Execution)

**Feature**: [FS-150](./FEATURE.md)

**As a** developer in auto mode
**I want** the stop hook to verify tests actually PASSED
**So that** auto mode doesn't claim success when tests are failing

---

## Acceptance Criteria

- [ ] **AC-US2-01**: Stop hook parses test output for FAIL/ERROR patterns
- [ ] **AC-US2-02**: Stop hook extracts specific failing test name and error message
- [ ] **AC-US2-03**: Stop hook blocks completion if ANY test is failing
- [ ] **AC-US2-04**: Stop hook reports accurate pass/fail counts
- [ ] **AC-US2-05**: Works for: npm test, vitest, jest, playwright, pytest, go test

---

## Implementation

**Increment**: [0150-auto-mode-world-class-testing](../../../../increments/0150-auto-mode-world-class-testing/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Implement test result parser function
- [x] **T-002**: Implement failure detail extractor
- [x] **T-003**: Replace weak grep with proper result verification
- [x] **T-023**: Add integration tests for test result parsing
