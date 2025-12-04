---
id: US-002
feature: FS-059
title: "Lazy Skill Loading"
status: completed
priority: P0
created: 2025-11-26
---

# US-002: Lazy Skill Loading

**Feature**: [FS-059](./FEATURE.md)

**As a** Claude Code user
**I want** skills loaded only when their keywords are detected
**So that** startup doesn't load 117 skills (1.28 MB) upfront

---

## Acceptance Criteria

- [x] **AC-US2-01**: Skills index loaded at startup (not full content)
- [x] **AC-US2-02**: Full SKILL.md loaded only on keyword match
- [x] **AC-US2-03**: Skill activation triggers documented in index
- [x] **AC-US2-04**: 80%+ reduction in initial skill context

---

## Implementation

**Increment**: [0059-context-optimization-crash-prevention](../../../../../../increments/_archive/0059-context-optimization-crash-prevention/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-008**: Add trigger keywords to SKILLS-INDEX.md
- [x] **T-009**: Document lazy loading pattern
- [x] **T-012**: End-to-end crash prevention test
