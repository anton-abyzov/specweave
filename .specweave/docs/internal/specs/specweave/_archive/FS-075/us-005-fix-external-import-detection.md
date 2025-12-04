---
id: US-005
feature: FS-075
title: "Fix External Import Detection"
status: completed
priority: P1
created: 2025-12-02
---

# US-005: Fix External Import Detection

**Feature**: [FS-075](./FEATURE.md)

**As a** developer
**I want** external import to detect my ADO configuration
**So that** work items are imported during init

---

## Acceptance Criteria

- [x] **AC-US5-01**: `detectAllConfigs()` properly detects ADO from config.json
- [x] **AC-US5-02**: Import coordinator builds valid ADO config
- [x] **AC-US5-03**: ADOImporter initializes with correct orgUrl and PAT
- [x] **AC-US5-04**: Import successfully fetches work items from selected area paths

---

## Implementation

**Increment**: [0075-smart-ado-init](../../../../../../increments/_archive/0075-smart-ado-init/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-009**: Fix detectAllConfigs for ADO
