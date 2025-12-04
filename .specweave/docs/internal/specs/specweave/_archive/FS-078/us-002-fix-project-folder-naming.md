---
id: US-002
feature: FS-078
title: "Fix Project Folder Naming"
status: in_progress
priority: P0
created: 2025-11-28
---

# US-002: Fix Project Folder Naming

**Feature**: [FS-078](./FEATURE.md)

**As a** developer setting up ADO integration
**I want** the project folder to match the project name I specified
**So that** folder names are intuitive and consistent

---

## Acceptance Criteria

- [x] **AC-US2-01**: Use project name directly without prefix: `Acme` not `ADO-Acme`
- [x] **AC-US2-03**: Import and folder creation must use same naming convention

---

## Implementation

**Increment**: [0078-ado-init-validation-critical-fixes](../../../../../../increments/_archive/0078-ado-init-validation-critical-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Remove ADO- prefix from folder creation
- [x] **T-005**: Update import to match folder naming
