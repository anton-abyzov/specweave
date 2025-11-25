---
id: US-004
feature: FS-063
title: External ID Flow Through Increment Lifecycle
status: not_started
priority: P1
created: 2025-11-25T11:40:00Z
external_tools:
  github:
    number: 764
    url: https://github.com/anton-abyzov/specweave/issues/764
    created_at: 2025-11-25T18:04:58.662Z
---

# US-004: External ID Flow Through Increment Lifecycle

**Feature**: [FS-063](../../_features/FS-063/FEATURE.md)

**As a** SpecWeave user,
**I want** external item IDs (E suffix) to flow properly through increment creation and closure,
**So that** bidirectional sync works correctly with external tools.

---

## Acceptance Criteria

- [ ] **AC-US4-01**: Creating increment from external US preserves E suffix and external metadata
- [ ] **AC-US4-02**: Increment spec.md contains external origin link
- [ ] **AC-US4-03**: On /specweave:done, progress syncs back to external tool
- [ ] **AC-US4-04**: External tool shows task completion status from SpecWeave

---

## Implementation

**Increment**: [0063-fix-external-import-multi-repo](../../../../increments/0063-fix-external-import-multi-repo/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
