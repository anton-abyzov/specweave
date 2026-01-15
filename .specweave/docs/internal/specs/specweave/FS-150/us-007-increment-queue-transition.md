---
id: US-007
feature: FS-150
title: "Increment Queue Transition"
status: not_started
priority: P0
created: 2025-12-30
project: specweave
---

# US-007: Increment Queue Transition

**Feature**: [FS-150](./FEATURE.md)

**As a** developer with multiple increments queued
**I want** auto mode to transition smoothly between increments
**So that** I can queue 3-5 increments and let them complete overnight

---

## Acceptance Criteria

- [ ] **AC-US7-01**: When current increment completes, auto moves to next in queue
- [ ] **AC-US7-02**: Session state tracks completed/failed increments
- [ ] **AC-US7-03**: Transition includes summary of completed increment
- [ ] **AC-US7-04**: Failed increment doesn't block queue (skip with error log)

---

## Implementation

**Increment**: [0150-auto-mode-world-class-testing](../../../../increments/0150-auto-mode-world-class-testing/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-020**: Implement increment completion transition
- [x] **T-021**: Add transition summary to stop hook
- [x] **T-022**: Handle failed increment without blocking queue
