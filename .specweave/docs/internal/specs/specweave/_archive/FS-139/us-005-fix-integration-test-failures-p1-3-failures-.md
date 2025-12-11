---
id: US-005
feature: FS-139
title: Fix Integration Test Failures (P1 - 3 failures)
status: completed
priority: P0
created: 2025-12-10
project: specweave
external:
  github:
    issue: 911
    url: https://github.com/anton-abyzov/specweave/issues/911
---

# US-005: Fix Integration Test Failures (P1 - 3 failures)

**Feature**: [FS-139](./FEATURE.md)

**As a** developer
**I want** integration tests passing
**So that** end-to-end workflows work

---

## Acceptance Criteria

- [x] **AC-US5-01**: cleanup-service performance test passes or threshold adjusted
- [x] **AC-US5-02**: duplicate-prevention performance test passes or threshold adjusted
- [x] **AC-US5-03**: status-update benchmark passes or threshold adjusted

---

## Implementation

**Increment**: [0139-test-suite-audit-and-fixes](../../../../increments/0139-test-suite-audit-and-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Analyze Integration Test Performance Failures (3 tests)
- [x] **T-019**: Adjust cleanup-service Performance Threshold
- [x] **T-020**: Adjust duplicate-prevention Performance Threshold
- [x] **T-021**: Adjust status-update Benchmark Threshold
