---
id: US-002
feature: FS-124
title: Ensure JIRA Board Detection Works for 2-Level (P1)
status: completed
priority: P1
created: 2025-12-08
project: specweave
external:
  github:
    issue: 867
    url: https://github.com/anton-abyzov/specweave/issues/867
---

# US-002: Ensure JIRA Board Detection Works for 2-Level (P1)

**Feature**: [FS-124](./FEATURE.md)

**As a** user with JIRA board configuration
**I want** the structure-level-detector to correctly identify 2-level structure for JIRA
**So that** the spec-project-validator enforces both project AND board fields

---

## Acceptance Criteria

- [x] **AC-US2-01**: JIRA with multiple boards per project detects as 2-level
- [x] **AC-US2-02**: JIRA with single board per project detects as 1-level (fallback)
- [x] **AC-US2-03**: JIRA boardMapping.boards array properly maps to boardsByProject

---

## Implementation

**Increment**: [0124-spec-project-validator-regex-fix](../../../../increments/0124-spec-project-validator-regex-fix/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: Verify JIRA 2-level detection logic
