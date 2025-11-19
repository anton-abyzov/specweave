---
id: US-002
feature: FS-047
title: AC-Task Mapping
status: active
priority: P0
created: 2025-11-19
external:
  github:
    issue: 639
    url: https://github.com/anton-abyzov/specweave/issues/639
---

# US-002: AC-Task Mapping

**GitHub Project**: https://github.com/anton-abyzov/specweave/issues/631

**Feature**: [FS-047](../../_features/FS-047/FEATURE.md)

**As a** PM validating increment quality
**I want** tasks to declare which Acceptance Criteria they satisfy
**So that** I can verify all ACs are covered by at least one task

---

## Acceptance Criteria

- [x] **AC-US2-01**: Every task has **Satisfies ACs** field listing AC-IDs (format: `**Satisfies ACs**: AC-US1-01, AC-US1-02`)
- [x] **AC-US2-02**: Parser validates AC-IDs exist in spec.md
- [x] **AC-US2-03**: Multiple tasks can satisfy the same AC (shared coverage)
- [x] **AC-US2-04**: System detects orphan tasks (no satisfiesACs field)

---

## Implementation

**Increment**: [0047-us-task-linkage](../../../../increments/0047-us-task-linkage/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Add satisfiesACs field parsing
- [x] **T-006**: Implement AC-ID cross-reference validation
- [x] **T-007**: Implement orphan task detection
