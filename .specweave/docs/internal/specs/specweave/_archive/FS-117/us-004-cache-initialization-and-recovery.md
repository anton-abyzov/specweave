---
id: US-004
feature: FS-117
title: Cache Initialization and Recovery
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 845
    url: https://github.com/anton-abyzov/specweave/issues/845
---

# US-004: Cache Initialization and Recovery

**Feature**: [FS-117](./FEATURE.md)

**As a** SpecWeave user
**I want** cache to self-heal
**So that** I never have stale or missing data

---

## Acceptance Criteria

- [x] **AC-US4-01**: Session start hook rebuilds cache if missing
- [x] **AC-US4-02**: Cache validates version and rebuilds if schema changed
- [x] **AC-US4-03**: Manual rebuild command: `specweave cache --rebuild`
- [x] **AC-US4-04**: Cache age shown in status output (debug mode)

---

## Implementation

**Increment**: [0117-instant-dashboard-cache](../../../../increments/0117-instant-dashboard-cache/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Add Cache Lifecycle Management
