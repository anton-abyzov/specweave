---
id: US-003
feature: FS-062
title: Project-Scoped User Stories
status: not_started
priority: P1
created: 2025-11-25
external_tools:
  github:
    number: 758
    url: https://github.com/anton-abyzov/specweave/issues/758
    created_at: 2025-11-25T08:14:31.391Z
---

# US-003: Project-Scoped User Stories

**Feature**: [FS-062](../../_features/FS-062/FEATURE.md)

**As a** PM agent
**I want** to generate user stories with project prefixes
**So that** user stories are routed to the correct repo

---

## Acceptance Criteria

- [ ] **AC-US3-01**: PM agent detects multi-repo context from user prompt
- [ ] **AC-US3-02**: Generates prefixed IDs: `US-FE-001`, `US-BE-001`, `US-SHARED-001`
- [ ] **AC-US3-03**: Maps user story to correct repo based on keywords (UI → FE, API → BE)
- [ ] **AC-US3-04**: Cross-cutting concerns tagged with multiple projects

---

## Implementation

**Increment**: [0062-umbrella-multi-repo-support](../../../../increments/0062-umbrella-multi-repo-support/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
