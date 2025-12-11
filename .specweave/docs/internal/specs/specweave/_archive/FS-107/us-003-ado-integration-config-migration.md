---
id: US-003
feature: FS-107
title: ADO Integration Config Migration
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 835
    url: https://github.com/anton-abyzov/specweave/issues/835
---

# US-003: ADO Integration Config Migration

**Feature**: [FS-107](./FEATURE.md)

**As a** developer using ADO integration,
**I want** AZURE_DEVOPS_ORG and AZURE_DEVOPS_PROJECT to be loaded from config.json,
**So that** I can configure ADO settings in a shareable, version-controlled file.

---

## Acceptance Criteria

- [x] **AC-US3-01**: AdoReconciler reads organization from ConfigManager
- [x] **AC-US3-02**: env-multi-project-parser.ts is deprecated with migration warnings
- [x] **AC-US3-03**: sync-spec-* commands use ConfigManager for config values

---

## Implementation

**Increment**: [0107-enforce-config-json-separation](../../../../increments/0107-enforce-config-json-separation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-008**: Verify AdoReconciler implementation
- [x] **T-009**: Deprecate env-multi-project-parser.ts
- [x] **T-010**: Update sync-spec-* commands
