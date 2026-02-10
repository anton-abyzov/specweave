---
id: US-003
feature: FS-149
title: Analytics Dashboard Command
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 965
    url: https://github.com/anton-abyzov/specweave/issues/965
---

# US-003: Analytics Dashboard Command

**Feature**: [FS-149](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US3-01**: Show top 10 commands by usage count
- [x] **AC-US3-02**: Show top 10 skills by activation count
- [x] **AC-US3-03**: Show top 10 agents by spawn count
- [x] **AC-US3-04**: Display usage timeline (last 7/30 days)
- [x] **AC-US3-05**: Support `--export json` and `--export csv` flags
- [x] **AC-US3-06**: Support `--since` date filter

---

## Implementation

**Increment**: [0149-usage-analytics](../../../../increments/0149-usage-analytics/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: Implement Analytics Aggregation
- [x] **T-004**: Create /sw:analytics Command
- [x] **T-005**: Implement Export Functionality
- [x] **T-008**: Write Unit Tests
