---
id: US-007
feature: FS-135
title: Generic Algorithm for Any SpecWeave Project
status: completed
priority: P1
created: 2025-12-09
project: specweave
external:
  github:
    issue: 882
    url: https://github.com/anton-abyzov/specweave/issues/882
---

# US-007: Generic Algorithm for Any SpecWeave Project

**Feature**: [FS-135](./FEATURE.md)

**As a** SpecWeave framework developer
**I want** the living docs engine to work on any user project
**So that** users get intelligent docs without custom configuration

---

## Acceptance Criteria

- [x] **AC-US7-04**: System handles projects without existing ADRs (synthesizes from code)
- [x] **AC-US7-05**: System handles projects with existing ADRs (merges discoveries)
- [x] **AC-US7-06**: System works in CI/CD environments (non-interactive mode)
- [x] **AC-US7-04**: System handles projects without existing ADRs
- [x] **AC-US7-05**: System handles projects with existing ADRs
- [x] **AC-US7-06**: System works in CI/CD environments

---

## Implementation

**Increment**: [0135-living-docs-visualization](../../../../increments/0135-living-docs-visualization/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-022**: Create CLI Command `/specweave:living-docs update`
- [x] **T-025**: Implement Error Handling & Graceful Degradation
