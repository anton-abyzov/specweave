---
id: US-003
feature: FS-062
title: "Project-Scoped User Stories"
status: in_progress
priority: P1
created: 2025-11-25
---

# US-003: Project-Scoped User Stories

**Feature**: [FS-062](./FEATURE.md)

**As a** PM agent
**I want** to generate user stories with project prefixes
**So that** user stories are routed to the correct repo

---

## Acceptance Criteria

- [x] **AC-US3-01**: PM agent detects multi-repo context from user prompt
- [x] **AC-US3-02**: Generates prefixed IDs: `US-FE-001`, `US-BE-001`, `US-SHARED-001`
- [x] **AC-US3-03**: Maps user story to correct repo based on keywords (UI → FE, API → BE)
- [ ] **AC-US3-04**: Cross-cutting concerns tagged with multiple projects

---

## Implementation

**Increment**: [0062-umbrella-multi-repo-support](../../../../../../increments/_archive/0062-umbrella-multi-repo-support/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: Enhance PM agent for project-scoped stories
