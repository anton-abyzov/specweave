---
id: US-002
feature: FS-119
title: Validation Guard for spec.md Project/Board (P1)
status: completed
priority: P1
created: 2025-12-07
project: specweave
external:
  github:
    issue: 848
    url: https://github.com/anton-abyzov/specweave/issues/848
---

# US-002: Validation Guard for spec.md Project/Board (P1)

**Feature**: [FS-119](./FEATURE.md)

**As a** framework maintainer
**I want** a validation hook that blocks spec.md creation with invalid project/board
**So that** living docs sync works correctly from day one

---

## Acceptance Criteria

- [x] **AC-US2-01**: Hook detects 1-level vs 2-level structure using `detectStructureLevel()`
- [x] **AC-US2-02**: For 1-level: BLOCK if `project:` is missing or unresolved placeholder
- [x] **AC-US2-03**: For 2-level: BLOCK if `project:` OR `board:` is missing or placeholder
- [x] **AC-US2-04**: Provide clear error message with available projects/boards
- [x] **AC-US2-05**: Allow override with `--force` flag for edge cases

---

## Implementation

**Increment**: [0119-project-board-context-enforcement](../../../../increments/0119-project-board-context-enforcement/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Enhance spec-project-validator hook with detection API 🧠
- [x] **T-005**: Add --force bypass to validation hook ⚡
