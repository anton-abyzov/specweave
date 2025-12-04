---
id: US-001
feature: FS-075
title: "Smart PAT-First Authentication"
status: completed
priority: P1
created: 2025-12-02
---

# US-001: Smart PAT-First Authentication

**Feature**: [FS-075](./FEATURE.md)

**As a** developer setting up SpecWeave with Azure DevOps
**I want** to enter my PAT early in the flow
**So that** SpecWeave can auto-fetch my teams and area paths

---

## Acceptance Criteria

- [x] **AC-US1-01**: Ask org, project, then PAT (before teams)
- [x] **AC-US1-02**: Validate PAT immediately after entry
- [x] **AC-US1-03**: Show helpful error if PAT validation fails
- [x] **AC-US1-04**: Cache org/project for re-init (existing behavior)

---

## Implementation

**Increment**: [0075-smart-ado-init](../../../../../../increments/_archive/0075-smart-ado-init/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Reorder ADO prompt flow - PAT before teams
