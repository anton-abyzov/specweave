---
id: US-001
feature: FS-043
title: "Status Line Shows Correct Active Increment (Priority: P1 - CRITICAL)"
status: completed
priority: P1
created: 2025-11-18T00:00:00.000Z
---

# US-001: Status Line Shows Correct Active Increment (Priority: P1 - CRITICAL)

**Feature**: [FS-043](../../_features/FS-043/FEATURE.md)

**As a** developer working on SpecWeave
**I want** the status line to always show the CURRENT active increment
**So that** I know which increment I'm working on without manually checking folders

---

## Acceptance Criteria

- [ ] **AC-US1-01**: When closing increment via `/specweave:done`, status line updates to next active increment
- [ ] **AC-US1-02**: Status line never shows completed increments as active
- [ ] **AC-US1-03**: Status line hook reads spec.md and finds correct status (not stale "active")

---

## Implementation

**Increment**: [0043-spec-md-desync-fix](../../../../increments/0043-spec-md-desync-fix/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-013**: Test Status Line Hook Reads Updated spec.md
- [ ] **T-014**: Test /specweave:done Updates spec.md
- [ ] **T-020**: Write E2E Test (Full Increment Lifecycle)
- [ ] **T-023**: Manual Testing Checklist Execution
- [ ] **T-024**: Update User Guide (Troubleshooting Section)
