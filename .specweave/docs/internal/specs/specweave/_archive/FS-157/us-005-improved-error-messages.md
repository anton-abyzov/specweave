---
id: US-005
feature: FS-157
title: "Improved Error Messages"
status: completed
priority: P1
created: 2026-01-07
project: specweave-dev
---

# US-005: Improved Error Messages

**Feature**: [FS-157](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US5-01**: `/sw:plan` without existing increment shows helpful error with next steps (error-formatter.ts integrated)
- [x] **AC-US5-02**: Error distinguishes between "create new" vs "plan existing" (ERROR_MESSAGES.WRONG_COMMAND_FOR_NEW_INCREMENT)
- [x] **AC-US5-03**: Error includes examples of correct usage (error formatter has example field)
- [x] **AC-US5-04**: Error shows available increments when ambiguous (ERROR_MESSAGES.INCREMENT_NOT_FOUND with suggestions)
- [x] **AC-US5-05**: All error messages follow consistent format with emoji indicators (formatError with severity icons)

---

## Implementation

**Increment**: [0157-skill-routing-optimization](../../../../increments/0157-skill-routing-optimization/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
