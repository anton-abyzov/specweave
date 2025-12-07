---
id: US-001
feature: FS-114
title: Script Infrastructure
status: completed
priority: P1
created: 2025-12-06
external:
  github:
    issue: 780
    url: "https://github.com/anton-abyzov/specweave/issues/780"
---

**Origin**: 🏠 **Internal**


# US-001: Script Infrastructure

**Feature**: [FS-114](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US1-01**: `plugins/specweave/scripts/` folder exists
- [ ] **AC-US1-02**: Scripts receive command arguments via process.argv
- [ ] **AC-US1-03**: Scripts have access to cwd (project path)

---

## Implementation

**Increment**: [0114-slash-command-script-delegation](../../../../increments/0114-slash-command-script-delegation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-001](../../../../increments/0114-slash-command-script-delegation/tasks.md#T-001): Create scripts folder and jobs.js