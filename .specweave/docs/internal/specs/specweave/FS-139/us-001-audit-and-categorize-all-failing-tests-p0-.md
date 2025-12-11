---
id: US-001
feature: FS-139
title: Audit and Categorize All Failing Tests (P0)
status: completed
priority: P0
created: 2025-12-10
project: specweave
external:
  github:
    issue: 907
    url: https://github.com/anton-abyzov/specweave/issues/907
---

# US-001: Audit and Categorize All Failing Tests (P0)

**Feature**: [FS-139](./FEATURE.md)

**As a** developer
**I want** comprehensive categorization of all failing tests
**So that** I can prioritize fixes systematically

---

## Acceptance Criteria

- [x] **AC-US1-01**: All 42 failing tests documented with failure reason
- [x] **AC-US1-02**: Tests categorized by type (unit/integration/performance)
- [x] **AC-US1-03**: Each test analyzed for "test wrong" vs "impl wrong"
- [x] **AC-US1-04**: Decision matrix created (delete/update test/fix impl)
- [x] **AC-US1-05**: Priority assigned (P0 = real bugs, P1 = outdated tests)

---

## Implementation

**Increment**: [0139-test-suite-audit-and-fixes](../../../../increments/0139-test-suite-audit-and-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Capture Complete Test Failure Report
- [x] **T-002**: Analyze increment-utils.test.ts Failures (~18 tests)
- [x] **T-003**: Analyze lock-manager.test.ts Failures (~20 tests)
- [x] **T-004**: Analyze user-story-issue-builder.test.ts Failures (3 tests)
- [x] **T-005**: Analyze Integration Test Performance Failures (3 tests)
