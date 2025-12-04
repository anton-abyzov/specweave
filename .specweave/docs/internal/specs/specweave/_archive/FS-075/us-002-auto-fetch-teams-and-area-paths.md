---
id: US-002
feature: FS-075
title: "Auto-Fetch Teams and Area Paths"
status: completed
priority: P1
created: 2025-12-02
---

# US-002: Auto-Fetch Teams and Area Paths

**Feature**: [FS-075](./FEATURE.md)

**As a** developer
**I want** SpecWeave to fetch my ADO teams and area paths automatically
**So that** I don't have to manually type team names

---

## Acceptance Criteria

- [x] **AC-US2-01**: After PAT validation, fetch teams using `fetchTeamsForProject()`
- [x] **AC-US2-02**: Fetch area paths using `fetchAreaPathsForProject()`
- [x] **AC-US2-03**: Display fetched teams/areas in multi-select prompt
- [x] **AC-US2-04**: Allow selecting multiple area paths (primary use case)
- [x] **AC-US2-05**: Fallback to manual input if API fails

---

## Implementation

**Increment**: [0075-smart-ado-init](../../../../../../increments/_archive/0075-smart-ado-init/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: Add auto-fetch teams after PAT validation
- [x] **T-004**: Add auto-fetch area paths after PAT validation
- [x] **T-005**: Add multi-select prompt for area paths
- [x] **T-006**: Add multi-select prompt for teams
- [x] **T-010**: Add fallback to manual input if API fails
