---
id: US-002
feature: FS-128
title: Coordinated Daemon Startup Prevention
status: not_started
priority: P1
created: 2025-12-09
project: specweave
external:
  github:
    issue: 811
    url: https://github.com/anton-abyzov/specweave/issues/811
---

# US-002: Coordinated Daemon Startup Prevention

**Feature**: [FS-128](./FEATURE.md)

**As a** SpecWeave developer
**I want** only ONE session-watchdog daemon to run per project
**So that** multiple daemons don't conflict or waste resources

---

## Acceptance Criteria

- [ ] **AC-US2-01**: Watchdog checks session registry before starting daemon mode
- [ ] **AC-US2-02**: If active watchdog exists (heartbeat <30s), new watchdog exits gracefully
- [ ] **AC-US2-03**: If stale watchdog detected (no heartbeat >30s), new watchdog takes over and kills stale process
- [ ] **AC-US2-04**: Watchdog registers itself in session registry with type: "watchdog"
- [ ] **AC-US2-05**: Watchdog updates heartbeat every 5 seconds
- [ ] **AC-US2-06**: Single-check mode (no --daemon) always runs without coordination

---

## Implementation

**Increment**: [0128-process-lifecycle-zombie-prevention](../../../../increments/0128-process-lifecycle-zombie-prevention/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-005**: Enhance Watchdog with Coordination Logic
- [ ] **T-018**: E2E Test - Multiple Concurrent Sessions
