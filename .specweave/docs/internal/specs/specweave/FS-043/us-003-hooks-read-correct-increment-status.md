---
id: US-003
feature: FS-043
title: Hooks Read Correct Increment Status
status: planning
project: specweave
priority: P1
created: 2025-11-18
external:
  github:
    issue: 619
    url: https://github.com/anton-abyzov/specweave/issues/619
---

# US-003: Hooks Read Correct Increment Status

**Epic**: FS-043
**Priority**: P1
**Status**: Planning
**Story Points**: 5

---

## User Story

**As a** developer using GitHub/JIRA/ADO sync
**I want** hooks to read the latest increment status from spec.md
**So that** external tools stay in sync with SpecWeave state

---

## Acceptance Criteria

- [ ] **AC-US3-01**: Status line hook (`update-status-line.sh`) reads spec.md and finds correct status
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (integration test: call hook → verify reads updated spec.md)

- [ ] **AC-US3-02**: Living docs sync hooks read spec.md frontmatter and get correct status
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (mock sync hook → verify reads spec.md not metadata.json)

- [ ] **AC-US3-03**: GitHub sync reads completed status from spec.md and closes GitHub issue
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (E2E test: close increment → verify GitHub issue closed)

---

## Example Scenario

No specific example scenario provided in spec - hook contract shown in implementation notes.

---

## Implementation Notes

Hook Contract:

```bash
# Status line hook (plugins/specweave/hooks/lib/update-status-line.sh:50)
status=$(grep -m1 "^status:" "$spec_file" 2>/dev/null | cut -d: -f2 | tr -d ' ')

# Expected behavior:
# - spec.md has "status: completed" → hook finds "completed"
# - Cache excludes completed increments
# - Status line shows next active increment
```

---

## Tasks

- [ ] **T-013**: Test Status Line Hook Reads Updated spec.md
- [ ] **T-023**: Manual Testing Checklist Execution
