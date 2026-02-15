---
id: US-009
feature: FS-190
title: "GitHub Projects v2 Integration (P1)"
status: completed
priority: P0
created: "2026-02-06T00:00:00.000Z"
tldr: "**As a** SpecWeave user managing work in GitHub Projects v2
**I want** synced issues to be added to a GitHub Project board with custom fields
**So that** I can track SpecWeave increments on a modern kanban/board view."
project: specweave
---

# US-009: GitHub Projects v2 Integration (P1)

**Feature**: [FS-190](./FEATURE.md)

**As a** SpecWeave user managing work in GitHub Projects v2
**I want** synced issues to be added to a GitHub Project board with custom fields
**So that** I can track SpecWeave increments on a modern kanban/board view

---

## Acceptance Criteria

- [x] **AC-US9-01**: Given a configured GitHub Project ID, when issues are created, then they are automatically added to the project
- [x] **AC-US9-02**: Given a project with a Status field, when an increment's status changes, then the corresponding project item's Status field is updated
- [x] **AC-US9-03**: Given a project with custom fields (Priority, Sprint, etc.), when syncing, then SpecWeave maps its fields to the project's custom fields
- [x] **AC-US9-04**: Given a bidirectional setup, when a project item's status changes in GitHub, then SpecWeave detects and applies the change on next pull
- [x] **AC-US9-05**: Given the setup wizard, when configuring GitHub sync, then the user can optionally select a GitHub Project to sync with

---

## Implementation

**Increment**: [0190-sync-architecture-redesign](../../../../increments/0190-sync-architecture-redesign/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
