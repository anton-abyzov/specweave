---
id: US-002
feature: FS-174
title: "Workflow Sequencing"
status: not_started
priority: P1
created: 2025-01-23
tldr: "Workflow Sequencing"
project: specweave
---

**Origin**: 🏠 **Internal**


# US-002: Workflow Sequencing

**Feature**: [FS-174](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US2-01**: Workflow phases returned (preparation, skill_activation, implementation)
- [ ] **AC-US2-02**: `invokeWhen: "after_increment"` delays skill use until increment exists
- [ ] **AC-US2-03**: `invokeWhen: "after_planning"` waits for plan mode approval
- [ ] **AC-US2-04**: Complex tasks trigger plan mode suggestion

---

## Implementation

**Increment**: [0174-router-brain-orchestrator](../../../../increments/0174-router-brain-orchestrator/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] [T-005](../../../../increments/0174-router-brain-orchestrator/tasks.md#T-005): Build brain message with workflow steps