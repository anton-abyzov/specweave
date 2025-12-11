---
id: US-005
feature: FS-117
title: Additional Instant Commands
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 846
    url: https://github.com/anton-abyzov/specweave/issues/846
---

# US-005: Additional Instant Commands

**Feature**: [FS-117](./FEATURE.md)

**As a** SpecWeave user
**I want** more commands to be instant
**So that** my workflow is consistently fast

---

## Acceptance Criteria

- [x] **AC-US5-01**: `/specweave:workflow` reads from cache (current phase, suggestions)
- [x] **AC-US5-02**: `/specweave:costs` reads from cache (token/cost tracking)
- [x] **AC-US5-03**: Cache includes enough data for workflow suggestions

---

## Implementation

**Increment**: [0117-instant-dashboard-cache](../../../../increments/0117-instant-dashboard-cache/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-006**: Add Instant Workflow and Costs Commands
