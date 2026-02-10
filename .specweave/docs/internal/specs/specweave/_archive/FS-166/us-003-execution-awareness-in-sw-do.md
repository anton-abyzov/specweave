---
id: US-003
feature: FS-166
title: Execution Awareness in /sw:do
status: completed
priority: P1
created: 2026-01-09
project: specweave
external:
  github:
    issue: 1006
    url: https://github.com/anton-abyzov/specweave/issues/1006
---

# US-003: Execution Awareness in /sw:do

**Feature**: [FS-166](./FEATURE.md)

**As a** developer running `/sw:do` on a TDD increment
**I want** the system to remind me of TDD workflow
**So that** I don't accidentally skip the test-first approach

---

## Acceptance Criteria

- [x] **AC-US3-01**: `/sw:do` checks `testMode` from metadata.json at start
- [x] **AC-US3-02**: When TDD mode, show TDD reminder banner before task execution
- [x] **AC-US3-03**: Suggest `/sw:tdd-cycle` for guided TDD workflow
- [x] **AC-US3-04**: Parse task phase markers and display current phase

---

## Implementation

**Increment**: [0166-tdd-enforcement-behavioral](../../../../increments/0166-tdd-enforcement-behavioral/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-013**: [RED] Write test for /sw:do TDD mode detection
- [x] **T-014**: [GREEN] Add TDD awareness to /sw:do command
- [x] **T-015**: [REFACTOR] Extract TDD banner to reusable component
- [x] **T-028**: Write integration test for full TDD workflow
