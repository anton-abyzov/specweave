---
id: US-001
feature: FS-093
title: "Permission Enforcement"
status: completed
priority: P1
created: 2025-12-02
---

**Origin**: 🏠 **Internal**


# US-001: Permission Enforcement

**Feature**: [FS-093](./FEATURE.md)

**As a** project admin
**I want** ADO commands to respect permission settings
**So that** I can control when external tool writes are allowed

---

## Acceptance Criteria

- [x] **AC-US1-01**: `/specweave-ado:create-workitem` checks `canUpdateExternalItems` before creating
- [x] **AC-US1-02**: `/specweave-ado:sync` checks permissions before writing to ADO
- [x] **AC-US1-03**: Permission denied shows clear error message with how to enable
- [ ] **AC-US1-04**: Read-only operations (status check) always allowed

---

## Implementation

**Increment**: [0093-ado-permission-profile-fixes](../../../../../increments/0093-ado-permission-profile-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-001](../../../../../increments/0093-ado-permission-profile-fixes/tasks.md#T-001): Create ADO Permission Gate Library
- [x] [T-003](../../../../../increments/0093-ado-permission-profile-fixes/tasks.md#T-003): Update specweave-ado-create-workitem Command
- [x] [T-004](../../../../../increments/0093-ado-permission-profile-fixes/tasks.md#T-004): Update specweave-ado-sync Command
- [x] [T-005](../../../../../increments/0093-ado-permission-profile-fixes/tasks.md#T-005): Update specweave-ado-close-workitem Command
- [x] [T-006](../../../../../increments/0093-ado-permission-profile-fixes/tasks.md#T-006): Update ADO Manager Agent