---
id: US-001
feature: FS-156
title: Per-Skill MEMORY.md Architecture
status: not_started
priority: P1
created: 2026-01-06
project: specweave
external:
  github:
    issue: 971
    url: https://github.com/anton-abyzov/specweave/issues/971
---

# US-001: Per-Skill MEMORY.md Architecture

**Feature**: [FS-156](./FEATURE.md)

**As a** SpecWeave contributor working on skill improvements
**I want** each skill to have its own MEMORY.md file
**So that** learnings are stored with the skill they apply to

---

## Acceptance Criteria

- [ ] **AC-US1-01**: Each skill has `MEMORY.md` in its directory (e.g., `skills/pm/MEMORY.md`)
- [ ] **AC-US1-02**: MEMORY.md format matches reflect skill documentation (LRN-YYYYMMDD-XXXX IDs)
- [ ] **AC-US1-03**: Reflection system detects skill from learning context
- [ ] **AC-US1-04**: Skills load their MEMORY.md on activation
- [ ] **AC-US1-05**: Centralized memory (`.specweave/memory/*.md`) still supported as fallback

---

## Implementation

**Increment**: [0156-per-skill-reflection-memory-override](../../../../increments/0156-per-skill-reflection-memory-override/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-001**: Create Learning data model and types
- [ ] **T-002**: Implement MemoryManager class
- [ ] **T-003**: Implement ReflectionEngine skill detection
- [ ] **T-007**: Create MEMORY.md template
- [ ] **T-008**: Initialize MEMORY.md for existing skills
- [ ] **T-009**: Update skills to load MEMORY.md on activation
