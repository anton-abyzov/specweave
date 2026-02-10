---
id: US-004
feature: FS-149
title: Analytics Storage
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 966
    url: https://github.com/anton-abyzov/specweave/issues/966
---

# US-004: Analytics Storage

**Feature**: [FS-149](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US4-01**: Store events in `.specweave/state/analytics/events.jsonl`
- [x] **AC-US4-02**: Implement daily rollup to `daily-summary.json`
- [x] **AC-US4-03**: Auto-rotate events.jsonl when > 10MB (keep last 30 days)
- [x] **AC-US4-04**: Cache aggregated stats for fast dashboard rendering

---

## Implementation

**Increment**: [0149-usage-analytics](../../../../increments/0149-usage-analytics/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Implement AnalyticsCollector Class
- [x] **T-003**: Implement Analytics Aggregation
- [x] **T-006**: Add Log Rotation
- [x] **T-008**: Write Unit Tests
