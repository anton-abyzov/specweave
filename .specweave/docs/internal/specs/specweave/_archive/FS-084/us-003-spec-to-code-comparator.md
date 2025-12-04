---
id: US-003
feature: FS-084
title: "Spec-to-Code Comparator"
status: completed
priority: P1
created: 2025-12-01
---

# US-003: Spec-to-Code Comparator

**Feature**: [FS-084](./FEATURE.md)

**As a** developer,
**I want** automatic comparison between specs and code,
**So that** I can identify discrepancies.

---

## Acceptance Criteria

- [x] **AC-US3-01**: Compare documented API routes to actual routes
- [x] **AC-US3-02**: Compare documented function signatures to actual signatures
- [x] **AC-US3-03**: Identify added/removed/modified items
- [x] **AC-US3-04**: Classify severity (trivial/minor/major/breaking)
- [x] **AC-US3-05**: Generate discrepancy report with file locations

---

## Implementation

**Increment**: [0084-discrepancy-detection](../../../../../../increments/_archive/0084-discrepancy-detection/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: Implement Spec Parser
- [x] **T-004**: Implement Discrepancy Detector
- [x] **T-005**: Implement Severity Classifier
- [x] **T-007**: Add Unit & Integration Tests
