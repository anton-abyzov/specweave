---
id: US-007
feature: FS-170
title: "Agent State Management"
status: completed
priority: P0
created: 2026-01-20
project: specweave-dev
---

# US-007: Agent State Management

**Feature**: [FS-170](./FEATURE.md)

**As a** system,
**I want** to track parallel agent states,
**So that** the orchestrator coordinates work correctly.

---

## Acceptance Criteria

- [x] **AC-US7-01**: Agent state stored in `.specweave/state/parallel/agents/{id}.json`
- [x] **AC-US7-02**: State includes: id, domain, status, tasks, progress, errors
- [x] **AC-US7-03**: Session state in `.specweave/state/parallel/session.json`
- [x] **AC-US7-04**: Heartbeat mechanism detects zombie agents (>5 min stale)
- [x] **AC-US7-05**: State persisted on crash for recovery
- [x] **AC-US7-06**: Test coverage for state manager ≥90%

---

## Implementation

**Increment**: [0170-parallel-auto-mode](../../../../increments/0170-parallel-auto-mode/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Extend Auto Types with Parallel Definitions
- [x] **T-004**: Create Parallel Types Tests
- [x] **T-007**: Create State Manager
- [x] **T-008**: Create State Manager Tests (90%+ coverage)
