---
id: US-003
feature: FS-117
title: Read Path - Pure Bash Readers
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 844
    url: https://github.com/anton-abyzov/specweave/issues/844
---

# US-003: Read Path - Pure Bash Readers

**Feature**: [FS-117](./FEATURE.md)

**As a** SpecWeave user
**I want** status commands to respond in <10ms
**So that** they feel instant like native CLI tools

---

## Acceptance Criteria

- [x] **AC-US3-01**: `/specweave:progress` reads from cache with pure bash + jq
- [x] **AC-US3-02**: `/specweave:status` reads from cache with pure bash + jq
- [x] **AC-US3-03**: `/specweave:jobs` reads from cache with pure bash + jq
- [x] **AC-US3-04**: No Node.js process spawned for any read operation
- [x] **AC-US3-05**: Graceful fallback to Node scripts if jq unavailable

---

## Implementation

**Increment**: [0117-instant-dashboard-cache](../../../../increments/0117-instant-dashboard-cache/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: Create Pure Bash Readers for Progress/Status/Jobs
- [x] **T-004**: Wire Hooks to Use Cache (Read + Write Paths)
