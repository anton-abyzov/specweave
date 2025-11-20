---
id: US-004
feature: FS-047
title: "AC Coverage Validation"
status: completed
priority: P0
created: 2025-11-19
---

# US-004: AC Coverage Validation

**GitHub Project**: https://github.com/anton-abyzov/specweave/issues/691

**Feature**: [FS-047](../../_features/FS-047/FEATURE.md)

**As a** PM approving increment closure
**I want** `/specweave:validate` to detect uncovered Acceptance Criteria
**So that** I know all requirements are implemented before closing increment

---

## Acceptance Criteria

- [x] **AC-US4-01**: `/specweave:validate <increment-id>` reports all ACs with zero tasks assigned
- [x] **AC-US4-02**: Validation shows which tasks cover each AC (traceability matrix)
- [x] **AC-US4-03**: `/specweave:done` blocks closure if uncovered ACs found (unless --force flag)
- [x] **AC-US4-04**: Validation detects orphan tasks (tasks with no satisfiesACs field or invalid AC-IDs)

---

## Implementation

**Increment**: [0047-us-task-linkage](../../../../increments/0047-us-task-linkage/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-013**: Create AC coverage validator
- [x] **T-014**: Integrate AC coverage into /specweave:validate
- [x] **T-015**: Add closure validation to /specweave:done
