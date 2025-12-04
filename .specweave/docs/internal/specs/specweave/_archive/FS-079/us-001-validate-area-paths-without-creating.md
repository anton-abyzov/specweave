---
id: US-001
feature: FS-079
title: "Validate Area Paths Without Creating"
status: completed
priority: P0
created: 2025-11-29
---

# US-001: Validate Area Paths Without Creating

**Feature**: [FS-079](./FEATURE.md)

**As a** developer with read-only ADO access
**I want** the validator to CHECK if area paths exist, not create them
**So that** initialization works without write permissions

---

## Acceptance Criteria

- [x] **AC-US1-01**: Change validator to use GET request to check area path existence
- [x] **AC-US1-02**: NEVER call createAreaPath() for user-selected paths (they already exist)
- [x] **AC-US1-03**: Only show warning if area path doesn't exist (don't try to create)
- [x] **AC-US1-04**: Remove `readOnly` logic - validation should ALWAYS be read-only

---

## Implementation

**Increment**: [0079-ado-init-flow-v2](../../../../../../increments/_archive/0079-ado-init-flow-v2/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Fix Area Path Validation (GET-only)
