---
id: US-003
feature: FS-058
title: "Safety Guards Against Crashes (P0)"
status: completed
priority: P0
created: 2025-11-24T00:00:00.000Z
---

# US-003: Safety Guards Against Crashes (P0)

**Feature**: [FS-058](./FEATURE.md)

**As a** : Developer
**I want** : Sync failures to be isolated and not crash Claude Code
**So that** : Status updates always succeed even if GitHub is down

---

## Acceptance Criteria

- [x] **AC-US3-01**: Sync runs in try-catch with error logging
- [x] **AC-US3-02**: Circuit breaker opens after 3 consecutive failures
- [x] **AC-US3-03**: Circuit breaker auto-resets after 5 minutes
- [x] **AC-US3-04**: Status update always succeeds even if sync fails
- [x] **AC-US3-05**: User sees clear error message if sync fails
- [x] **AC-US3-06**: Fallback: User can manually run `/specweave:sync-progress`

---

## Implementation

**Increment**: [0058-fix-status-sync-and-auto-github-update](../../../../../../increments/_archive/0058-fix-status-sync-and-auto-github-update/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Create SyncCircuitBreaker class
- [x] **T-007**: Add error handling and logging
- [x] **T-008**: Add diagnostics command
- [x] **T-009**: Unit tests for circuit breaker
- [x] **T-012**: Crash resistance test
