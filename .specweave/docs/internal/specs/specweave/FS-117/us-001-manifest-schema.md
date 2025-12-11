---
id: US-001
feature: FS-117
title: Cache Infrastructure
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 842
    url: https://github.com/anton-abyzov/specweave/issues/842
---

# US-001: Cache Infrastructure

**Feature**: [FS-117](./FEATURE.md)

**As a** SpecWeave developer
**I want** a pre-computed dashboard cache
**So that** status commands have O(1) read complexity

---

## Acceptance Criteria

- [x] **AC-US1-01**: `dashboard.json` schema defined with version field for migrations
- [x] **AC-US1-02**: Cache includes increments, summary, jobs, and costs sections
- [x] **AC-US1-03**: Atomic writes prevent corruption (write to temp, rename)
- [x] **AC-US1-04**: Cache rebuilds automatically if missing or corrupted

---

## Implementation

**Increment**: [0117-instant-dashboard-cache](../../../../increments/0117-instant-dashboard-cache/spec.md)

**Tasks**: See increment tasks.md for implementation details.
