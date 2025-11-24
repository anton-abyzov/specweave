---
id: US-003
feature: FS-043
title: "Hooks Read Correct Increment Status (Priority: P1 - CRITICAL)"
status: completed
priority: P1
created: 2025-11-18T00:00:00.000Z
---

# US-003: Hooks Read Correct Increment Status (Priority: P1 - CRITICAL)

**Feature**: [FS-043](../../_features/FS-043/FEATURE.md)

**As a** developer using GitHub/JIRA/ADO sync
**I want** hooks to read the latest increment status from spec.md
**So that** external tools stay in sync with SpecWeave state

---

## Acceptance Criteria

- [ ] **AC-US3-01**: Status line hook (`update-status-line.sh`) reads spec.md and finds correct status
- [ ] **AC-US3-02**: Living docs sync hooks read spec.md frontmatter and get correct status
- [ ] **AC-US3-03**: GitHub sync reads completed status from spec.md and closes GitHub issue

---

## Implementation

**Increment**: [0043-spec-md-desync-fix](../../../../increments/0043-spec-md-desync-fix/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-013**: Test Status Line Hook Reads Updated spec.md
- [ ] **T-023**: Manual Testing Checklist Execution
