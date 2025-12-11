---
id: US-004
feature: FS-123
title: Project/Board-Based Team Organization
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 865
    url: https://github.com/anton-abyzov/specweave/issues/865
---

# US-004: Project/Board-Based Team Organization

**Feature**: [FS-123](./FEATURE.md)

**As a** tech lead in an enterprise with ADO/JIRA
**I want** organization folder to mirror the specs project/board structure
**So that** teams are organized by the same structure as our specs, not just by repo prefix

---

## Acceptance Criteria

- [x] **AC-US4-01**: Organization folder structure matches detected structure level (1-level or 2-level)
- [x] **AC-US4-02**: 1-level: `organization/teams/{project}/` with teams grouped by project
- [x] **AC-US4-03**: 2-level: `organization/teams/{project}/{board}/` mirroring specs structure
- [x] **AC-US4-04**: ADO teams are fetched via `getTeams()` API when ADO sync is configured
- [x] **AC-US4-05**: JIRA teams are fetched via Teams API when JIRA sync is configured (if available)
- [x] **AC-US4-06**: Team docs include external tool link (ADO team URL, JIRA team URL)
- [x] **AC-US4-07**: Fallback to LLM-based repo clustering when no external teams available

---

## Implementation

**Increment**: [0123-intelligent-living-docs-content](../../../../increments/0123-intelligent-living-docs-content/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-008**: Add Structure-Level-Aware Team Organization
- [x] **T-009**: Integrate External Team Sources (ADO/JIRA)
