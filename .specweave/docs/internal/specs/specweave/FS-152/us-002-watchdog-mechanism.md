---
id: US-002
feature: FS-152
title: "Watchdog Mechanism"
status: completed
priority: critical
created: 2026-01-02
project: specweave
---

# US-002: Watchdog Mechanism

**Feature**: [FS-152](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US2-01**: Heartbeat file updated every 30 seconds during active work
- [x] **AC-US2-02**: Watchdog detects sessions with no heartbeat for >5 minutes
- [x] **AC-US2-03**: Watchdog logs warning and can trigger recovery
- [x] **AC-US2-04**: Session registry tracks heartbeat timestamps

---

## Implementation

**Increment**: [0152-auto-mode-reliability-improvements](../../../../increments/0152-auto-mode-reliability-improvements/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-007**: Implement Heartbeat Mechanism
- [x] **T-008**: Implement Watchdog Detection
- [x] **T-017**: Update Documentation
