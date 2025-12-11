---
id: US-006
feature: FS-139
title: Delete Invalid Tests (P2)
status: completed
priority: P0
created: 2025-12-10
project: specweave
external:
  github:
    issue: 912
    url: https://github.com/anton-abyzov/specweave/issues/912
---

# US-006: Delete Invalid Tests (P2)

**Feature**: [FS-139](./FEATURE.md)

**As a** developer
**I want** invalid tests removed
**So that** test suite is accurate

---

## Acceptance Criteria

- [x] **AC-US6-01**: All tests testing non-existent features deleted
- [x] **AC-US6-02**: All tests with invalid status values deleted (e.g., "in-progress")
- [x] **AC-US6-03**: All duplicate tests removed
- [x] **AC-US6-04**: Test count reduced appropriately

---

## Implementation

**Increment**: [0139-test-suite-audit-and-fixes](../../../../increments/0139-test-suite-audit-and-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-006**: Delete Tests for Non-Existent Features
- [x] **T-007**: Remove Duplicate Test Cases
