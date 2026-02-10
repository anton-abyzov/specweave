---
id: US-004
feature: FS-166
title: Enforcement Hook Enhancement
status: completed
priority: P1
created: 2026-01-09
project: specweave
external:
  github:
    issue: 1007
    url: https://github.com/anton-abyzov/specweave/issues/1007
---

# US-004: Enforcement Hook Enhancement

**Feature**: [FS-166](./FEATURE.md)

**As a** team lead
**I want** configurable enforcement (warn vs block)
**So that** I can choose the right strictness for my team

---

## Acceptance Criteria

- [x] **AC-US4-01**: Add `testing.tddEnforcement` config option: `"strict"` | `"warn"` | `"off"`
- [x] **AC-US4-02**: When `strict`, hook BLOCKS completing GREEN before RED
- [x] **AC-US4-03**: When `warn` (default), hook warns but allows
- [x] **AC-US4-04**: When `off`, no TDD enforcement
- [x] **AC-US4-05**: Update `tdd-enforcement-guard.sh` to read enforcement level from config

---

## Implementation

**Increment**: [0166-tdd-enforcement-behavioral](../../../../increments/0166-tdd-enforcement-behavioral/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-016**: [RED] Write test for tddEnforcement config option
- [x] **T-017**: [GREEN] Add tddEnforcement to config schema
- [x] **T-018**: [REFACTOR] Add config validation for tddEnforcement
- [x] **T-019**: [RED] Write test for strict enforcement blocking
- [x] **T-020**: [GREEN] Implement strict blocking in tdd-enforcement-guard.sh
- [x] **T-021**: [REFACTOR] Improve enforcement error messages
- [x] **T-028**: Write integration test for full TDD workflow
- [ ] **T-029**: Update CLAUDE.md with TDD enforcement documentation
