---
id: US-003
feature: FS-059
title: "Hook Optimization"
status: completed
priority: P0
created: 2025-11-26
---

# US-003: Hook Optimization

**Feature**: [FS-059](./FEATURE.md)

**As a** Claude Code user
**I want** hooks to use caching and skip unnecessary work
**So that** every prompt doesn't spawn multiple node processes

---

## Acceptance Criteria

- [x] **AC-US3-01**: Discipline check cached for 30 seconds
- [x] **AC-US3-02**: Deduplication uses in-memory state (not node spawn)
- [x] **AC-US3-03**: Hooks skip when no .specweave/ directory
- [x] **AC-US3-04**: 90%+ reduction in hook overhead

---

## Implementation

**Increment**: [0059-context-optimization-crash-prevention](../../../../../../increments/_archive/0059-context-optimization-crash-prevention/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Add caching to user-prompt-submit.sh
- [x] **T-005**: Add caching to pre-command-deduplication.sh
- [x] **T-006**: Add early exit for non-SpecWeave projects
- [x] **T-007**: Measure hook performance improvement
- [x] **T-012**: End-to-end crash prevention test
