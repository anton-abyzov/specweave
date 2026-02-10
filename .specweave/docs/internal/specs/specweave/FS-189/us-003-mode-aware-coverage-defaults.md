---
id: US-003
feature: FS-189
title: "Mode-Aware Coverage Defaults"
status: completed
priority: P1
created: 2026-02-10
tldr: "**As a** developer selecting a test mode during init
**I want** the coverage default to adjust based on the mode I chose
**So that** I get sensible defaults without manual tuning."
project: specweave
---

# US-003: Mode-Aware Coverage Defaults

**Feature**: [FS-189](./FEATURE.md)

**As a** developer selecting a test mode during init
**I want** the coverage default to adjust based on the mode I chose
**So that** I get sensible defaults without manual tuning

---

## Acceptance Criteria

- [x] **AC-US3-01**: When `TDD` is selected, coverage prompt defaults to `90%`
- [x] **AC-US3-02**: When `test-after` is selected, coverage prompt defaults to `80%`
- [x] **AC-US3-03**: When `manual` or `none` is selected, coverage prompt is skipped (existing behavior preserved)

---

## Implementation

**Increment**: [0189-tdd-coverage-defaults](../../../../increments/0189-tdd-coverage-defaults/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
