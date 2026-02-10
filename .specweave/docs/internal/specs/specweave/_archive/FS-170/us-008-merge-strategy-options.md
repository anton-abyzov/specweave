---
id: US-008
feature: FS-170
title: "Merge Strategy Options"
status: completed
priority: P0
created: 2026-01-20
project: specweave-dev
---

# US-008: Merge Strategy Options

**Feature**: [FS-170](./FEATURE.md)

**As a** developer,
**I want** to control how parallel work is merged,
**So that** I choose the appropriate integration approach.

---

## Acceptance Criteria

- [x] **AC-US8-01**: `--merge-strategy auto` attempts automatic merge
- [x] **AC-US8-02**: `--merge-strategy manual` never auto-merges
- [x] **AC-US8-03**: `--merge-strategy pr` creates PR instead of merging
- [x] **AC-US8-04**: `--base-branch NAME` sets merge target
- [x] **AC-US8-05**: Conflict detection with clear error messages
- [x] **AC-US8-06**: Merge order respects dependencies (db → backend → frontend)
- [x] **AC-US8-07**: Test coverage for merge logic ≥90%

---

## Implementation

**Increment**: [0170-parallel-auto-mode](../../../../increments/0170-parallel-auto-mode/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-017**: Add Merge Methods to Worktree Manager
- [x] **T-018**: Create Merge Tests
- [x] **T-019**: Extend Auto Command Options
