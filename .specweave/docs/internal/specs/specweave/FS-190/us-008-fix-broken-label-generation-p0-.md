---
id: US-008
feature: FS-190
title: "Fix Broken Label Generation (P0)"
status: completed
priority: P0
created: "2026-02-06T00:00:00.000Z"
tldr: "**As a** SpecWeave user syncing to GitHub
**I want** labels to correctly reflect item priority and avoid redundancy
**So that** GitHub Issues are properly categorized and filterable."
project: specweave
---

# US-008: Fix Broken Label Generation (P0)

**Feature**: [FS-190](./FEATURE.md)

**As a** SpecWeave user syncing to GitHub
**I want** labels to correctly reflect item priority and avoid redundancy
**So that** GitHub Issues are properly categorized and filterable

---

## Acceptance Criteria

- [x] **AC-US8-01**: Given a user story with priority P1, when synced to GitHub, then the issue gets a `priority:P1` label (not `critical` unless actually P0)
- [x] **AC-US8-02**: Given label generation, when creating labels, then only ONE project label format is used: `project:specweave` (not both `project:specweave` and `specweave`)
- [x] **AC-US8-03**: Given a user story with type `user-story`, when synced, then a `type:user-story` label is applied
- [x] **AC-US8-04**: Given the `autoApplyLabels` config, when set to true, then labels are created in the repo if they don't exist (with appropriate colors)
- [x] **AC-US8-05**: Given existing issues with wrong labels, when reconciliation runs, then labels are corrected to match the new scheme

---

## Implementation

**Increment**: [0190-sync-architecture-redesign](../../../../increments/0190-sync-architecture-redesign/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
