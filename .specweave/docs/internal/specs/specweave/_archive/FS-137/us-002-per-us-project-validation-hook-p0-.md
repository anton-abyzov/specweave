---
id: US-002
feature: FS-137
title: "Per-US Project Validation Hook (P0)"
status: completed
priority: P0
created: 2025-12-09
project: specweave
board: field
related_projects: []
---

# US-002: Per-US Project Validation Hook (P0)

**Feature**: [FS-137](./FEATURE.md)

**As a** framework maintainer
**I want** a validation hook that BLOCKS spec.md writes missing per-US project fields
**So that** specs cannot be saved without proper project targeting

---

## Acceptance Criteria

- [x] **AC-US2-01**: Hook parses spec.md to count User Stories (### US-XXX pattern)
- [x] **AC-US2-02**: Hook counts USs with **Project**: field (line after heading)
- [x] **AC-US2-03**: Hook BLOCKS write if any US lacks **Project**: field
- [x] **AC-US2-04**: For 2-level structures, hook also requires **Board**: field
- [x] **AC-US2-05**: Error message lists which USs are missing fields
- [x] **AC-US2-06**: Error message shows available projects/boards from config
- [x] **AC-US2-07**: Hook can be bypassed with explicit `--force` flag

---

## Implementation

**Increment**: [0137-per-us-project-board-enforcement](../../../../increments/0137-per-us-project-board-enforcement/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create Per-US Project Validation Hook
- [x] **T-002**: Add Hook to hooks.json Configuration
- [x] **T-003**: Add 2-Level Board Validation
- [x] **T-004**: Add Bypass with --force Flag
- [x] **T-022**: Integration Tests for Cross-Project Workflow
