---
id: US-005
feature: FS-145
title: ADO Sync Adapter (P1)
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 934
    url: https://github.com/anton-abyzov/specweave/issues/934
---

# US-005: ADO Sync Adapter (P1)

**Feature**: [FS-145](./FEATURE.md)

**As a** SpecWeave user with Azure DevOps integration
**I want** project changes to sync to ADO area paths automatically
**So that** my ADO work items are correctly organized

---

## Acceptance Criteria

- [x] **AC-US5-01**: Create `ADOProjectAdapter` that subscribes to project events
- [x] **AC-US5-02**: On `ProjectCreated`: Create area path in ADO (if permissions allow)
- [x] **AC-US5-03**: On `ProjectUpdated`: Update area path name
- [x] **AC-US5-04**: Map registry project ID to ADO area path
- [x] **AC-US5-05**: Handle ADO rate limits and errors gracefully

---

## Implementation

**Increment**: [0145-project-registry-eda-sync](../../../../increments/0145-project-registry-eda-sync/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-010**: Implement ADO Project Adapter
- [x] **T-012**: Unit Tests for Adapters
