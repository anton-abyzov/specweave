---
id: US-004
feature: FS-063
title: "External ID Flow Through Increment Lifecycle"
status: completed
priority: P1
created: 2025-11-25T11:40:00Z
---

# US-004: External ID Flow Through Increment Lifecycle

**Feature**: [FS-063](./FEATURE.md)

**As a** SpecWeave user,
**I want** external item IDs (E suffix) to flow properly through increment creation and closure,
**So that** bidirectional sync works correctly with external tools.

---

## Acceptance Criteria

- [x] **AC-US4-01**: Creating increment from external US preserves E suffix and external metadata
- [x] **AC-US4-02**: Increment spec.md contains external origin link
- [x] **AC-US4-03**: On /specweave:done, progress syncs back to external tool
- [x] **AC-US4-04**: External tool shows task completion status from SpecWeave

---

## Implementation

**Increment**: [0063-fix-external-import-multi-repo](../../../../../../increments/_archive/0063-fix-external-import-multi-repo/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-014**: Verify increment creation from external US
- [x] **T-015**: Test /specweave:done syncs to external tool
- [x] **T-016**: Verify external tool shows task completion
- [ ] **T-019**: Manual integration test with sw-thumbnail-ab
