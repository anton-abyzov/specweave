---
id: US-001
feature: FS-149
title: Command Usage Tracking
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 963
    url: https://github.com/anton-abyzov/specweave/issues/963
---

# US-001: Command Usage Tracking

**Feature**: [FS-149](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US1-01**: Track every `/sw:*` command invocation with timestamp
- [x] **AC-US1-02**: Record command name, arguments (sanitized), and increment context
- [x] **AC-US1-03**: Store success/failure status for each invocation
- [x] **AC-US1-04**: Calculate execution duration for each command

---

## Implementation

**Increment**: [0149-usage-analytics](../../../../increments/0149-usage-analytics/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create Analytics Event Types and Interfaces
- [x] **T-002**: Implement AnalyticsCollector Class
- [x] **T-008**: Write Unit Tests
