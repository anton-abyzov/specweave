---
id: US-002
feature: FS-157
title: "Fix Skill Routing Logic"
status: completed
priority: P1
created: 2026-01-07
project: specweave-dev
---

# US-002: Fix Skill Routing Logic

**Feature**: [FS-157](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US2-01**: `/sw:increment` command invokes `increment-planner` skill directly
- [x] **AC-US2-02**: `/sw:plan` is ONLY called for existing increments with spec.md
- [x] **AC-US2-03**: Update `/sw:increment` command documentation to clarify workflow
- [x] **AC-US2-04**: `/sw:plan` validates increment exists before proceeding
- [x] **AC-US2-05**: Error message when `/sw:plan` called on non-existent increment is clear and helpful

---

## Implementation

**Increment**: [0157-skill-routing-optimization](../../../../increments/0157-skill-routing-optimization/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
