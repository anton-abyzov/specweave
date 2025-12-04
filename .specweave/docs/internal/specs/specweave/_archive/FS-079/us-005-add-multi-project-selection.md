---
id: US-005
feature: FS-079
title: "Add Multi-Project Selection"
status: completed
priority: P0
created: 2025-11-29
---

# US-005: Add Multi-Project Selection

**Feature**: [FS-079](./FEATURE.md)

**As a** enterprise developer
**I want** to select multiple ADO projects during init
**So that** I can manage all my projects from one SpecWeave instance

---

## Acceptance Criteria

- [x] **AC-US5-01**: After org input, fetch all projects user has access to
- [x] **AC-US5-02**: Show multi-select checkbox for projects (default: first project selected)
- [x] **AC-US5-03**: For each project, prompt for area path selection
- [x] **AC-US5-04**: Store multiple projects in config.json `sync.profiles`
- [x] **AC-US5-05**: Create folder structure for each project

---

## Implementation

**Increment**: [0079-ado-init-flow-v2](../../../../../../increments/_archive/0079-ado-init-flow-v2/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-006**: Add Multi-Project Selection
