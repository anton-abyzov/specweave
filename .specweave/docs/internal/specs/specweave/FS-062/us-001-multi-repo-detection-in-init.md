---
id: US-001
feature: FS-062
title: "Multi-Project Detection"
status: completed
priority: P1
created: 2025-11-26
---

# US-001: Multi-Project Detection

**Feature**: [FS-062](./FEATURE.md)

**As a** developer working with multiple projects (FE/BE/Shared)
**I want** SpecWeave to automatically detect my multi-project setup
**So that** generated specs use project-scoped user story IDs

---

## Acceptance Criteria

- [x] **AC-US1-01**: Detect `umbrella.enabled` with 2+ `childRepos`
- [x] **AC-US1-02**: Detect `multiProject.enabled` with 2+ projects
- [x] **AC-US1-03**: Detect sync profiles with board/area path mapping
- [x] **AC-US1-04**: Detect multiple folders in specs/ directory
- [x] **AC-US1-05**: Single project (like SpecWeave) returns `isMultiProject: false`

---

## Implementation

**Increment**: [0062-multi-project-spec-generation](../../../../increments/0062-multi-project-spec-generation/spec.md)

**Tasks**: See increment tasks.md for implementation details.
