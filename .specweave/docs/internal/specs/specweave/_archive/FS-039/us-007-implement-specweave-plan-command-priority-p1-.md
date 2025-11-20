---
id: US-007
feature: FS-039
title: "Implement /specweave:plan Command (Priority: P1)"
status: completed
priority: P1
created: 2025-11-16
---

# US-007: Implement /specweave:plan Command (Priority: P1)

**Feature**: [FS-039](../../_features/FS-039/FEATURE.md)

**As a** developer with a spec.md but no plan.md
**I want** to run /specweave:plan to generate plan.md and tasks.md
**So that** I can plan implementation without running /specweave:do

---

## Acceptance Criteria

- [ ] **AC-US7-01**: Command exists at /specweave:plan
- [ ] **AC-US7-02**: Accepts optional increment ID
- [ ] **AC-US7-03**: Auto-detects current increment if no ID provided
- [ ] **AC-US7-04**: Validates spec.md exists before planning
- [ ] **AC-US7-05**: Invokes Architect Agent to create plan.md
- [ ] **AC-US7-06**: Invokes test-aware-planner to create tasks.md
- [ ] **AC-US7-07**: Updates metadata.json with planning timestamp
- [ ] **AC-US7-08**: Handles multi-project mode

---

## Implementation

**Increment**: [0039-ultra-smart-next-command](../../../../increments/0039-ultra-smart-next-command/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
