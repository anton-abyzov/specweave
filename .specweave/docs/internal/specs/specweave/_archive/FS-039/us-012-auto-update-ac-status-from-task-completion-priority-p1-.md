---
id: US-012
feature: FS-039
title: "Auto-Update AC Status from Task Completion (Priority: P1)"
status: completed
priority: P1
created: 2025-11-16
---

# US-012: Auto-Update AC Status from Task Completion (Priority: P1)

**Feature**: [FS-039](../../_features/FS-039/FEATURE.md)

**As a** developer working on SpecWeave increments
**I want** spec.md AC checkboxes to automatically update when related tasks complete
**So that** AC status always reflects actual implementation progress without manual updates

---

## Acceptance Criteria

- [ ] **AC-US12-01**: Detect task completion via **AC**: tag in tasks.md
- [ ] **AC-US12-02**: Parse spec.md to find corresponding AC checkbox
- [ ] **AC-US12-03**: Update AC checkbox from [ ] to [x] when all related tasks complete
- [ ] **AC-US12-04**: Handle partial completion (some tasks done, others not)
- [ ] **AC-US12-05**: Integrate into post-task-completion hook
- [ ] **AC-US12-06**: Manual command /specweave:sync-acs to force sync
- [ ] **AC-US12-07**: Validate AC-task mapping (ensure all ACs have tasks)
- [ ] **AC-US12-08**: Show diff before updating spec.md
- [ ] **AC-US12-09**: Rollback capability if user rejects changes
- [ ] **AC-US12-10**: Log AC status changes to metadata.json

---

## Implementation

**Increment**: [0039-ultra-smart-next-command](../../../../increments/0039-ultra-smart-next-command/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
