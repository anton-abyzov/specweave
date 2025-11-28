---
id: US-001
feature: FS-078
title: "Respect Sync Permissions in ADO Validator"
status: not_started
priority: P0
created: 2025-11-28
---

# US-001: Respect Sync Permissions in ADO Validator

**Feature**: [FS-078](./FEATURE.md)

**As a** developer with read-only ADO access
**I want** the validator to NOT try creating area paths
**So that** initialization succeeds without API errors

---

## Acceptance Criteria

- [ ] **AC-US1-01**: Read `syncPermissions` from config.json before validation
- [ ] **AC-US1-02**: If `canUpsertInternalItems=false`, skip ALL create operations
- [ ] **AC-US1-03**: Validator only CHECKS existence (GET requests), never creates (POST)
- [ ] **AC-US1-04**: Log clear message: "Skipping area path creation (read-only mode)"

---

## Implementation

**Increment**: [0078-ado-init-validation-critical-fixes](../../../../increments/0078-ado-init-validation-critical-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
