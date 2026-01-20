---
id: US-010
feature: FS-170
title: "Stop Hook Parallel Awareness"
status: completed
priority: P0
created: 2026-01-20
project: specweave-dev
---

# US-010: Stop Hook Parallel Awareness

**Feature**: [FS-170](./FEATURE.md)

**As a** system,
**I want** the stop hook to check all parallel agents,
**So that** auto mode doesn't exit prematurely.

---

## Acceptance Criteria

- [x] **AC-US10-01**: Stop hook detects parallel session
- [x] **AC-US10-02**: Counts pending agents (not just increments)
- [x] **AC-US10-03**: Blocks exit if any agent still running
- [x] **AC-US10-04**: Shows agent status in block message
- [x] **AC-US10-05**: Approves exit only when all agents completed/failed

---

## Implementation

**Increment**: [0170-parallel-auto-mode](../../../../increments/0170-parallel-auto-mode/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-013**: Create Parallel Orchestrator
- [x] **T-021**: Update Stop Hook for Parallel Awareness
