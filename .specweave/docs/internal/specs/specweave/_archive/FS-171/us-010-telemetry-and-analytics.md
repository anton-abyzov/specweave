---
id: US-010
feature: FS-171
title: "Telemetry and Analytics"
status: completed
priority: high
created: 2026-01-18
project: specweave
---

# US-010: Telemetry and Analytics

**Feature**: [FS-171](./FEATURE.md)

**As a** SpecWeave maintainer,
**I want** to track lazy loading effectiveness,
**So that** I can measure and improve token savings.

---

## Acceptance Criteria

- [x] **AC-US10-01**: Track: loads triggered, tokens saved, detection latency
- [x] **AC-US10-02**: Analytics stored locally (privacy-preserving)
- [x] **AC-US10-03**: `specweave analytics --lazy-loading` shows stats
- [x] **AC-US10-05**: Analytics respect existing analytics config settings

---

## Implementation

**Increment**: [0171-lazy-plugin-loading](../../../../increments/0171-lazy-plugin-loading/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-040**: Implement Analytics Tracking
