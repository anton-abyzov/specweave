---
id: US-001
feature: FS-119
title: Project Context Injection Before Planning (P1)
status: completed
priority: P1
created: 2025-12-07
project: specweave
external:
  github:
    issue: 847
    url: https://github.com/anton-abyzov/specweave/issues/847
---

# US-001: Project Context Injection Before Planning (P1)

**Feature**: [FS-119](./FEATURE.md)

**As a** user who ran `specweave init` with multi-project setup
**I want** the increment planner to automatically detect my configured projects
**So that** I don't have to manually specify which project each increment targets

---

## Acceptance Criteria

- [x] **AC-US1-01**: When `/specweave:increment` runs, it MUST call `detectStructureLevel()` first
- [x] **AC-US1-02**: Detected projects MUST be presented to user if multiple exist
- [x] **AC-US1-03**: For 2-level structures, boards MUST be detected and presented
- [x] **AC-US1-04**: Single project/board MUST be auto-selected silently
- [x] **AC-US1-05**: Selected project/board MUST be injected into spec.md template

---

## Implementation

**Increment**: [0119-project-board-context-enforcement](../../../../increments/0119-project-board-context-enforcement/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-006**: Update increment-planner SKILL.md with MANDATORY detection 🧠
- [x] **T-007**: Update spec templates with validation markers ⚡
