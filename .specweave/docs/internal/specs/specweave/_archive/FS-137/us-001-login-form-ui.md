---
id: US-001
feature: FS-137
title: "Pre-Planning Context Injection (P0)"
status: completed
priority: P0
created: 2025-12-09
project: specweave
related_projects: []
---

# US-001: Pre-Planning Context Injection (P0)

**Feature**: [FS-137](./FEATURE.md)

**As a** user creating a new increment
**I want** project/board context automatically injected before Claude generates spec.md
**So that** Claude has the information needed to assign projects per US

---

## Acceptance Criteria

- [x] **AC-US1-01**: `/specweave:increment` hook detects structure level before planning starts
- [x] **AC-US1-02**: Available projects/boards are listed in a context block injected into conversation
- [x] **AC-US1-03**: Context block includes clear instructions that each US needs **Project**: field
- [x] **AC-US1-04**: For 2-level structures, context block includes board options per project
- [x] **AC-US1-05**: Context injection happens BEFORE Claude starts generating spec.md content

---

## Implementation

**Increment**: [0137-per-us-project-board-enforcement](../../../../increments/0137-per-us-project-board-enforcement/spec.md)

**Tasks**: See increment tasks.md for implementation details.
