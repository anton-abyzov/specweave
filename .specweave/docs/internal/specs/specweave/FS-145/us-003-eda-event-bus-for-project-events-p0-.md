---
id: US-003
feature: FS-145
title: EDA Event Bus for Project Events (P0)
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 932
    url: https://github.com/anton-abyzov/specweave/issues/932
---

# US-003: EDA Event Bus for Project Events (P0)

**Feature**: [FS-145](./FEATURE.md)

**As a** SpecWeave developer
**I want** an event bus for project-related events
**So that** handlers can react to project changes asynchronously

---

## Acceptance Criteria

- [x] **AC-US3-01**: Create `ProjectEventBus` class in `src/core/project/project-event-bus.ts`
- [x] **AC-US3-02**: Support event types: `ProjectCreated`, `ProjectUpdated`, `ProjectDeleted`, `ProjectSyncRequested`
- [x] **AC-US3-03**: Support `on(eventType, handler)` for registering handlers
- [x] **AC-US3-04**: Support `emit(eventType, payload)` for triggering events
- [x] **AC-US3-05**: Handlers execute asynchronously (non-blocking)
- [x] **AC-US3-06**: Error handling: log errors but don't block other handlers

---

## Implementation

**Increment**: [0145-project-registry-eda-sync](../../../../increments/0145-project-registry-eda-sync/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Implement ProjectEventBus
- [x] **T-005**: Connect Registry to Event Bus
- [x] **T-008**: Unit Tests for Event Bus
