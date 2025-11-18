---
id: US-004
feature: FS-043
title: "Existing Desyncs Detected and Repaired (Priority: P2 - Important)"
status: planning
priority: P1
created: 2025-11-18
---

# US-004: Existing Desyncs Detected and Repaired (Priority: P2 - Important)

**Feature**: [FS-043](../../_features/FS-043/FEATURE.md)

**As a** SpecWeave maintainer
**I want** a script to detect and repair existing spec.md/metadata.json desyncs
**So that** the codebase is in a clean state before deploying the fix

---

## Acceptance Criteria

No acceptance criteria defined.

---

## Implementation

**Increment**: [0043-spec-md-desync-fix](../../../../increments/0043-spec-md-desync-fix/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-008**: Create Validation Command (validate-status-sync)
- [ ] **T-009**: Implement Severity Calculation for Desyncs
- [ ] **T-010**: Create Repair Script (repair-status-desync)
- [ ] **T-011**: Implement Dry-Run Mode for Repair Script
- [ ] **T-012**: Add Audit Logging to Repair Script
- [ ] **T-016**: Run Validation Script on Current Codebase
- [ ] **T-017**: Repair Existing Desyncs (0038, 0041, etc.)
- [ ] **T-021**: Write E2E Test (Repair Script Workflow)
- [ ] **T-023**: Manual Testing Checklist Execution
- [ ] **T-024**: Update User Guide (Troubleshooting Section)
