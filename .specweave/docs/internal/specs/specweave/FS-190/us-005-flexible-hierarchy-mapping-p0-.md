---
id: US-005
feature: FS-190
title: "Flexible Hierarchy Mapping (P0)"
status: completed
priority: P0
created: "2026-02-06T00:00:00.000Z"
tldr: "**As a** SpecWeave user integrating with diverse JIRA/ADO setups
**I want** the hierarchy to auto-detect and adapt to the external tool's structure
**So that** flat-task teams, standard Scrum teams, and SAFe orgs can all sync correctly."
project: specweave
---

# US-005: Flexible Hierarchy Mapping (P0)

**Feature**: [FS-190](./FEATURE.md)

**As a** SpecWeave user integrating with diverse JIRA/ADO setups
**I want** the hierarchy to auto-detect and adapt to the external tool's structure
**So that** flat-task teams, standard Scrum teams, and SAFe orgs can all sync correctly

---

## Acceptance Criteria

- [x] **AC-US5-01**: Given a JIRA project using only Tasks (no Epic/Story), when syncing, then each Task maps to a SpecWeave User Story
- [x] **AC-US5-02**: Given a flat JIRA Task mapped to a User Story, when AC extraction runs, then acceptance criteria are auto-extracted from the task description bullet points/checklists
- [x] **AC-US5-03**: Given a standard JIRA project (Epic/Story/Sub-task), when syncing, then Epic maps to Feature, Story maps to US, Sub-task maps to Task
- [x] **AC-US5-04**: Given a SAFe JIRA project (Initiative/Epic/Feature/Story), when syncing, then the hierarchy mapping config supports 5-level depth with configurable level types
- [x] **AC-US5-05**: Given the setup wizard, when configuring hierarchy, then auto-detection scans the project's work item types and proposes a mapping for user confirmation

---

## Implementation

**Increment**: [0190-sync-architecture-redesign](../../../../increments/0190-sync-architecture-redesign/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
