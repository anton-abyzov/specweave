---
id: US-011
feature: FS-148
title: "TDD Enforcement for Auto Mode"
status: completed
priority: P1
created: 2025-12-29
project: specweave
---

# US-011: TDD Enforcement for Auto Mode

**Feature**: [FS-148](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US11-01**: When starting auto session, check increment's `testMode` setting
- [x] **AC-US11-02**: If `testMode: test-after`, prompt user to switch to `test-first` for auto mode
- [x] **AC-US11-03**: Config option `auto.enforceTestFirst: true` blocks auto mode for test-after increments
- [x] **AC-US11-04**: In auto mode, always write failing tests BEFORE implementation (RED phase)
- [x] **AC-US11-05**: Run tests after implementation to verify GREEN phase
- [x] **AC-US11-06**: Coverage gates: block increment closure if coverage < threshold
- [x] **AC-US11-07**: Test results drive "done" determination, not subjective judgment

---

## Implementation

**Increment**: [0148-autonomous-execution-auto](../../../../increments/0148-autonomous-execution-auto/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
