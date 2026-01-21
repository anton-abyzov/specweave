---
id: US-001
feature: FS-150
title: Intelligent Prompt Chunking
status: completed
priority: P0
created: 2025-12-30
project: specweave
external:
  github:
    issue: 983
    url: https://github.com/anton-abyzov/specweave/issues/983
---

# US-001: Intelligent Prompt Chunking

**Feature**: [FS-150](./FEATURE.md)

**As a** developer using `/sw:auto "big feature description"`
**I want** auto mode to analyze the scope and create multiple right-sized increments
**So that** I get proper planning before execution starts

---

## Acceptance Criteria

- [x] **AC-US1-01**: When prompt describes 3+ features, auto creates separate increments
- [x] **AC-US1-02**: Each increment is 5-15 tasks (sweet spot)
- [x] **AC-US1-03**: Dependencies between increments are identified
- [x] **AC-US1-04**: User is shown increment plan before execution starts
- [x] **AC-US1-05**: User can approve/modify plan before auto continues

---

## Implementation

**Increment**: [0150-auto-mode-world-class-testing](../../../../increments/0150-auto-mode-world-class-testing/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-008**: Create prompt-chunker module
- [x] **T-009**: Implement increment planning algorithm
- [x] **T-010**: Add user approval step for increment plan
- [x] **T-011**: Integrate chunking into /sw:auto command
- [x] **T-025**: Update auto.md documentation
