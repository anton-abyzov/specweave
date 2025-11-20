---
id: US-011
feature: FS-039
title: "Auto-Sync Plan and Tasks on Spec Changes (Priority: P1)"
status: completed
priority: P1
created: 2025-11-16
---

# US-011: Auto-Sync Plan and Tasks on Spec Changes (Priority: P1)

**Feature**: [FS-039](../../_features/FS-039/FEATURE.md)

**As a** developer who needs to update spec.md after planning
**I want** plan.md and tasks.md to automatically regenerate when spec.md changes
**So that** my implementation artifacts stay synchronized with the specification

---

## Acceptance Criteria

- [x] **AC-US11-01**: Detect when spec.md is modified after plan.md exists
- [ ] **AC-US11-02**: Automatically regenerate plan.md using Architect Agent
- [ ] **AC-US11-03**: Automatically regenerate tasks.md based on updated plan.md
- [ ] **AC-US11-04**: Preserve task completion status during regeneration
- [ ] **AC-US11-05**: Show clear diff of what changed in plan/tasks
- [x] **AC-US11-06**: User can skip auto-sync with --skip-sync flag
- [x] **AC-US11-07**: Hook works in Claude Code (via user-prompt-submit hook)
- [x] **AC-US11-08**: Instructions in AGENTS.md for non-Claude tools (Cursor, etc.)
- [x] **AC-US11-09**: Handle edge cases (spec.md deleted, invalid format, concurrent edits)
- [x] **AC-US11-10**: Log sync events to increment metadata

---

## Implementation

**Increment**: [0039-ultra-smart-next-command](../../../../increments/0039-ultra-smart-next-command/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
