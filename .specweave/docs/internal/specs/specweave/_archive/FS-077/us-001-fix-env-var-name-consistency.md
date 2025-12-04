---
id: US-001
feature: FS-077
title: "Fix Env Var Name Consistency"
status: completed
priority: P1
created: 2025-11-27
---

# US-001: Fix Env Var Name Consistency

**Feature**: [FS-077](./FEATURE.md)

**As a** developer setting up ADO integration
**I want** the env vars to be written and read consistently
**So that** ADO validation and import work correctly

---

## Acceptance Criteria

- [x] **AC-US1-01**: `getAzureDevOpsEnvVars` writes env vars that `detectADOConfig` can read
- [x] **AC-US1-02**: Standardize on `AZURE_DEVOPS_*` prefix for all ADO env vars
- [x] **AC-US1-03**: `detectADOConfig` reads `AZURE_DEVOPS_ORG`, `AZURE_DEVOPS_PROJECT`, `AZURE_DEVOPS_PAT`
- [x] **AC-US1-04**: Write `AZURE_DEVOPS_PROJECTS` (plural) when multiple area paths selected
- [x] **AC-US1-05**: Backward compatibility: Also check legacy `ADO_*` vars during detection

---

## Implementation

**Increment**: [0077-ado-init-flow-critical-fixes](../../../../../../increments/_archive/0077-ado-init-flow-critical-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Standardize ADO env var names in ado.ts
- [x] **T-002**: Update config-detection.ts to read AZURE_DEVOPS_* vars
- [x] **T-003**: Write AZURE_DEVOPS_PROJECTS for multi-area setup
