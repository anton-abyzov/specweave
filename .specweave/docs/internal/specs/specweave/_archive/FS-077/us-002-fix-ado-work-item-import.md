---
id: US-002
feature: FS-077
title: "Fix ADO Work Item Import"
status: completed
priority: P1
created: 2025-11-27
---

# US-002: Fix ADO Work Item Import

**Feature**: [FS-077](./FEATURE.md)

**As a** developer initializing SpecWeave with ADO
**I want** my work items to be imported to living docs
**So that** I can see existing work in the SpecWeave structure

---

## Acceptance Criteria

- [x] **AC-US2-01**: ADO detection succeeds when `AZURE_DEVOPS_*` vars are in `.env`
- [x] **AC-US2-02**: `promptAndRunExternalImport` correctly detects ADO configuration
- [x] **AC-US2-03**: Work items are imported and converted to User Stories
- [x] **AC-US2-04**: Imported items appear in `.specweave/docs/internal/specs/` structure

---

## Implementation

**Increment**: [0077-ado-init-flow-critical-fixes](../../../../../../increments/_archive/0077-ado-init-flow-critical-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Fix detectADOConfig return type
- [x] **T-005**: Add ADO to getSyncProfileProviders
