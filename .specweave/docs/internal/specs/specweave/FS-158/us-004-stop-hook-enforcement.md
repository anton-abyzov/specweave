---
id: US-004
feature: FS-158
title: "Stop Hook Enforcement"
status: completed
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-004: Stop Hook Enforcement

**Feature**: [FS-158](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US4-01**: `stop-auto.sh` calls `validate-completion-conditions.sh` BEFORE task completion check
- [x] **AC-US4-02**: If ANY condition fails, HARD BLOCK with detailed failure report
- [x] **AC-US4-03**: Show failed conditions with specific error details (which tests failed, which routes untested)
- [x] **AC-US4-04**: Show passed conditions with green checkmarks
- [x] **AC-US4-05**: E2E enforcement uses structured output parsing (JSON reporter), not grep
- [x] **AC-US4-06**: Coverage validation reads actual coverage report files
- [x] **AC-US4-07**: Exit code validation (command must return 0)
- [x] **AC-US4-08**: Mandatory conditions cannot be bypassed (no --skip-gates for mandatory)
- [x] **AC-US4-09**: Log condition validation results to `auto-iterations.log`
- [x] **AC-US4-10**: Re-feed prompt includes instructions to fix failed conditions

---

## Implementation

**Increment**: [0158-smart-completion-conditions](../../../../increments/0158-smart-completion-conditions/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
