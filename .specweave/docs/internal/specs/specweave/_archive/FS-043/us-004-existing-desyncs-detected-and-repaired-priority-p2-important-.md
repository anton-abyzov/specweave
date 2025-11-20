---
id: US-004
feature: FS-043
title: "Existing Desyncs Detected and Repaired (Priority: P2 - Important)"
status: completed
priority: P1
created: 2025-11-18T00:00:00.000Z
---

# US-004: Existing Desyncs Detected and Repaired (Priority: P2 - Important)

**GitHub Project**: https://github.com/anton-abyzov/specweave/issues/625

**Feature**: [FS-043](../../_features/FS-043/FEATURE.md)

**As a** SpecWeave maintainer
**I want** a script to detect and repair existing spec.md/metadata.json desyncs
**So that** the codebase is in a clean state before deploying the fix

---

## Acceptance Criteria

- [x] **AC-US4-01**: Validation script scans all increments and finds desyncs
- [x] **AC-US4-02**: Repair script updates spec.md to match metadata.json (metadata.json is source of truth for repair)
- [x] **AC-US4-03**: Repair script logs all changes for audit trail

---

## Implementation

**Increment**: [0043-spec-md-desync-fix](../../../../increments/0043-spec-md-desync-fix/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-008**: Create Validation Command (validate-status-sync)
- [x] **T-009**: Implement Severity Calculation for Desyncs
- [x] **T-010**: Create Repair Script (repair-status-desync)
- [x] **T-011**: Implement Dry-Run Mode for Repair Script
- [x] **T-012**: Add Audit Logging to Repair Script
- [x] **T-016**: Run Validation Script on Current Codebase
- [x] **T-017**: Repair Existing Desyncs (0038, 0041, etc.)
- [x] **T-021**: Write E2E Test (Repair Script Workflow)
- [x] **T-023**: Manual Testing Checklist Execution
- [x] **T-024**: Update User Guide (Troubleshooting Section)
