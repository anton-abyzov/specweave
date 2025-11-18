---
id: US-001
feature: FS-042
title: "Eliminate Duplicate Test Directories (Priority: P1 - CRITICAL)"
status: completed
priority: P1
created: 2025-11-18
---

# US-001: Eliminate Duplicate Test Directories (Priority: P1 - CRITICAL)

**Feature**: [FS-042](../../_features/FS-042/FEATURE.md)

**As a** SpecWeave contributor
**I want** duplicate test directories automatically removed
**So that** CI time is reduced by 47% and test maintenance is simplified

---

## Acceptance Criteria

- [ ] **AC-US1-01**: All 62 flat duplicate directories deleted from `tests/integration/`
- [ ] **AC-US1-02**: Only categorized structure remains (core/, features/, external-tools/, generators/)
- [ ] **AC-US1-03**: All integration tests still pass after deletion
- [ ] **AC-US1-04**: CI test execution time reduced by at least 40%
- [ ] **AC-US1-05**: Automated cleanup script provided for verification

---

## Implementation

**Increment**: [0042-test-infrastructure-cleanup](../../../../increments/0042-test-infrastructure-cleanup/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create Safety Backup and Document Baseline
- [x] **T-002**: Execute Automated Cleanup Script
- [x] **T-003**: Update Documentation and Commit Phase 1
- [ ] **T-017**: Create Completion Report
- [ ] **T-018**: Final Validation and Increment Closure
