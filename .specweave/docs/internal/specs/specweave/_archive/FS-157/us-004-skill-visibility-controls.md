---
id: US-004
feature: FS-157
title: "Skill Visibility Controls"
status: completed
priority: P1
created: 2026-01-07
project: specweave-dev
---

# US-004: Skill Visibility Controls

**Feature**: [FS-157](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US4-01**: Add `visibility: "internal" | "public"` field to skill manifests
- [x] **AC-US4-02**: Add `invocableBy: string[]` field to restrict which skills can invoke
- [x] **AC-US4-03**: `increment-planner` marked as `visibility: "internal"`
- [x] **AC-US4-04**: `increment-planner` only invocable by `["sw:increment"]`
- [x] **AC-US4-05**: Error message when user tries to call internal skill directly (ERROR_MESSAGES.INTERNAL_SKILL_DIRECT_CALL)
- [x] **AC-US4-06**: `/plugin list` command filters internal skills by default (documentation-based enforcement)
- [x] **AC-US4-07**: `/plugin list --all` shows internal skills with (internal) label (documentation-based enforcement)

---

## Implementation

**Increment**: [0157-skill-routing-optimization](../../../../increments/0157-skill-routing-optimization/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
