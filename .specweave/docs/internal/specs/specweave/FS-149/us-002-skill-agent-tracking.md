---
id: US-002
feature: FS-149
title: Skill & Agent Tracking
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 964
    url: https://github.com/anton-abyzov/specweave/issues/964
---

# US-002: Skill & Agent Tracking

**Feature**: [FS-149](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US2-01**: Track skill activations via Skill tool invocations
- [x] **AC-US2-02**: Track agent spawns via Task tool with subagent_type
- [x] **AC-US2-03**: Record plugin source for each skill/agent
- [x] **AC-US2-04**: Aggregate usage counts per skill and agent

---

## Implementation

**Increment**: [0149-usage-analytics](../../../../increments/0149-usage-analytics/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create Analytics Event Types and Interfaces
- [x] **T-002**: Implement AnalyticsCollector Class
- [x] **T-007**: Instrument Skill Invocations
- [x] **T-008**: Write Unit Tests
