---
id: US-003
feature: FS-139
title: Fix lock-manager.test.ts Failures (P0 - ~20 failures)
status: completed
priority: P0
created: 2025-12-10
project: specweave
external:
  github:
    issue: 909
    url: https://github.com/anton-abyzov/specweave/issues/909
---

# US-003: Fix lock-manager.test.ts Failures (P0 - ~20 failures)

**Feature**: [FS-139](./FEATURE.md)

**As a** developer
**I want** LockManager tests passing
**So that** zombie process prevention works

---

## Acceptance Criteria

- [x] **AC-US3-01**: Lock acquisition tests pass
- [x] **AC-US3-02**: Stale lock detection tests pass
- [x] **AC-US3-03**: Concurrent lock tests pass
- [x] **AC-US3-04**: Lock metadata tests pass

---

## Implementation

**Increment**: [0139-test-suite-audit-and-fixes](../../../../increments/0139-test-suite-audit-and-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: Analyze lock-manager.test.ts Failures (~20 tests)
- [x] **T-012**: Fix LockManager Lock Acquisition
- [x] **T-013**: Fix LockManager Stale Lock Detection
- [x] **T-014**: Fix LockManager Concurrent Access Handling
- [x] **T-015**: Fix LockManager Metadata Operations
