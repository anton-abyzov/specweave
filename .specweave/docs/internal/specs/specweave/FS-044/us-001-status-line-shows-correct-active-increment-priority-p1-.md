---
id: US-001
feature: FS-044
title: "Status Line Shows Correct Active Increment (Priority: P1)"
status: completed
priority: P2
created: 2025-11-19T00:00:00.000Z
---

# US-001: Status Line Shows Correct Active Increment (Priority: P1)

**Feature**: [FS-044](../../_features/FS-044/FEATURE.md)

**As a** developer working on SpecWeave
**I want** the status line to always show the CURRENT active increment
**So that** I know which increment I'm working on without manually checking folders

---

## Acceptance Criteria

- [x] **AC-US1-01**: When closing increment via `/specweave:done`, status line updates to next active increment
- [x] **AC-US1-02**: Status line never shows completed increments as active
- [x] **AC-US1-03**: Status line hook reads spec.md and finds correct status (not stale "active")

---

## Implementation

**Increment**: [0044-integration-testing-status-hooks](../../../../increments/0044-integration-testing-status-hooks/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-013**: Test Status Line Hook Reads Updated spec.md
- [x] **T-014**: Test /specweave:done Updates spec.md
- [x] **T-020**: Write E2E Test (Full Increment Lifecycle)
- [x] **T-021**: Write E2E Test (Repair Script Workflow)
- [x] **T-023**: Manual Testing Checklist Execution
