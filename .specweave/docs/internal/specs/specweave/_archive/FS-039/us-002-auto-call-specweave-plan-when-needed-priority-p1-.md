---
id: US-002
feature: FS-039
title: "Auto-Call /specweave:plan When Needed (Priority: P1)"
status: completed
priority: P1
created: 2025-11-16
---

# US-002: Auto-Call /specweave:plan When Needed (Priority: P1)

**Feature**: [FS-039](../../_features/FS-039/FEATURE.md)

**As a** developer who just created a spec.md
**I want** /specweave:next to automatically call /specweave:plan
**So that** I don't need to manually run the plan command

---

## Acceptance Criteria

- [ ] **AC-US2-01**: Detect spec.md exists without plan.md
- [ ] **AC-US2-02**: Auto-invoke Architect Agent to create plan.md
- [ ] **AC-US2-03**: Auto-invoke test-aware-planner to create tasks.md with embedded tests
- [ ] **AC-US2-04**: Validate plan.md and tasks.md were created successfully
- [ ] **AC-US2-05**: Handle planning errors gracefully
- [ ] **AC-US2-06**: User can skip auto-planning with --skip-plan flag

---

## Implementation

**Increment**: [0039-ultra-smart-next-command](../../../../increments/0039-ultra-smart-next-command/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
