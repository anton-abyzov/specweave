---
id: US-003
feature: FS-174
title: "Multi-Skill Coordination"
status: not_started
priority: P1
created: 2025-01-23
tldr: "Multi-Skill Coordination"
project: specweave
---

**Origin**: 🏠 **Internal**


# US-003: Multi-Skill Coordination

**Feature**: [FS-174](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US3-01**: Multiple skills can be returned in priority order
- [ ] **AC-US3-02**: TDD mode + domain skill = testing skill comes first
- [ ] **AC-US3-03**: `with_primary` timing for parallel skill usage
- [ ] **AC-US3-04**: `after_primary` timing for sequential skill usage

---

## Implementation

**Increment**: [0174-router-brain-orchestrator](../../../../increments/0174-router-brain-orchestrator/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] [T-006](../../../../increments/0174-router-brain-orchestrator/tasks.md#T-006): Handle multi-skill coordination