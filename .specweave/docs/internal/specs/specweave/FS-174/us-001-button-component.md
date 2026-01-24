---
id: US-001
feature: FS-174
title: "Skill Routing Detection"
status: not_started
priority: P1
created: 2025-01-23
tldr: "Skill Routing Detection"
project: specweave
---

**Origin**: 🏠 **Internal**


# US-001: Skill Routing Detection

**Feature**: [FS-174](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US1-01**: LLM detection returns `routing.skills[]` array with skill names
- [ ] **AC-US1-02**: Each skill has `invokeWhen` timing (immediate, after_increment, after_planning)
- [ ] **AC-US1-03**: Primary skill is identified for multi-skill tasks
- [ ] **AC-US1-04**: Confidence score included for skill routing decisions

---

## Implementation

**Increment**: [0174-router-brain-orchestrator](../../../../increments/0174-router-brain-orchestrator/spec.md)

**Tasks**: See increment tasks.md for implementation details.
