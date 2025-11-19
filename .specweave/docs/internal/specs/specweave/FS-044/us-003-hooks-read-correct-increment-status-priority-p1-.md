---
id: US-003
feature: FS-044
title: "Hooks Read Correct Increment Status (Priority: P1)"
status: completed
priority: P2
created: 2025-11-19T00:00:00.000Z
---

# US-003: Hooks Read Correct Increment Status (Priority: P1)

**Feature**: [FS-044](../../_features/FS-044/FEATURE.md)

**As a** developer using GitHub/JIRA/ADO sync
**I want** hooks to read the latest increment status from spec.md
**So that** external tools stay in sync with SpecWeave state

---

## Acceptance Criteria

- [x] **AC-US3-01**: Status line hook (`update-status-line.sh`) reads spec.md and finds correct status
- [x] **AC-US3-02**: Living docs sync hooks read spec.md frontmatter and get correct status
- [x] **AC-US3-03**: GitHub sync reads completed status from spec.md and closes GitHub issue

---

## Implementation

**Increment**: [0044-integration-testing-status-hooks](../../../../increments/0044-integration-testing-status-hooks/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-013**: Test Status Line Hook Reads Updated spec.md
- [x] **T-020**: Write E2E Test (Full Increment Lifecycle)
- [x] **T-023**: Manual Testing Checklist Execution
