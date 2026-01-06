---
id: US-002
feature: FS-156
title: SpecWeave Project Detection
status: not_started
priority: P1
created: 2026-01-06
project: specweave
external:
  github:
    issue: 972
    url: https://github.com/anton-abyzov/specweave/issues/972
---

# US-002: SpecWeave Project Detection

**Feature**: [FS-156](./FEATURE.md)

**As a** SpecWeave contributor
**I want** reflection to detect when running in SpecWeave project itself
**So that** learnings update SKILL.md directly (not MEMORY.md)

---

## Acceptance Criteria

- [ ] **AC-US2-01**: Detect SpecWeave project by checking `package.json` name field
- [ ] **AC-US2-02**: When in SpecWeave project, update `SKILL.md` with learnings
- [ ] **AC-US2-03**: When in user project, update `MEMORY.md` with learnings
- [ ] **AC-US2-04**: Clear logging shows which mode is active

---

## Implementation

**Increment**: [0156-per-skill-reflection-memory-override](../../../../increments/0156-per-skill-reflection-memory-override/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-005**: Implement SpecWeave project detection
- [ ] **T-006**: Route learnings to skill MEMORY.md or SKILL.md
