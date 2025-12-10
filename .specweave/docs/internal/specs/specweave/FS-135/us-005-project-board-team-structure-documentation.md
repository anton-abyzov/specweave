---
id: US-005
feature: FS-135
title: Project/Board/Team Structure Documentation
status: completed
priority: P1
created: 2025-12-09
project: specweave
external:
  github:
    issue: 880
    url: https://github.com/anton-abyzov/specweave/issues/880
---

# US-005: Project/Board/Team Structure Documentation

**Feature**: [FS-135](./FEATURE.md)

**As a** project manager
**I want** automatic documentation of team structure and ownership
**So that** new team members understand who owns what

---

## Acceptance Criteria

- [x] **AC-US5-01**: System extracts projects from config.json (multiProject.projects)
- [x] **AC-US5-02**: System extracts boards/teams from:
- [x] **AC-US5-03**: System maps modules to projects/boards based on:
- [x] **AC-US5-04**: System generates team ownership document: `.specweave/docs/internal/team-structure.md`
- [x] **AC-US5-05**: Document includes: team name, owned modules, tech stack, contact info (from config)
- [x] **AC-US5-06**: System generates organization chart (Mermaid diagram)
- [x] **AC-US5-01**: System extracts projects from config.json
- [x] **AC-US5-02**: System extracts boards/teams from ADO/JIRA/umbrella
- [x] **AC-US5-03**: System maps modules to projects/boards
- [x] **AC-US5-04**: System generates team ownership document
- [x] **AC-US5-05**: Document includes team details
- [x] **AC-US5-06**: System generates organization chart

---

## Implementation

**Increment**: [0135-living-docs-visualization](../../../../increments/0135-living-docs-visualization/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-021**: Document Project/Board/Team Structure
